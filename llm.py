"""
llm.py — Groq LLM Client
==========================
Groq API client with:
  • Model routing  — fast (8B) vs smart (70B) selection per agent
  • Prompt caching — SHA-256 keyed in-memory + optional disk cache
  • Output validation & repair — JSON extraction, schema checks, retries
  • Rate-limit handling — exponential backoff with jitter
  • Structured logging — every call is logged for P3 (dashboard) and P4 (eval)

Dependencies
------------
  groq>=0.28.0
  tenacity>=8.2.0
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import random
import re
import time
from pathlib import Path
from typing import Any

from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
    before_sleep_log,
)

# ---------------------------------------------------------------------------
# Logger
# ---------------------------------------------------------------------------
logger = logging.getLogger("bug_resolver.llm")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

# ---------------------------------------------------------------------------
# Model aliases
# ---------------------------------------------------------------------------
# "fast"  → small model — used for Triage and Verifier (structured parse)
# "smart" → large model — used for Reproducer and Fixer (complex reasoning)

MODEL_FAST  = os.environ.get("MODEL_FAST",  "openai/gpt-oss-20b")
MODEL_SMART = os.environ.get("MODEL_SMART", "openai/gpt-oss-120b")

# Per-agent routing table — override with env var AGENT_MODEL_<AGENT> if needed
_AGENT_MODEL_MAP: dict[str, str] = {
    "triage":     MODEL_FAST,
    "reproducer": MODEL_SMART,
    "fixer":      MODEL_SMART,
    "verifier":   MODEL_FAST,
}

# ---------------------------------------------------------------------------
# Generation config defaults
# ---------------------------------------------------------------------------
_FAST_MAX_TOKENS  = 4096
_SMART_MAX_TOKENS = 8192
_FAST_TEMPERATURE  = 0.2
_SMART_TEMPERATURE = 0.3

# ---------------------------------------------------------------------------
# Prompt cache (in-memory, survives within a single pipeline run)
# ---------------------------------------------------------------------------

class _PromptCache:
    """Simple SHA-256 keyed prompt→response cache."""

    def __init__(self, disk_dir: Path | None = None):
        self._mem: dict[str, dict[str, Any]] = {}
        self._disk_dir = disk_dir
        if disk_dir:
            disk_dir.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def _key(model: str, system: str, user: str) -> str:
        raw = f"{model}||{system}||{user}"
        return hashlib.sha256(raw.encode()).hexdigest()

    def get(self, model: str, system: str, user: str) -> dict[str, Any] | None:
        k = self._key(model, system, user)
        # Check memory first
        if k in self._mem:
            logger.debug("Cache HIT (memory): %s", k[:12])
            return self._mem[k]
        # Then disk
        if self._disk_dir:
            path = self._disk_dir / f"{k}.json"
            if path.exists():
                logger.debug("Cache HIT (disk): %s", k[:12])
                data = json.loads(path.read_text(encoding="utf-8"))
                self._mem[k] = data
                return data
        return None

    def put(self, model: str, system: str, user: str, response: dict[str, Any]) -> None:
        k = self._key(model, system, user)
        self._mem[k] = response
        if self._disk_dir:
            path = self._disk_dir / f"{k}.json"
            path.write_text(json.dumps(response, indent=2), encoding="utf-8")
        logger.debug("Cache SET: %s", k[:12])


# Module-level cache instance (disk dir can be set via env var)
_CACHE_DIR_ENV = os.environ.get("LLM_CACHE_DIR")
cache = _PromptCache(disk_dir=Path(_CACHE_DIR_ENV) if _CACHE_DIR_ENV else None)

# ---------------------------------------------------------------------------
# Groq client — lazy initialisation (no crash on import)
# ---------------------------------------------------------------------------

_client = None


def _get_client():
    """Initialise and return the Groq client (lazy, singleton)."""
    global _client
    if _client is None:
        from groq import Groq
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise EnvironmentError(
                "GROQ_API_KEY environment variable is not set. "
                "Export it before running the pipeline."
            )
        _client = Groq(api_key=api_key)
    return _client


# ---------------------------------------------------------------------------
# JSON extraction helpers
# ---------------------------------------------------------------------------

_JSON_FENCE_RE = re.compile(r"```(?:json)?\s*([\s\S]*?)\s*```", re.IGNORECASE)


def _extract_json(raw: str) -> dict[str, Any]:
    """
    Extract and parse a JSON object from a raw LLM response string.

    Handles:
    - Bare JSON
    - JSON wrapped in markdown fences (```json ... ```)
    - Leading/trailing whitespace
    """
    raw = raw.strip()

    # Attempt 1: direct parse
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # Attempt 2: strip markdown fences
    match = _JSON_FENCE_RE.search(raw)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # Attempt 3: find the first '{' … last '}' substring
    start = raw.find("{")
    end   = raw.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(raw[start : end + 1])
        except json.JSONDecodeError:
            pass

    raise ValueError(
        f"Could not extract valid JSON from LLM response. "
        f"First 300 chars: {raw[:300]!r}"
    )


def _validate_keys(data: dict[str, Any], required_keys: list[str]) -> None:
    """Raise ValueError if any required key is missing from data."""
    missing = [k for k in required_keys if k not in data]
    if missing:
        raise ValueError(f"LLM response missing required keys: {missing}. Got: {list(data.keys())}")


# ---------------------------------------------------------------------------
# Required-key schemas per agent (used for validation)
# ---------------------------------------------------------------------------

_REQUIRED_KEYS: dict[str, list[str]] = {
    "triage":     ["summary", "affected_files", "affected_symbols",
                   "reproduction_hint", "confidence"],
    "reproducer": ["test_file_path", "test_function", "test_code",
                   "expected_failure_reason", "confidence"],
    "fixer":      ["patch", "files_changed", "explanation", "confidence"],
    "verifier":   ["reproduction_test_passed", "full_suite_passed",
                   "total_tests", "passed", "failed", "confidence"],
}

# ---------------------------------------------------------------------------
# Core call function (with retry on rate-limit / transient errors)
# ---------------------------------------------------------------------------

class _RateLimitError(Exception):
    """Raised when Groq returns a 429 / rate limit."""


@retry(
    retry=retry_if_exception_type(_RateLimitError),
    stop=stop_after_attempt(6),
    wait=wait_exponential(multiplier=1, min=4, max=60),
    before_sleep=before_sleep_log(logger, logging.WARNING),
)
def _call_groq(
    model_name: str,
    system_prompt: str,
    user_prompt: str,
    max_tokens: int,
    temperature: float,
) -> str:
    """
    Make a single Groq API call and return the raw text response.

    Raises _RateLimitError on 429 so tenacity can retry with backoff.
    """
    client = _get_client()

    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
        )
    except Exception as exc:
        err_str = str(exc).lower()
        if "429" in err_str or "rate" in err_str or "quota" in err_str or "limit" in err_str:
            jitter = random.uniform(0, 2)
            logger.warning("Rate limit hit, will retry after backoff (jitter=%.1fs)", jitter)
            time.sleep(jitter)
            raise _RateLimitError(str(exc)) from exc
        raise

    # Handle empty responses
    if not response.choices:
        raise ValueError("Groq returned no choices.")

    text = response.choices[0].message.content
    if not text:
        raise ValueError("Groq returned an empty response.")

    return text


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def call_agent(
    agent: str,
    system_prompt: str,
    user_prompt: str,
    *,
    use_cache: bool = True,
    force_model: str | None = None,
) -> dict[str, Any]:
    """
    Call the Groq model appropriate for `agent`, validate the JSON response,
    and return a parsed dictionary.

    Parameters
    ----------
    agent : str
        One of "triage", "reproducer", "fixer", "verifier".
    system_prompt : str
        The agent's system prompt (from prompts.py).
    user_prompt : str
        The user-turn prompt (from prompts.py builder functions).
    use_cache : bool
        Whether to check / write the prompt cache (default True).
    force_model : str | None
        Override model selection.

    Returns
    -------
    dict
        Parsed and validated JSON response from the model.
    """
    # Resolve model
    model_name = force_model or os.environ.get(
        f"AGENT_MODEL_{agent.upper()}",
        _AGENT_MODEL_MAP.get(agent, MODEL_FAST),
    )

    is_smart = model_name in (MODEL_SMART,) or "70b" in model_name or "120b" in model_name
    max_tokens  = _SMART_MAX_TOKENS if is_smart else _FAST_MAX_TOKENS
    temperature = _SMART_TEMPERATURE if is_smart else _FAST_TEMPERATURE

    # Cache check
    if use_cache:
        cached = cache.get(model_name, system_prompt, user_prompt)
        if cached is not None:
            return cached

    # Log call metadata
    logger.info(
        "LLM call | agent=%-10s | model=%-30s | prompt_chars=%d",
        agent, model_name, len(system_prompt) + len(user_prompt),
    )
    t0 = time.perf_counter()

    raw_text = _call_groq(model_name, system_prompt, user_prompt, max_tokens, temperature)

    elapsed = time.perf_counter() - t0
    logger.info("LLM done  | agent=%-10s | elapsed=%.2fs | response_chars=%d",
                agent, elapsed, len(raw_text))

    # Parse and validate
    data = _extract_json(raw_text)
    required = _REQUIRED_KEYS.get(agent, [])
    _validate_keys(data, required)

    # Store in cache
    if use_cache:
        cache.put(model_name, system_prompt, user_prompt, data)

    return data


def call_agent_with_repair(
    agent: str,
    system_prompt: str,
    user_prompt: str,
    *,
    max_repair_attempts: int = 2,
    use_cache: bool = True,
    force_model: str | None = None,
) -> dict[str, Any]:
    """
    Wrapper around `call_agent` that retries with a repair prompt when the
    model produces malformed / incomplete JSON.

    On each repair attempt, the original bad response is fed back so the model
    can correct its own output.
    """
    last_exc: Exception | None = None
    bad_response: str = ""

    for attempt in range(1, max_repair_attempts + 2):  # +1 for the initial try
        try:
            if attempt == 1:
                return call_agent(
                    agent, system_prompt, user_prompt,
                    use_cache=use_cache, force_model=force_model,
                )
            else:
                # Repair prompt: tell model what was wrong
                repair_user = (
                    f"{user_prompt}\n\n"
                    f"---\n"
                    f"YOUR PREVIOUS RESPONSE WAS INVALID (attempt {attempt - 1}):\n"
                    f"{bad_response[:800]}\n\n"
                    f"ERROR: {last_exc}\n\n"
                    f"Return ONLY the corrected JSON object matching the output contract."
                )
                logger.warning(
                    "Repair attempt %d/%d for agent '%s'",
                    attempt - 1, max_repair_attempts, agent,
                )
                return call_agent(
                    agent, system_prompt, repair_user,
                    use_cache=False,            # never cache repair prompts
                    force_model=force_model or MODEL_SMART,  # escalate to smart
                )
        except (ValueError, KeyError) as exc:
            last_exc = exc
            bad_response = str(exc)
            logger.error(
                "Agent '%s' output validation failed (attempt %d): %s",
                agent, attempt, exc,
            )

    raise ValueError(
        f"Agent '{agent}' failed to produce valid JSON after "
        f"{max_repair_attempts + 1} attempts. Last error: {last_exc}"
    )


# ---------------------------------------------------------------------------
# Utility: estimate token cost (rough approximation for logging)
# ---------------------------------------------------------------------------

_CHARS_PER_TOKEN = 4  # rough average for English/code


def estimate_tokens(text: str) -> int:
    """Return a rough token count estimate for budget tracking."""
    return max(1, len(text) // _CHARS_PER_TOKEN)

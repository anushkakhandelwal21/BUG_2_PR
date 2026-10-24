"""
graph.py — P1: Agent Brain
===========================
Multi-agent orchestrator built with LangGraph.

Pipeline stages (nodes)
-----------------------
  START → triage → reproducer → fixer → verifier → (retry fixer | END)

Shared state
------------
  AgentState (TypedDict) — single source of truth flowing through all nodes.

Retry logic
-----------
  After verifier: if tests fail AND retry_count < MAX_RETRIES, loop back to
  fixer with accumulated failure context.  After MAX_RETRIES, the pipeline
  ends with status "FAILED" so the caller can surface a partial result.

Interfacing with P2 (Infra)
----------------------------
  graph.py calls sandbox.run_patch() and gh.create_pull_request() which live
  in sandbox.py and gh.py (P2's files).  Those functions are imported lazily
  so the graph can be unit-tested without Docker running.

Interfacing with P3 (Dashboard)
---------------------------------
  Every state transition emits an event dict via `emit_event()`.  P3 listens
  on a queue / websocket for these events to update the live timeline.

Dependencies
------------
  langgraph>=0.2.0
  google-generativeai>=0.7.0
"""

from __future__ import annotations

import logging
import operator
import queue
import traceback
from typing import Annotated, Any, Callable, Dict, Optional
from typing_extensions import TypedDict

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    from langgraph.graph import END, START, StateGraph
except ImportError:
    # Lightweight native fallback matching LangGraph's API exactly
    START = "__start__"
    END = "__end__"

    class StateGraph:
        def __init__(self, state_schema: Any):
            self.state_schema = state_schema
            self.nodes: Dict[str, Callable[[Any], dict]] = {}
            self.edges: Dict[str, str] = {}
            self.conditional_edges: Dict[str, tuple[Callable, dict]] = {}
            self.entry_point: Optional[str] = None

        def add_node(self, name: str, func: Callable[[Any], dict]) -> None:
            self.nodes[name] = func

        def add_edge(self, from_node: str, to_node: str) -> None:
            if from_node == START:
                self.entry_point = to_node
            else:
                self.edges[from_node] = to_node

        def add_conditional_edges(
            self, source: str, router: Callable[[Any], str], path_map: dict[str, str]
        ) -> None:
            self.conditional_edges[source] = (router, path_map)

        def compile(self) -> Any:
            return _CompiledStateGraph(self)

    class _CompiledStateGraph:
        def __init__(self, graph_def: StateGraph):
            self.graph_def = graph_def

        def invoke(self, state: dict) -> dict:
            current_state = dict(state)
            curr = self.graph_def.entry_point

            while curr != END and curr is not None:
                node_func = self.graph_def.nodes[curr]
                update = node_func(current_state)
                if isinstance(update, dict):
                    for k, v in update.items():
                        if k == "retry_history" and isinstance(v, list):
                            current_state[k] = current_state.get(k, []) + v
                        else:
                            current_state[k] = v

                if curr in self.graph_def.conditional_edges:
                    router, path_map = self.graph_def.conditional_edges[curr]
                    decision = router(current_state)
                    curr = path_map.get(decision, END)
                elif curr in self.graph_def.edges:
                    curr = self.graph_def.edges[curr]
                else:
                    break

            return current_state

from prompts import (
    TRIAGE_SYSTEM,
    REPRODUCER_SYSTEM,
    FIXER_SYSTEM,
    VERIFIER_SYSTEM,
    triage_prompt,
    reproducer_prompt,
    fixer_prompt,
    verifier_prompt,
    build_pr_body,
)
from llm import call_agent_with_repair

# ---------------------------------------------------------------------------
# Logger
# ---------------------------------------------------------------------------
logger = logging.getLogger("bug_resolver.graph")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
MAX_RETRIES = 4   # maximum Fixer→Verifier retry cycles (matches architecture diagram)

# ---------------------------------------------------------------------------
# Event bus (P3 integration)
# ---------------------------------------------------------------------------
# P3's dashboard reads from this queue.  The queue is module-level so P2/P3
# can import it directly:  `from graph import event_bus`

event_bus: queue.Queue[dict[str, Any]] = queue.Queue()


def emit_event(stage: str, status: str, payload: dict[str, Any] | None = None) -> None:
    """Push a structured event to the P3 dashboard event bus."""
    event: dict[str, Any] = {
        "stage":   stage,
        "status":  status,
        "payload": payload or {},
    }
    logger.info("EVENT | stage=%-12s | status=%s", stage, status)
    try:
        event_bus.put_nowait(event)
    except queue.Full:
        logger.warning("Event bus is full; dropping event for stage '%s'", stage)


# ---------------------------------------------------------------------------
# Shared Agent State
# ---------------------------------------------------------------------------

class AgentState(TypedDict):
    # ── Inputs ──────────────────────────────────────────────────────────────
    issue_url:          str
    issue_title:        str
    issue_body:         str
    repo_path:          str          # local path where repo is cloned
    file_tree:          str          # top-3-level tree string (built by P2)

    # ── Triage output ────────────────────────────────────────────────────────
    triage_result:      dict[str, Any]

    # ── Source snippets fetched after triage (P2 reads these) ───────────────
    source_snippets:    dict[str, str]  # {rel_path: source_code}

    # ── Reproducer output ────────────────────────────────────────────────────
    reproducer_result:  dict[str, Any]

    # ── Sandbox run of reproduction test (P2 fills this) ────────────────────
    repro_sandbox_output:  dict[str, Any]   # {stdout, stderr, returncode}

    # ── Fixer output (updated each retry) ───────────────────────────────────
    fixer_result:       dict[str, Any]

    # ── Verifier output (updated each retry) ────────────────────────────────
    verifier_result:    dict[str, Any]

    # ── Retry tracking ───────────────────────────────────────────────────────
    retry_count:        int
    # Accumulate all (patch, failure) pairs for richer fixer context
    retry_history:      Annotated[list[dict[str, str]], operator.add]

    # ── Final pipeline status ────────────────────────────────────────────────
    # "RUNNING" | "SUCCESS" | "FAILED" | "ERROR"
    pipeline_status:    str
    error_message:      str

    # ── Pull-request info (set on success) ───────────────────────────────────
    pr_url:             str


# ---------------------------------------------------------------------------
# Helper: safe dict get with default
# ---------------------------------------------------------------------------

def _g(d: dict | None, key: str, default: Any = "") -> Any:
    return (d or {}).get(key, default)


# ---------------------------------------------------------------------------
# Node: Triage
# ---------------------------------------------------------------------------

def node_triage(state: AgentState) -> dict[str, Any]:
    """
    Read the GitHub issue and repo file tree.
    Identify affected files and symbols.
    """
    emit_event("triage", "started")
    try:
        result = call_agent_with_repair(
            agent="triage",
            system_prompt=TRIAGE_SYSTEM,
            user_prompt=triage_prompt(
                issue_title=state["issue_title"],
                issue_body=state["issue_body"],
                file_tree=state["file_tree"],
            ),
        )
        emit_event("triage", "completed", {"summary": result.get("summary")})
        
        # Automatically read the affected files so reproducer & fixer have real code
        source_snippets = dict(state.get("source_snippets") or {})
        try:
            from gh import read_files
            affected = result.get("affected_files", [])
            if affected and state.get("repo_path"):
                snippets = read_files(state["repo_path"], affected)
                source_snippets.update(snippets)
        except Exception as exc:
            logger.warning("Could not read affected files: %s", exc)

        return {
            "triage_result":   result,
            "source_snippets": source_snippets,
            "pipeline_status": "RUNNING",
            "error_message":   "",
        }
    except Exception as exc:
        logger.error("Triage node failed: %s", exc, exc_info=True)
        emit_event("triage", "error", {"error": str(exc)})
        return {
            "pipeline_status": "ERROR",
            "error_message":   f"Triage failed: {exc}",
        }


# ---------------------------------------------------------------------------
# Node: Reproducer
# ---------------------------------------------------------------------------

def node_reproducer(state: AgentState) -> dict[str, Any]:
    """
    Write a minimal pytest test that fails on the current (buggy) code.
    Then ask P2's sandbox to confirm the test actually fails.
    """
    emit_event("reproducer", "started")
    try:
        triage = state["triage_result"]
        result = call_agent_with_repair(
            agent="reproducer",
            system_prompt=REPRODUCER_SYSTEM,
            user_prompt=reproducer_prompt(
                triage_summary=_g(triage, "summary"),
                affected_symbols=_g(triage, "affected_symbols", []),
                source_snippets=state.get("source_snippets", {}),
                reproduction_hint=_g(triage, "reproduction_hint"),
            ),
        )

        # Ask P2 to run this test in Docker to confirm it fails
        try:
            from sandbox import run_reproduction_test  # P2's module
            sandbox_out = run_reproduction_test(
                repo_path=state["repo_path"],
                test_file_path=result["test_file_path"],
                test_code=result["test_code"],
            )
        except ImportError:
            # sandbox.py not yet available (e.g., unit-test context)
            logger.warning("sandbox.py not found — skipping sandbox confirmation step.")
            sandbox_out = {"stdout": "", "stderr": "", "returncode": 1}

        # Gate: reproduction test MUST fail (returncode != 0) to confirm bug
        if sandbox_out.get("returncode") == 0:
            logger.warning("Reproduction test PASSED — bug not confirmed.")
            emit_event("reproducer", "not_reproduced", {
                "test_file": result.get("test_file_path"),
                "sandbox_returncode": 0,
            })
            return {
                "reproducer_result":    result,
                "repro_sandbox_output": sandbox_out,
                "pipeline_status":      "FAILED",
                "error_message":        "Reproduction test passed (bug not confirmed). Cannot proceed.",
            }

        emit_event("reproducer", "completed", {
            "test_file": result.get("test_file_path"),
            "sandbox_returncode": sandbox_out.get("returncode"),
        })
        return {
            "reproducer_result":    result,
            "repro_sandbox_output": sandbox_out,
            "pipeline_status":      "RUNNING",
            "error_message":        "",
        }
    except Exception as exc:
        logger.error("Reproducer node failed: %s", exc, exc_info=True)
        emit_event("reproducer", "error", {"error": str(exc)})
        return {
            "pipeline_status": "ERROR",
            "error_message":   f"Reproducer failed: {exc}",
        }


# ---------------------------------------------------------------------------
# Node: Fixer
# ---------------------------------------------------------------------------

def node_fixer(state: AgentState) -> dict[str, Any]:
    """
    Generate a code patch.  On retries, provide the previous failed patch
    and verifier feedback for self-correction.
    """
    retry_count = state.get("retry_count", 0)
    emit_event("fixer", "started", {"retry": retry_count})

    try:
        triage     = state["triage_result"]
        reproducer = state["reproducer_result"]
        repro_out  = state.get("repro_sandbox_output", {})
        history    = state.get("retry_history", [])

        # Build previous failure context for retry
        prev_patch   = history[-1]["patch"]   if history else None
        prev_failure = history[-1]["failure"] if history else None

        result = call_agent_with_repair(
            agent="fixer",
            system_prompt=FIXER_SYSTEM,
            user_prompt=fixer_prompt(
                triage_summary=_g(triage, "summary"),
                test_code=_g(reproducer, "test_code"),
                test_failure_output=repro_out.get("stdout", "") + repro_out.get("stderr", ""),
                source_snippets=state.get("source_snippets", {}),
                retry_number=retry_count,
                previous_patch=prev_patch,
                previous_failure=prev_failure,
            ),
        )

        emit_event("fixer", "completed", {
            "files_changed": result.get("files_changed"),
            "retry": retry_count,
        })
        return {
            "fixer_result":    result,
            "pipeline_status": "RUNNING",
            "error_message":   "",
        }
    except Exception as exc:
        logger.error("Fixer node failed (retry=%d): %s", retry_count, exc, exc_info=True)
        emit_event("fixer", "error", {"error": str(exc), "retry": retry_count})
        return {
            "pipeline_status": "ERROR",
            "error_message":   f"Fixer failed (retry {retry_count}): {exc}",
        }


# ---------------------------------------------------------------------------
# Node: Verifier
# ---------------------------------------------------------------------------

def node_verifier(state: AgentState) -> dict[str, Any]:
    """
    Apply the patch in Docker and run the full pytest suite.
    Ask the Verifier LLM to interpret the results.
    """
    retry_count = state.get("retry_count", 0)
    emit_event("verifier", "started", {"retry": retry_count})

    try:
        fixer_res  = state["fixer_result"]
        reproducer = state["reproducer_result"]
        patch      = _g(fixer_res, "patch")

        # Ask P2's sandbox to apply patch and run full suite
        try:
            from sandbox import run_patch  # P2's module
            sandbox_out = run_patch(
                repo_path=state["repo_path"],
                patch=patch,
                test_node_id=f"{reproducer['test_file_path']}::{reproducer['test_function']}",
            )
        except ImportError:
            logger.warning("sandbox.py not found — using empty sandbox output for Verifier.")
            sandbox_out = {"stdout": "", "stderr": "", "returncode": 1}

        repro_test_id = (
            f"{_g(reproducer, 'test_file_path')}::{_g(reproducer, 'test_function')}"
        )

        result = call_agent_with_repair(
            agent="verifier",
            system_prompt=VERIFIER_SYSTEM,
            user_prompt=verifier_prompt(
                pytest_stdout=sandbox_out.get("stdout", "") + sandbox_out.get("stderr", ""),
                pytest_returncode=sandbox_out.get("returncode", -1),
                reproduction_test_id=repro_test_id,
            ),
        )

        # Record this attempt in retry history (for Fixer's next prompt)
        history_entry = {
            "patch":   patch,
            "failure": _g(result, "feedback_for_fixer"),
        }

        emit_event("verifier", "completed", {
            "passed":               result.get("passed"),
            "failed":               result.get("failed"),
            "full_suite_passed":    result.get("full_suite_passed"),
            "repro_passed":         result.get("reproduction_test_passed"),
            "retry":                retry_count,
        })
        return {
            "verifier_result": result,
            "retry_history":   [history_entry],   # operator.add appends
            "pipeline_status": "RUNNING",
            "error_message":   "",
        }
    except Exception as exc:
        logger.error("Verifier node failed (retry=%d): %s", retry_count, exc, exc_info=True)
        emit_event("verifier", "error", {"error": str(exc), "retry": retry_count})
        return {
            "pipeline_status": "ERROR",
            "error_message":   f"Verifier failed (retry {retry_count}): {exc}",
        }


# ---------------------------------------------------------------------------
# Node: Open Pull Request (delegates to P2)
# ---------------------------------------------------------------------------

def node_open_pr(state: AgentState) -> dict[str, Any]:
    """
    Call P2's gh.create_pull_request() with the patch, explanation, and
    test evidence.  Store the resulting PR URL in state.
    """
    emit_event("pr", "started")
    try:
        fixer_res    = state["fixer_result"]
        verifier_res = state["verifier_result"]
        triage       = state["triage_result"]

        pr_body = build_pr_body(
            issue_url=state["issue_url"],
            triage_summary=_g(triage, "summary"),
            fixer_explanation=_g(fixer_res, "explanation"),
            verifier_result=verifier_res,
            patch=_g(fixer_res, "patch"),
        )

        try:
            from gh import create_pull_request  # P2's module
            pr_url = create_pull_request(
                repo_path=state["repo_path"],
                patch=_g(fixer_res, "patch"),
                pr_title=f"fix: {_g(triage, 'summary')}",
                pr_body=pr_body,
                issue_url=state["issue_url"],
            )
        except ImportError:
            logger.warning("gh.py not found — PR creation skipped (stub mode).")
            pr_url = "https://github.com/stub/pr/0"

        emit_event("pr", "opened", {"pr_url": pr_url})
        return {
            "pr_url":          pr_url,
            "pipeline_status": "SUCCESS",
            "error_message":   "",
        }
    except Exception as exc:
        logger.error("PR node failed: %s", exc, exc_info=True)
        emit_event("pr", "error", {"error": str(exc)})
        return {
            "pipeline_status": "ERROR",
            "error_message":   f"PR creation failed: {exc}",
        }


# ---------------------------------------------------------------------------
# Conditional edge: should we retry or open the PR?
# ---------------------------------------------------------------------------

def route_after_verifier(state: AgentState) -> str:
    """
    Routing function called after node_verifier.

    Returns
    -------
    "open_pr"    → tests green; open the pull request.
    "fixer"      → tests still failing; retry (if under MAX_RETRIES).
    "end_failed" → max retries exhausted; surface failure.
    "end_error"  → a node raised an exception.
    """
    if state.get("pipeline_status") == "ERROR":
        return "end_error"

    verifier = state.get("verifier_result", {})
    all_green = (
        verifier.get("reproduction_test_passed", False)
        and verifier.get("full_suite_passed", False)
    )

    if all_green:
        return "open_pr"

    retry_count = state.get("retry_count", 0)
    if retry_count < MAX_RETRIES:
        return "fixer"

    logger.warning("Max retries (%d) exhausted — ending with FAILED status.", MAX_RETRIES)
    emit_event("pipeline", "failed", {"retries": retry_count})
    return "end_failed"


def route_after_error_nodes(state: AgentState) -> str:
    """Short-circuit to END if any earlier node set pipeline_status = ERROR."""
    if state.get("pipeline_status") == "ERROR":
        return "end_error"
    return "continue"


# ---------------------------------------------------------------------------
# Increment retry counter (used as a lightweight transform node)
# ---------------------------------------------------------------------------

def node_increment_retry(state: AgentState) -> dict[str, Any]:
    """Increment the retry counter before looping back to Fixer."""
    new_count = state.get("retry_count", 0) + 1
    emit_event("retry", "incremented", {"retry_count": new_count})
    return {"retry_count": new_count}


# ---------------------------------------------------------------------------
# Terminal nodes (set final status and pass through)
# ---------------------------------------------------------------------------

def node_end_failed(state: AgentState) -> dict[str, Any]:
    emit_event("pipeline", "end_failed", {"retries": state.get("retry_count")})
    return {"pipeline_status": "FAILED"}


def node_end_error(state: AgentState) -> dict[str, Any]:
    emit_event("pipeline", "end_error", {"error": state.get("error_message")})
    return {}   # status already set by the failing node


# ---------------------------------------------------------------------------
# Build the LangGraph state machine
# ---------------------------------------------------------------------------

def build_graph() -> Any:
    """
    Construct and compile the multi-agent LangGraph StateGraph.

    Graph topology
    --------------
    START
      └─► triage ──► reproducer ──► fixer ──► verifier
                                       ▲           │
                                       │   retry   │ (if tests fail & retries left)
                                       └─ incr ◄───┘
                                                   │
                                              open_pr  (if green)
                                                   │
                                                 END
    """
    g = StateGraph(AgentState)

    # Register nodes
    g.add_node("triage",          node_triage)
    g.add_node("reproducer",      node_reproducer)
    g.add_node("fixer",           node_fixer)
    g.add_node("verifier",        node_verifier)
    g.add_node("increment_retry", node_increment_retry)
    g.add_node("open_pr",         node_open_pr)
    g.add_node("end_failed",      node_end_failed)
    g.add_node("end_error",       node_end_error)

    # ── Entry edge ────────────────────────────────────────────────────────────
    g.add_edge(START, "triage")

    # ── Triage → Reproducer (with error short-circuit) ────────────────────────
    g.add_conditional_edges(
        "triage",
        route_after_error_nodes,
        {"continue": "reproducer", "end_error": "end_error"},
    )

    # ── Reproducer → Fixer (with error short-circuit) ─────────────────────────
    g.add_conditional_edges(
        "reproducer",
        route_after_error_nodes,
        {"continue": "fixer", "end_error": "end_error"},
    )

    # ── Fixer → Verifier (with error short-circuit) ───────────────────────────
    g.add_conditional_edges(
        "fixer",
        route_after_error_nodes,
        {"continue": "verifier", "end_error": "end_error"},
    )

    # ── Verifier → (open_pr | retry fixer | end_failed | end_error) ──────────
    g.add_conditional_edges(
        "verifier",
        route_after_verifier,
        {
            "open_pr":    "open_pr",
            "fixer":      "increment_retry",
            "end_failed": "end_failed",
            "end_error":  "end_error",
        },
    )

    # ── Retry loop: increment counter → fixer ─────────────────────────────────
    g.add_edge("increment_retry", "fixer")

    # ── Termination edges ─────────────────────────────────────────────────────
    g.add_edge("open_pr",    END)
    g.add_edge("end_failed", END)
    g.add_edge("end_error",  END)

    return g.compile()


# Module-level compiled graph (import and use directly)
graph = build_graph()


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def run_pipeline(
    issue_url: str,
    issue_title: str,
    issue_body: str,
    repo_path: str,
    file_tree: str,
    source_snippets: dict[str, str] | None = None,
) -> AgentState:
    """
    Run the full bug-resolution pipeline.

    Parameters
    ----------
    issue_url     : Full GitHub issue URL (e.g., "https://github.com/org/repo/issues/42")
    issue_title   : Title string of the issue.
    issue_body    : Full body/description of the issue.
    repo_path     : Local filesystem path where the repository is cloned.
    file_tree     : String representation of the repo file tree (generated by P2).
    source_snippets : Optional pre-loaded {rel_path: source_code} dict.
                     If omitted, nodes will lazily request snippets via P2.

    Returns
    -------
    AgentState
        Final state after pipeline completes.  Check `pipeline_status` for
        "SUCCESS", "FAILED", or "ERROR".  On "SUCCESS", `pr_url` is set.
    """
    initial_state: AgentState = {
        "issue_url":           issue_url,
        "issue_title":         issue_title,
        "issue_body":          issue_body,
        "repo_path":           repo_path,
        "file_tree":           file_tree,
        "source_snippets":     source_snippets or {},
        "triage_result":       {},
        "reproducer_result":   {},
        "repro_sandbox_output": {},
        "fixer_result":        {},
        "verifier_result":     {},
        "retry_count":         0,
        "retry_history":       [],
        "pipeline_status":     "RUNNING",
        "error_message":       "",
        "pr_url":              "",
    }

    emit_event("pipeline", "started", {"issue_url": issue_url})
    logger.info("Pipeline starting | issue=%s", issue_url)

    try:
        final_state: AgentState = graph.invoke(initial_state)
    except Exception as exc:
        logger.critical("Pipeline crashed: %s\n%s", exc, traceback.format_exc())
        emit_event("pipeline", "crashed", {"error": str(exc)})
        initial_state["pipeline_status"] = "ERROR"
        initial_state["error_message"]   = str(exc)
        return initial_state

    logger.info(
        "Pipeline finished | status=%s | pr_url=%s",
        final_state.get("pipeline_status"),
        final_state.get("pr_url") or "(none)",
    )
    emit_event("pipeline", "finished", {
        "status": final_state.get("pipeline_status"),
        "pr_url": final_state.get("pr_url"),
    })
    return final_state

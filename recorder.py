"""
recorder.py — P2: Run Recorder
================================
Saves each pipeline run as a JSON file for:
  • P3 dashboard replay mode
  • P4 benchmark evaluation
  • Debugging and auditing

Record schema:
  {
    "run_id": "uuid",
    "issue_url": "https://...",
    "status": "SUCCESS|FAILED|ERROR",
    "pr_url": "https://... or null",
    "duration_seconds": 42.5,
    "fix_tries": 2,
    "timestamp": "2026-10-24T...",
    "events": [...],
    "final_state": { ... }
  }
"""

from __future__ import annotations

import json
import logging
import uuid
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger("bug_resolver.recorder")

BASE_DIR = Path(__file__).resolve().parent
RECORDS_DIR = BASE_DIR / "runs"


def save_run(
    final_state: dict[str, Any],
    issue_url: str,
    start_time: float | None = None,
) -> str:
    """
    Save a pipeline run as a JSON record.

    Parameters
    ----------
    final_state : dict
        The final AgentState from run_pipeline().
    issue_url : str
        The GitHub issue URL that was processed.
    start_time : float, optional
        time.time() when the run started (for duration calculation).

    Returns
    -------
    str : Path to the saved JSON file.
    """
    RECORDS_DIR.mkdir(parents=True, exist_ok=True)

    # Drain events from the event bus
    events = []
    try:
        from graph import event_bus
        while not event_bus.empty():
            evt = event_bus.get_nowait()
            evt["timestamp"] = datetime.now(timezone.utc).isoformat()
            events.append(evt)
    except ImportError:
        pass

    now = datetime.now(timezone.utc)
    duration = round(time.time() - start_time, 2) if start_time else None

    # Build the record
    record = {
        "run_id": str(uuid.uuid4()),
        "issue_url": issue_url,
        "status": final_state.get("pipeline_status", "UNKNOWN"),
        "pr_url": final_state.get("pr_url") or None,
        "duration_seconds": duration,
        "fix_tries": (final_state.get("retry_count", 0) + 1),
        "timestamp": now.isoformat(),
        "events": events,
        "final_state": _sanitize_state(final_state),
    }

    # Save to disk
    filename = f"run_{now.strftime('%Y%m%d_%H%M%S')}_{record['run_id'][:8]}.json"
    filepath = RECORDS_DIR / filename

    with filepath.open("w", encoding="utf-8") as f:
        json.dump(record, f, indent=2, ensure_ascii=False, default=str)

    logger.info("Run record saved: %s", filepath)
    return str(filepath)


def _sanitize_state(state: dict[str, Any]) -> dict[str, Any]:
    """Remove non-serializable or overly large fields from the state."""
    safe = {}
    for key, value in state.items():
        try:
            json.dumps(value, default=str)
            # Truncate very large string values
            if isinstance(value, str) and len(value) > 50000:
                safe[key] = value[:50000] + "\n... (truncated)"
            else:
                safe[key] = value
        except (TypeError, ValueError):
            safe[key] = str(value)
    return safe


def read_run(filepath: str) -> dict[str, Any]:
    """Read a saved execution record."""
    path = Path(filepath)
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def list_runs() -> list[dict[str, Any]]:
    """List all saved runs with summary info (for dashboard)."""
    if not RECORDS_DIR.exists():
        return []

    runs = []
    for path in sorted(RECORDS_DIR.glob("run_*.json"), reverse=True):
        try:
            with path.open("r", encoding="utf-8") as f:
                record = json.load(f)
            runs.append({
                "run_id": record.get("run_id"),
                "issue_url": record.get("issue_url"),
                "status": record.get("status"),
                "pr_url": record.get("pr_url"),
                "duration_seconds": record.get("duration_seconds"),
                "timestamp": record.get("timestamp"),
                "filepath": str(path),
            })
        except (json.JSONDecodeError, KeyError):
            continue

    return runs

"""
dashboard.py — Bug2PR Engineering Workspace & Clean Offline Replay
==================================================================
Product: Bug2PR
Tagline: From Issue to Verified PR
Responsibility: P3 — Dashboard and Replay

A focused, restrained engineering workspace:
  • Real run history discovered from runs/*.json
  • Clean, connected offline replay with synchronized timeline, diff, tests, and logs
  • Honest snapshot inspection mode when event streams are absent
  • Clean code-review diff viewer with multi-file support
  • Regression test proof (Baseline RED test vs Post-fix GREEN suite)
  • Live autonomous pipeline execution connected to real backend
"""

from __future__ import annotations

import json
import logging
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import streamlit as st

# Load environment variables (.env)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Import backend modules
try:
    from recorder import RECORDS_DIR, list_runs, read_run, save_run
except ImportError:
    BASE_DIR = Path(__file__).resolve().parent
    RECORDS_DIR = BASE_DIR / "runs"
    def list_runs():
        return []
    def read_run(p):
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    def save_run(*args, **kwargs):
        return ""

logger = logging.getLogger("bug_resolver.dashboard")

# ─────────────────────────────────────────────────────────────────────────────
# 1. Page Configuration & Clean Dark Styles
# ─────────────────────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Bug2PR — From Issue to Verified PR",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded",
)

def inject_custom_styles():
    """Injects focused dark engineering styling without bloated overrides."""
    st.markdown(
        """
        <style>
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

        :root {
            --bg-base: #0a0b0e;
            --bg-surface: #111319;
            --bg-card: #151821;
            --border: #222634;
            --border-active: #3b82f6;
            --text-primary: #f1f5f9;
            --text-secondary: #94a3b8;
            --text-muted: #64748b;
            --accent-green: #10b981;
            --accent-green-bg: rgba(16, 185, 129, 0.12);
            --accent-red: #ef4444;
            --accent-red-bg: rgba(239, 68, 68, 0.12);
            --accent-amber: #f59e0b;
            --accent-amber-bg: rgba(245, 158, 11, 0.12);
            --accent-blue: #3b82f6;
            --accent-blue-bg: rgba(59, 130, 246, 0.12);
            --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
            --font-mono: 'JetBrains Mono', monospace;
        }

        html, body, [class*="css"] {
            font-family: var(--font-sans);
            color: var(--text-primary);
        }

        .stApp {
            background-color: var(--bg-base);
        }

        section[data-testid="stSidebar"] {
            background-color: var(--bg-surface);
            border-right: 1px solid var(--border);
        }

        /* Brand Header */
        .brand-container {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 4px 0 14px 0;
            border-bottom: 1px solid var(--border);
            margin-bottom: 16px;
        }
        .brand-title {
            font-size: 1.25rem;
            font-weight: 700;
            color: #ffffff;
            margin: 0;
            line-height: 1.2;
            letter-spacing: -0.01em;
        }
        .brand-tagline {
            font-size: 0.72rem;
            color: var(--accent-green);
            font-weight: 600;
            letter-spacing: 0.03em;
            text-transform: uppercase;
            margin: 0;
        }

        /* Outcome Badges */
        .badge-verified {
            background: var(--accent-green-bg);
            color: var(--accent-green);
            border: 1px solid rgba(16, 185, 129, 0.3);
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.72rem;
            font-weight: 600;
            font-family: var(--font-mono);
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        .badge-failed {
            background: var(--accent-red-bg);
            color: var(--accent-red);
            border: 1px solid rgba(239, 68, 68, 0.3);
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.72rem;
            font-weight: 600;
            font-family: var(--font-mono);
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        .badge-aborted {
            background: var(--accent-amber-bg);
            color: var(--accent-amber);
            border: 1px solid rgba(245, 158, 11, 0.3);
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.72rem;
            font-weight: 600;
            font-family: var(--font-mono);
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        .badge-neutral {
            background: rgba(148, 163, 184, 0.08);
            color: var(--text-secondary);
            border: 1px solid var(--border);
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.72rem;
            font-weight: 600;
            font-family: var(--font-mono);
        }

        /* Compact Metrics */
        .metric-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 5px;
            padding: 10px 14px;
        }
        .metric-label {
            font-size: 0.7rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.04em;
            font-weight: 600;
            margin-bottom: 2px;
        }
        .metric-val {
            font-size: 1.15rem;
            font-weight: 700;
            color: #ffffff;
            font-family: var(--font-mono);
        }

        /* Connected Pipeline Stepper (Compact & Connected) */
        .pipeline-stepper {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 8px 12px;
            margin-bottom: 14px;
            overflow-x: auto;
        }
        .step-node {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 4px 8px;
            border-radius: 4px;
            white-space: nowrap;
        }
        .step-node.active {
            background: rgba(59, 130, 246, 0.15);
            border: 1px solid rgba(59, 130, 246, 0.4);
        }
        .step-icon {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.68rem;
            font-weight: 700;
            font-family: var(--font-mono);
        }
        .step-icon.completed {
            background: var(--accent-green);
            color: #000;
        }
        .step-icon.failed {
            background: var(--accent-red);
            color: #fff;
        }
        .step-icon.in-progress {
            background: var(--accent-blue);
            color: #fff;
        }
        .step-icon.pending {
            background: var(--border);
            color: var(--text-muted);
        }
        .step-label {
            font-size: 0.78rem;
            font-weight: 600;
            color: var(--text-primary);
        }
        .step-connector {
            flex: 1;
            height: 2px;
            background: var(--border);
            margin: 0 6px;
            min-width: 14px;
        }
        .step-connector.completed {
            background: var(--accent-green);
            opacity: 0.6;
        }

        /* Replay Step Badge */
        .step-badge {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 4px;
            padding: 6px 12px;
            font-size: 0.78rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
        }

        /* Diff Viewer */
        .diff-container {
            font-family: var(--font-mono);
            font-size: 0.8rem;
            background: #0b0c10;
            border: 1px solid var(--border);
            border-radius: 4px;
            overflow-x: auto;
            max-height: 420px;
            overflow-y: auto;
            line-height: 1.5;
            padding: 8px 0;
        }
        .diff-line {
            padding: 1px 12px;
            white-space: pre-wrap;
            word-break: break-all;
        }
        .diff-header {
            color: #93c5fd;
            background: rgba(59, 130, 246, 0.1);
            font-weight: 600;
        }
        .diff-add {
            color: #34d399;
            background: rgba(16, 185, 129, 0.12);
        }
        .diff-del {
            color: #f87171;
            background: rgba(239, 68, 68, 0.12);
        }
        .diff-context {
            color: #94a3b8;
        }
        .diff-meta {
            color: #c084fc;
            background: rgba(192, 132, 252, 0.08);
        }

        /* Hide Streamlit top header decoration */
        div[data-testid="stToolbar"] {
            display: none;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

# ─────────────────────────────────────────────────────────────────────────────
# 2. Geometric Brand Logo & Header
# ─────────────────────────────────────────────────────────────────────────────

def render_brand_header():
    """Renders the custom geometric SVG logo with product title and tagline."""
    svg_logo = """
    <svg width="32" height="32" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="7" fill="#12141A" stroke="#222634" stroke-width="1.5"/>
      <path d="M10 12H18C20.2 12 22 13.8 22 16V20C22 22.2 23.8 24 26 24H27" stroke="#64748B" stroke-width="2" stroke-linecap="round"/>
      <circle cx="10" cy="12" r="3" fill="#F43F5E"/>
      <circle cx="22" cy="18" r="2.5" fill="#3B82F6"/>
      <circle cx="27" cy="24" r="3.5" fill="#10B981"/>
      <path d="M25.5 24L26.7 25.2L28.8 23" stroke="#0A0B0E" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    """
    st.sidebar.markdown(
        f"""
        <div class="brand-container">
            <div>{svg_logo}</div>
            <div>
                <div class="brand-title">Bug2PR</div>
                <div class="brand-tagline">From Issue to Verified PR</div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

# ─────────────────────────────────────────────────────────────────────────────
# 3. Runs Discovery & Record Parsing
# ─────────────────────────────────────────────────────────────────────────────

def discover_runs() -> List[Dict[str, Any]]:
    """
    Discovers and parses JSON run records from runs/.
    Handles empty directories, malformed JSON, and missing fields gracefully.
    """
    if not RECORDS_DIR.exists():
        return []

    runs = []
    for p in sorted(RECORDS_DIR.glob("*.json"), reverse=True):
        try:
            with p.open("r", encoding="utf-8") as f:
                data = json.load(f)
            
            run_id = data.get("run_id") or p.stem.replace("run_", "")
            issue_url = data.get("issue_url", "")
            status = data.get("status", "UNKNOWN").upper()
            pr_url = data.get("pr_url") or None
            duration = data.get("duration_seconds")
            fix_tries = data.get("fix_tries") or (data.get("final_state", {}).get("retry_count", 0) + 1)
            timestamp = data.get("timestamp", "")
            events = data.get("events") or []
            final_state = data.get("final_state") or {}

            repo_name = "unknown/repo"
            issue_num = ""
            if issue_url:
                match = re.search(r"github\.com/([^/]+/[^/]+)/issues/(\d+)", issue_url)
                if match:
                    repo_name = match.group(1)
                    issue_num = f"#{match.group(2)}"

            issue_title = final_state.get("issue_title", "")
            if not issue_title and issue_url:
                issue_title = f"{repo_name} {issue_num}"

            runs.append({
                "run_id": run_id,
                "filepath": str(p),
                "filename": p.name,
                "issue_url": issue_url,
                "repo_name": repo_name,
                "issue_num": issue_num,
                "issue_title": issue_title,
                "status": status,
                "pr_url": pr_url,
                "duration_seconds": duration,
                "fix_tries": fix_tries,
                "timestamp": timestamp,
                "events_count": len(events),
                "has_events": len(events) > 0,
                "record": data,
            })
        except (json.JSONDecodeError, OSError) as exc:
            logger.warning("Skipping corrupted run file %s: %s", p.name, exc)
            continue

    return runs

def get_run_outcome_badge(status: str, pr_url: Optional[str]) -> str:
    """Returns an HTML badge reflecting real verification outcome."""
    if status == "SUCCESS" and pr_url:
        return '<span class="badge-verified">● VERIFIED PR</span>'
    elif status == "SUCCESS":
        return '<span class="badge-neutral">● PASSED (NO PR)</span>'
    elif status == "FAILED":
        return '<span class="badge-failed">● UNRESOLVED / FAILED</span>'
    elif status == "ERROR":
        return '<span class="badge-aborted">● ABORTED / ERROR</span>'
    return f'<span class="badge-neutral">● {status}</span>'

# ─────────────────────────────────────────────────────────────────────────────
# 4. Replay State Calculator (Event-Based vs Snapshot)
# ─────────────────────────────────────────────────────────────────────────────

def calculate_replay_snapshot(record: Dict[str, Any], step_index: int) -> Dict[str, Any]:
    """
    Computes synchronized state at a specific step in the historical replay.
    Derives real stage statuses and evidence without fabricating events.
    """
    events = record.get("events") or []
    final_state = record.get("final_state") or {}
    total_steps = len(events)

    canonical_stages = ["ingestion", "triage", "reproducer", "fixer", "verifier", "pr"]
    stage_statuses = {s: "pending" for s in canonical_stages}
    stage_details = {s: {} for s in canonical_stages}
    retries_observed = 0
    abort_reason = None

    if total_steps == 0:
        # Snapshot Mode: derive final state directly from final_state
        pipe_status = final_state.get("pipeline_status", record.get("status", "UNKNOWN")).upper()
        
        stage_statuses["ingestion"] = "completed"
        if final_state.get("triage_result"):
            stage_statuses["triage"] = "completed"
            stage_details["triage"] = final_state["triage_result"]
        
        repro_res = final_state.get("reproducer_result") or {}
        repro_out = final_state.get("repro_sandbox_output") or {}
        if repro_res:
            if repro_out.get("returncode") == 0:
                stage_statuses["reproducer"] = "failed"
                abort_reason = "Reproduction test passed on baseline (bug unconfirmed)."
            else:
                stage_statuses["reproducer"] = "completed"
            stage_details["reproducer"] = repro_res

        fix_res = final_state.get("fixer_result") or {}
        if fix_res.get("patch"):
            stage_statuses["fixer"] = "completed"
            stage_details["fixer"] = fix_res

        ver_res = final_state.get("verifier_result") or {}
        if ver_res:
            if ver_res.get("full_suite_passed") and ver_res.get("reproduction_test_passed"):
                stage_statuses["verifier"] = "completed"
            else:
                stage_statuses["verifier"] = "failed"
            stage_details["verifier"] = ver_res

        pr_url = final_state.get("pr_url") or record.get("pr_url")
        if pr_url and stage_statuses["verifier"] == "completed":
            stage_statuses["pr"] = "completed"
        elif pipe_status in ("FAILED", "ERROR"):
            stage_statuses["pr"] = "skipped"

        return {
            "mode": "snapshot",
            "current_step": 0,
            "total_steps": 0,
            "current_event": None,
            "stage_statuses": stage_statuses,
            "stage_details": stage_details,
            "retries_observed": final_state.get("retry_count", 0),
            "abort_reason": final_state.get("error_message") or abort_reason,
            "visible_triage": stage_details["triage"],
            "visible_reproducer": stage_details["reproducer"],
            "visible_sandbox": repro_out,
            "visible_fixer": stage_details["fixer"],
            "visible_verifier": stage_details["verifier"],
            "visible_pr_url": pr_url,
            "active_stage": "pr" if stage_statuses["pr"] == "completed" else "verifier",
            "logs": events,
        }

    # Event-Driven Step-Through: process events up to step_index
    clamped_index = min(max(0, step_index), total_steps - 1)
    current_event = events[clamped_index]
    visible_events = events[:clamped_index + 1]

    stage_statuses["ingestion"] = "completed"

    for ev in visible_events:
        stage = ev.get("stage", "").lower()
        status = ev.get("status", "").lower()
        payload = ev.get("payload") or {}

        if stage == "triage":
            if status == "started":
                stage_statuses["triage"] = "in_progress"
            elif status == "completed":
                stage_statuses["triage"] = "completed"
                stage_details["triage"] = payload
            elif status in ("failed", "error"):
                stage_statuses["triage"] = "failed"
                abort_reason = payload.get("error", "Triage analysis failed")

        elif stage == "reproducer":
            if status == "started":
                stage_statuses["reproducer"] = "in_progress"
            elif status == "completed":
                stage_statuses["reproducer"] = "completed"
                stage_details["reproducer"] = payload
            elif status == "not_reproduced":
                stage_statuses["reproducer"] = "failed"
                abort_reason = "Test passed on baseline (bug not confirmed in sandbox)."
            elif status in ("failed", "error"):
                stage_statuses["reproducer"] = "failed"
                abort_reason = payload.get("error", "Reproducer authoring failed")

        elif stage == "retry":
            retries_observed = payload.get("retry_count", retries_observed + 1)

        elif stage == "fixer":
            if status == "started":
                stage_statuses["fixer"] = "in_progress"
            elif status == "completed":
                stage_statuses["fixer"] = "completed"
                stage_details["fixer"] = payload
            elif status in ("failed", "error"):
                stage_statuses["fixer"] = "failed"
                abort_reason = payload.get("error", "Fixer patch generation failed")

        elif stage == "verifier":
            if status == "started":
                stage_statuses["verifier"] = "in_progress"
            elif status == "completed":
                passed = payload.get("full_suite_passed") and payload.get("repro_passed", True)
                stage_statuses["verifier"] = "completed" if passed else "failed"
                stage_details["verifier"] = payload
                if not passed and "retries" in payload:
                    abort_reason = "Verification suite failed after patch application."
            elif status in ("failed", "error"):
                stage_statuses["verifier"] = "failed"
                abort_reason = payload.get("error", "Sandbox verification failed")

        elif stage in ("pr", "pull_request"):
            if status == "started":
                stage_statuses["pr"] = "in_progress"
            elif status in ("opened", "completed"):
                stage_statuses["pr"] = "completed"
                stage_details["pr"] = payload
            elif status in ("failed", "error"):
                stage_statuses["pr"] = "failed"
                abort_reason = payload.get("error", "Pull request creation failed")

        elif stage == "pipeline":
            if status == "failed":
                abort_reason = payload.get("error") or "Max retries exhausted or test gate unmet."

    triage_data = final_state.get("triage_result", {}) if stage_statuses["triage"] == "completed" else {}
    repro_data = final_state.get("reproducer_result", {}) if stage_statuses["reproducer"] in ("completed", "failed") else {}
    sandbox_data = final_state.get("repro_sandbox_output", {}) if stage_statuses["reproducer"] in ("completed", "failed") else {}
    fixer_data = final_state.get("fixer_result", {}) if stage_statuses["fixer"] == "completed" else {}
    verifier_data = final_state.get("verifier_result", {}) if stage_statuses["verifier"] in ("completed", "failed") else {}
    pr_url = (final_state.get("pr_url") or record.get("pr_url")) if stage_statuses["pr"] == "completed" else None

    curr_stage = current_event.get("stage", "ingestion").lower()

    return {
        "mode": "events",
        "current_step": clamped_index,
        "total_steps": total_steps,
        "current_event": current_event,
        "stage_statuses": stage_statuses,
        "stage_details": stage_details,
        "retries_observed": retries_observed,
        "abort_reason": abort_reason,
        "visible_triage": triage_data,
        "visible_reproducer": repro_data,
        "visible_sandbox": sandbox_data,
        "visible_fixer": fixer_data,
        "visible_verifier": verifier_data,
        "visible_pr_url": pr_url,
        "active_stage": curr_stage,
        "logs": visible_events,
    }

# ─────────────────────────────────────────────────────────────────────────────
# 5. Diff Parser & Code Review Formatter
# ─────────────────────────────────────────────────────────────────────────────

def format_unified_diff(patch: str) -> str:
    """Formats a git patch into syntax-colored code-review HTML."""
    if not patch or not patch.strip():
        return '<div style="padding: 12px; color: var(--text-muted); font-family: var(--font-mono); font-size: 0.8rem;">No code patch recorded for this run.</div>'

    html_lines = ['<div class="diff-container">']
    for line in patch.splitlines():
        escaped = (
            line.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
        )
        if line.startswith("+++ ") or line.startswith("--- "):
            html_lines.append(f'<div class="diff-line diff-header">{escaped}</div>')
        elif line.startswith("@@"):
            html_lines.append(f'<div class="diff-line diff-meta">{escaped}</div>')
        elif line.startswith("+"):
            html_lines.append(f'<div class="diff-line diff-add">{escaped}</div>')
        elif line.startswith("-"):
            html_lines.append(f'<div class="diff-line diff-del">{escaped}</div>')
        else:
            html_lines.append(f'<div class="diff-line diff-context">{escaped}</div>')
    html_lines.append('</div>')
    return "".join(html_lines)

# ─────────────────────────────────────────────────────────────────────────────
# 6. Streamlit Views
# ─────────────────────────────────────────────────────────────────────────────

def view_run_history(runs: List[Dict[str, Any]]):
    """Renders a clean, compact Run History table."""
    st.markdown("### Run History")
    st.caption("Immutable execution records discovered from `runs/`. Select any run to inspect its complete evidence trail.")

    if not runs:
        st.info("No saved runs found in `runs/`. Switch to **Live Pipeline** to trigger a run.")
        return

    # Compact Summary Metrics
    total_runs = len(runs)
    verified_prs = sum(1 for r in runs if r["status"] == "SUCCESS" and r["pr_url"])
    failed_runs = sum(1 for r in runs if r["status"] in ("FAILED", "ERROR"))

    col1, col2, col3 = st.columns(3)
    with col1:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Total Execution Records</div>
            <div class="metric-val">{total_runs}</div>
        </div>
        """, unsafe_allow_html=True)
    with col2:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Verified PRs Opened</div>
            <div class="metric-val" style="color: var(--accent-green);">{verified_prs}</div>
        </div>
        """, unsafe_allow_html=True)
    with col3:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Honest Failures / Aborts</div>
            <div class="metric-val" style="color: var(--accent-amber);">{failed_runs}</div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<div style='height: 12px;'></div>", unsafe_allow_html=True)

    # Compact Runs Table
    for r in runs:
        with st.container():
            c1, c2, c3, c4, c5 = st.columns([3, 1.2, 1.2, 1.2, 1.4])
            with c1:
                badge = get_run_outcome_badge(r["status"], r["pr_url"])
                st.markdown(f"{badge} **{r['issue_title']}**", unsafe_allow_html=True)
                st.caption(f"{r['repo_name']} {r['issue_num']} • Run ID: `{r['run_id'][:8]}`")
            with c2:
                dur_str = f"{r['duration_seconds']}s" if r["duration_seconds"] else "—"
                st.markdown(f"**Duration**<br>`{dur_str}`", unsafe_allow_html=True)
            with c3:
                st.markdown(f"**Fix Tries**<br>`{r['fix_tries']}`", unsafe_allow_html=True)
            with c4:
                if r["pr_url"]:
                    st.markdown(f'<a href="{r["pr_url"]}" target="_blank" style="color: var(--accent-green); font-weight:600; text-decoration: none;">🔗 View PR</a>', unsafe_allow_html=True)
                else:
                    st.markdown('<span style="color: var(--text-muted);">None</span>', unsafe_allow_html=True)
            with c5:
                if st.button("Inspect Replay", key=f"btn_inspect_{r['run_id']}"):
                    st.session_state["selected_run_id"] = r["run_id"]
                    st.session_state["replay_step"] = 0
                    st.session_state["active_nav"] = "replay"
                    st.rerun()
            st.markdown("<hr style='border: none; border-top: 1px solid var(--border); margin: 6px 0 10px 0;'>", unsafe_allow_html=True)

def render_connected_stepper(stage_statuses: Dict[str, str], active_stage: str):
    """Renders a compact, visually connected horizontal pipeline stepper."""
    stages = [
        ("ingestion", "1. Ingest"),
        ("triage", "2. Triage"),
        ("reproducer", "3. Repro"),
        ("fixer", "4. Fixer"),
        ("verifier", "5. Verify"),
        ("pr", "6. PR"),
    ]

    html_parts = ['<div class="pipeline-stepper">']
    for idx, (k, label) in enumerate(stages):
        status = stage_statuses.get(k, "pending")
        is_active = (active_stage == k)
        
        # Icon
        if status == "completed":
            icon_char = "✓"
            icon_cls = "completed"
        elif status == "failed":
            icon_char = "✕"
            icon_cls = "failed"
        elif status == "in_progress" or is_active:
            icon_char = "●"
            icon_cls = "in-progress"
        else:
            icon_char = "○"
            icon_cls = "pending"

        active_cls = " active" if is_active else ""
        html_parts.append(
            f'<div class="step-node{active_cls}">'
            f'<div class="step-icon {icon_cls}">{icon_char}</div>'
            f'<div class="step-label">{label}</div>'
            f'</div>'
        )

        if idx < len(stages) - 1:
            conn_cls = " completed" if status == "completed" else ""
            html_parts.append(f'<div class="step-connector{conn_cls}"></div>')

    html_parts.append('</div>')
    st.markdown("".join(html_parts), unsafe_allow_html=True)

def view_offline_replay(run: Dict[str, Any]):
    """Renders the improved, clutter-free Offline Replay & Evidence Workspace."""
    record = run["record"]
    events = record.get("events") or []
    has_events = len(events) > 0

    if "replay_step" not in st.session_state:
        st.session_state["replay_step"] = 0

    # Header
    st.markdown(f"""
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
        <div>
            <div style="display: flex; align-items: center; gap: 8px;">
                {get_run_outcome_badge(run["status"], run["pr_url"])}
                <h3 style="margin: 0; font-size: 1.25rem;">{run["issue_title"]}</h3>
            </div>
            <div style="color: var(--text-muted); font-size: 0.8rem; margin-top: 2px;">
                Repository: <b>{run["repo_name"]}</b> {run["issue_num"]} • Recorded: <code>{run["timestamp"] or 'Unrecorded'}</code> • Duration: <code>{run["duration_seconds"] or '—'}s</code>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # Replay Controls or Snapshot Notice
    if not has_events:
        st.info("ℹ️ **Snapshot Inspection Mode**: This historical run was saved as a final execution snapshot without intermediate event ticks. Showing complete verified final state, regression tests, patch diff, and logs.")
        replay_state = calculate_replay_snapshot(record, 0)
    else:
        curr_step = st.session_state["replay_step"]
        total_steps = len(events)

        # Compact Controls Row
        c_btns, c_status, c_slider = st.columns([1.6, 2.2, 2.4])
        with c_btns:
            b1, b2, b3, b4 = st.columns(4)
            with b1:
                if st.button("⏮", help="Restart from Step 1", use_container_width=True):
                    st.session_state["replay_step"] = 0
                    st.rerun()
            with b2:
                if st.button("◀", help="Previous Step", disabled=(curr_step <= 0), use_container_width=True):
                    st.session_state["replay_step"] = max(0, curr_step - 1)
                    st.rerun()
            with b3:
                if st.button("▶", help="Next Step", disabled=(curr_step >= total_steps - 1), use_container_width=True):
                    st.session_state["replay_step"] = min(total_steps - 1, curr_step + 1)
                    st.rerun()
            with b4:
                if st.button("⏭", help="Jump to Final Step", use_container_width=True):
                    st.session_state["replay_step"] = total_steps - 1
                    st.rerun()

        with c_slider:
            scrub_step = st.slider(
                "Step Scrubber",
                min_value=0,
                max_value=total_steps - 1,
                value=curr_step,
                label_visibility="collapsed",
            )
            if scrub_step != curr_step:
                st.session_state["replay_step"] = scrub_step
                st.rerun()

        replay_state = calculate_replay_snapshot(record, st.session_state["replay_step"])
        curr_ev = replay_state["current_event"]

        with c_status:
            ev_stage = curr_ev.get("stage", "") if curr_ev else "—"
            ev_stat = curr_ev.get("status", "") if curr_ev else "—"
            st.markdown(
                f'<div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 4px; padding: 6px 10px; font-size: 0.78rem; text-align: center;">'
                f'Step <b>{curr_step + 1}/{total_steps}</b> &nbsp;|&nbsp; <code>{ev_stage}</code> &bull; <code>{ev_stat}</code>'
                f'</div>',
                unsafe_allow_html=True,
            )

    # ── Connected Agent Pipeline Stepper ───────────────────────────────────────
    render_connected_stepper(replay_state["stage_statuses"], replay_state.get("active_stage", ""))

    if replay_state.get("abort_reason"):
        st.warning(f"**Pipeline Abort / Note**: {replay_state['abort_reason']}")

    # ── Evidence Workspace ─────────────────────────────────────────────────────
    tabs = st.tabs(["Overview", "Regression Test Evidence", "Unified Code Diff", "Terminal & Logs"])

    # TAB 1: Overview
    with tabs[0]:
        t1_col1, t1_col2 = st.columns([1.6, 1])
        with t1_col1:
            st.markdown("##### Issue Context")
            st.markdown(f"**URL:** [{run['issue_url']}]({run['issue_url']})")
            issue_body = run["record"].get("final_state", {}).get("issue_body", "No issue body recorded.")
            st.code(issue_body, language="text")

            triage = replay_state.get("visible_triage") or {}
            if triage:
                st.markdown("##### Triage Diagnosis")
                st.markdown(f"**Summary:** {triage.get('summary', '—')}")
                if triage.get("affected_files"):
                    st.markdown(f"**Affected Files:** `{', '.join(triage['affected_files'])}`")
                if triage.get("reproduction_hint"):
                    st.markdown(f"**Reproduction Hint:** `{triage['reproduction_hint']}`")

        with t1_col2:
            st.markdown("##### Verification Outcome")
            if replay_state.get("visible_pr_url"):
                st.markdown(f"""
                <div style="background: var(--accent-green-bg); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; padding: 12px; margin-bottom: 12px;">
                    <div style="font-weight: 700; color: var(--accent-green); margin-bottom: 4px; font-size: 0.88rem;">✓ VERIFIED PULL REQUEST OPENED</div>
                    <div style="font-size: 0.78rem; margin-bottom: 8px;">Tests passed 100% in isolated sandbox. No regressions introduced.</div>
                    <a href="{replay_state['visible_pr_url']}" target="_blank" style="background: var(--accent-green); color: #000; font-weight: 700; padding: 5px 10px; border-radius: 4px; text-decoration: none; font-size: 0.78rem; display: inline-block;">Open GitHub PR ↗</a>
                </div>
                """, unsafe_allow_html=True)
            else:
                st.markdown(f"""
                <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; padding: 12px; margin-bottom: 12px;">
                    <div style="font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; font-size: 0.88rem;">NO PULL REQUEST OPENED</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.4;">
                        Verification invariant: <i>No green tests, no verified fix. No verified fix, no PR.</i>
                    </div>
                </div>
                """, unsafe_allow_html=True)

            st.markdown(f"""
            <div class="metric-card">
                <div class="metric-label">Fix Attempts / Retries</div>
                <div class="metric-val">{replay_state.get('retries_observed', 0) + 1}</div>
            </div>
            """, unsafe_allow_html=True)

    # TAB 2: Regression Test Evidence
    with tabs[1]:
        st.markdown("##### Test-First Verification Evidence")
        st.caption("A failing regression test must be authored and proven to fail in the sandbox *before* any fix is attempted.")

        repro = replay_state.get("visible_reproducer") or {}
        sandbox = replay_state.get("visible_sandbox") or {}
        verifier = replay_state.get("visible_verifier") or {}

        c_test1, c_test2 = st.columns(2)
        with c_test1:
            st.markdown("###### Phase 1: Baseline Failure Proof (RED)")
            if repro.get("test_code"):
                st.caption(f"Test File: `{repro.get('test_file_path', 'tests/test_reproduce.py')}`")
                st.code(repro["test_code"], language="python")
            else:
                st.info("Reproducer test not reached or not recorded in this step.")

            if sandbox.get("stdout") or sandbox.get("stderr"):
                retcode = sandbox.get("returncode", 1)
                st.caption(f"Sandbox Exit Code: `{retcode}` (Expected non-zero proving bug)")
                raw_out = sandbox.get("stdout", "") + sandbox.get("stderr", "")
                st.code(raw_out, language="text")

        with c_test2:
            st.markdown("###### Phase 2: Post-Fix Suite Verification (GREEN)")
            if verifier:
                v_pass = verifier.get("full_suite_passed") and verifier.get("reproduction_test_passed")
                total = verifier.get("total_tests", "—")
                passed = verifier.get("passed", "—")
                failed = verifier.get("failed", 0)

                st.markdown(f"""
                <div style="background: {'var(--accent-green-bg)' if v_pass else 'var(--accent-red-bg)'}; border: 1px solid {'rgba(16,185,129,0.3)' if v_pass else 'rgba(239,68,68,0.3)'}; border-radius: 4px; padding: 8px 12px; margin-bottom: 8px;">
                    <div style="font-weight: 700; color: {'var(--accent-green)' if v_pass else 'var(--accent-red)'}; font-size: 0.85rem;">
                        {'✅ ALL TESTS GREEN — ZERO REGRESSIONS' if v_pass else '❌ SUITE VERIFICATION FAILED'}
                    </div>
                    <div style="font-size: 0.78rem; margin-top: 2px;">
                        Passed: <code>{passed}</code> / Total: <code>{total}</code> | Failed: <code>{failed}</code>
                    </div>
                </div>
                """, unsafe_allow_html=True)

                if verifier.get("feedback_for_fixer"):
                    st.markdown("**Verifier Feedback / Trace:**")
                    st.code(verifier["feedback_for_fixer"], language="text")
            else:
                st.info("Verification step not reached or not recorded in this step.")

    # TAB 3: Code Diff
    with tabs[2]:
        st.markdown("##### Unified Code Diff")
        fixer = replay_state.get("visible_fixer") or {}
        patch = fixer.get("patch", "")
        if fixer.get("files_changed"):
            st.caption(f"Files Modified: `{', '.join(fixer['files_changed'])}`")
        if fixer.get("explanation"):
            st.markdown(f"**Fixer Rationale:** {fixer['explanation']}")

        if patch:
            st.markdown(format_unified_diff(patch), unsafe_allow_html=True)
        else:
            st.info("No code patch generated or revealed at this replay position.")

    # TAB 4: Terminal & Logs
    with tabs[3]:
        st.markdown("##### Execution Trace & Logs")
        st.caption("Chronological execution messages, sandbox outputs, and agent transitions.")

        log_lines = []
        for ev in replay_state.get("logs", []):
            stg = ev.get("stage", "pipe")
            stat = ev.get("status", "")
            ts = ev.get("timestamp", "")
            payload_str = json.dumps(ev.get("payload", {}))
            log_lines.append(f"[{ts}] [{stg.upper()}] status={stat} payload={payload_str}")

        if not log_lines:
            log_text = "No log events recorded for this step."
        else:
            log_text = "\n".join(log_lines)

        st.code(log_text, language="text")

def view_live_runner():
    """Renders the Live Bug-to-PR pipeline execution workspace."""
    st.markdown("### Live Pipeline Execution")
    st.caption("Trigger autonomous bug resolution on a real GitHub issue URL using Bug2PR's multi-agent orchestrator.")

    token_set = bool(os.environ.get("GITHUB_TOKEN"))
    groq_set = bool(os.environ.get("GROQ_API_KEY"))

    col_env1, col_env2, col_env3 = st.columns(3)
    with col_env1:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Groq LLM API</div>
            <div class="metric-val" style="color: {'var(--accent-green)' if groq_set else 'var(--accent-amber)'}; font-size: 0.95rem;">
                {'● Configured' if groq_set else '○ Missing Key'}
            </div>
        </div>
        """, unsafe_allow_html=True)
    with col_env2:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">GitHub Token</div>
            <div class="metric-val" style="color: {'var(--accent-green)' if token_set else 'var(--accent-amber)'}; font-size: 0.95rem;">
                {'● Configured' if token_set else '○ Missing Token'}
            </div>
        </div>
        """, unsafe_allow_html=True)
    with col_env3:
        sandbox_mode = os.environ.get("SANDBOX_MODE", "local")
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Sandbox Mode</div>
            <div class="metric-val" style="color: var(--accent-blue); font-size: 0.95rem;">
                <code>{sandbox_mode}</code>
            </div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<div style='height: 12px;'></div>", unsafe_allow_html=True)

    issue_input = st.text_input(
        "GitHub Issue URL",
        placeholder="https://github.com/owner/repository/issues/123",
        help="Provide a public GitHub issue URL to trigger autonomous resolution.",
    )

    if st.button("🚀 Run Autonomous Pipeline", type="primary", use_container_width=True):
        if not issue_input or not issue_input.strip():
            st.error("Please provide a valid GitHub issue URL.")
            return

        if not re.match(r"https?://github\.com/[^/]+/[^/]+/issues/\d+", issue_input.strip()):
            st.error("Invalid format. Expected: https://github.com/<owner>/<repo>/issues/<number>")
            return

        if not groq_set:
            st.warning("⚠️ `GROQ_API_KEY` is not detected in your environment. Live agent calls will fail without a valid key. Set it in `.env` or system environment.")

        with st.status("Executing Bug2PR autonomous pipeline...", expanded=True) as status_box:
            st.write("1. Fetching GitHub issue metadata...")
            try:
                from gh import fetch_issue, clone_repo, get_file_tree
                from graph import run_pipeline, event_bus
                
                start_time = time.time()
                issue_meta = fetch_issue(issue_input.strip())
                st.write(f"✓ Found issue: **{issue_meta.get('title')}** in `{issue_meta.get('owner')}/{issue_meta.get('repo')}`")

                st.write("2. Cloning target repository...")
                repo_path = clone_repo(issue_input.strip(), target_dir="repos")
                st.write(f"✓ Repository cloned to: `{repo_path}`")

                st.write("3. Inspecting file tree and source context...")
                file_tree = get_file_tree(repo_path)
                st.write(f"✓ File tree built ({len(file_tree.splitlines())} files)")

                st.write("4. Running multi-agent state machine (Triage → Reproducer → Fixer → Verifier)...")
                final_state = run_pipeline(
                    issue_url=issue_input.strip(),
                    issue_title=issue_meta["title"],
                    issue_body=issue_meta["body"],
                    repo_path=repo_path,
                    file_tree=file_tree,
                )

                st.write("5. Saving immutable run record to `runs/`...")
                record_path = save_run(
                    final_state=final_state,
                    issue_url=issue_input.strip(),
                    start_time=start_time,
                )
                st.write(f"✓ Run record saved: `{record_path}`")

                pipe_status = final_state.get("pipeline_status", "UNKNOWN")
                if pipe_status == "SUCCESS":
                    status_box.update(label="✅ Pipeline Completed: Verified PR Opened!", state="complete")
                    st.success(f"Verified PR: {final_state.get('pr_url')}")
                elif pipe_status == "FAILED":
                    status_box.update(label="⚠️ Pipeline Ended: Unresolved within Retries", state="error")
                    st.warning("Pipeline completed honestly without opening a non-working PR.")
                else:
                    status_box.update(label="❌ Pipeline Error", state="error")
                    st.error(final_state.get("error_message", "Unknown error"))

                st.button("Reload Run History to Inspect", on_click=lambda: None)

            except Exception as exc:
                status_box.update(label=f"Pipeline Failed: {exc}", state="error")
                st.error(f"Execution failed: {exc}")
                logger.exception("Pipeline execution error")

# ─────────────────────────────────────────────────────────────────────────────
# 7. Main Application Router
# ─────────────────────────────────────────────────────────────────────────────

def main():
    inject_custom_styles()
    render_brand_header()

    runs = discover_runs()

    if "active_nav" not in st.session_state:
        st.session_state["active_nav"] = "replay" if runs else "live"

    nav_options = ["📂 Replay & Evidence", "📋 Run History", "⚡ Live Pipeline"]
    nav_keys = {"📂 Replay & Evidence": "replay", "📋 Run History": "history", "⚡ Live Pipeline": "live"}
    
    current_nav_index = 0
    if st.session_state["active_nav"] == "history":
        current_nav_index = 1
    elif st.session_state["active_nav"] == "live":
        current_nav_index = 2

    selected_nav = st.sidebar.radio(
        "Workspace View",
        options=nav_options,
        index=current_nav_index,
        label_visibility="collapsed",
    )
    st.session_state["active_nav"] = nav_keys[selected_nav]

    st.sidebar.markdown("""
    <div style="margin-bottom: 12px;">
        <a href="http://localhost:5173" target="_blank" style="display: block; text-align: center; background: #161821; border: 1px solid #222634; color: #34d399; padding: 6px 10px; border-radius: 4px; font-size: 0.75rem; text-decoration: none; font-weight: 600;">
            ← Open Fixtrail Landing Page (Port 5173) ↗
        </a>
    </div>
    """, unsafe_allow_html=True)

    st.sidebar.markdown("<hr style='border: none; border-top: 1px solid var(--border); margin: 12px 0;'>", unsafe_allow_html=True)

    if st.session_state["active_nav"] in ("replay", "history") and runs:
        st.sidebar.markdown("<div class='metric-label'>Select Run to Inspect</div>", unsafe_allow_html=True)
        
        run_options = {
            f"[{r['status'][:3]}] {r['repo_name']} {r['issue_num']} ({r['duration_seconds'] or '—'}s)": r["run_id"]
            for r in runs
        }
        
        default_idx = 0
        current_sel = st.session_state.get("selected_run_id")
        if current_sel:
            for idx, r_id in enumerate(run_options.values()):
                if r_id == current_sel:
                    default_idx = idx
                    break

        selected_label = st.sidebar.selectbox(
            "Historical Runs",
            options=list(run_options.keys()),
            index=default_idx,
            label_visibility="collapsed",
        )
        st.session_state["selected_run_id"] = run_options[selected_label]

    st.sidebar.markdown("""
    <div style="position: fixed; bottom: 16px; left: 16px; font-size: 0.72rem; color: var(--text-muted); line-height: 1.4;">
        <b>Bug2PR</b> v1.0 • P3 Workspace<br>
        Autonomous Multi-Agent Verifier<br>
        <i>No Green Tests, No Fix. No Verified Fix, No PR.</i>
    </div>
    """, unsafe_allow_html=True)

    if st.session_state["active_nav"] == "history":
        view_run_history(runs)
    elif st.session_state["active_nav"] == "live":
        view_live_runner()
    else:  # "replay"
        if not runs:
            st.info("No saved runs found in `runs/`. Switch to **Live Pipeline** to run an issue, or check project test suites.")
        else:
            selected_id = st.session_state.get("selected_run_id") or runs[0]["run_id"]
            target_run = next((r for r in runs if r["run_id"] == selected_id), runs[0])
            view_offline_replay(target_run)

if __name__ == "__main__":
    main()

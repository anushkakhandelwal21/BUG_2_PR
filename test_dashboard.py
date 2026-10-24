"""
test_dashboard.py — Unit tests for Bug2PR Dashboard & Replay Engine
===================================================================
Tests run discovery, snapshot calculations, diff parsing, and error handling.
"""

import json
import tempfile
from pathlib import Path
import pytest

from dashboard import (
    discover_runs,
    calculate_replay_snapshot,
    format_unified_diff,
    get_run_outcome_badge,
)
import dashboard


def test_format_unified_diff():
    # Empty patch
    empty_html = format_unified_diff("")
    assert "No code patch recorded" in empty_html

    # Standard diff
    patch = (
        "--- a/api/pagination.py\n"
        "+++ b/api/pagination.py\n"
        "@@ -10,1 +10,1 @@\n"
        "- return items[:limit-1]\n"
        "+ return items[:limit]\n"
    )
    html = format_unified_diff(patch)
    assert "diff-container" in html
    assert "diff-header" in html
    assert "diff-add" in html
    assert "diff-del" in html
    assert "return items[:limit]" in html


def test_get_run_outcome_badge():
    badge_succ = get_run_outcome_badge("SUCCESS", "https://github.com/org/repo/pull/1")
    assert "badge-verified" in badge_succ
    assert "VERIFIED PR" in badge_succ

    badge_fail = get_run_outcome_badge("FAILED", None)
    assert "badge-failed" in badge_fail

    badge_err = get_run_outcome_badge("ERROR", None)
    assert "badge-aborted" in badge_err


def test_discover_runs_with_corrupted_json(monkeypatch):
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        monkeypatch.setattr(dashboard, "RECORDS_DIR", tmp_path)

        # 1. Empty directory
        assert discover_runs() == []

        # 2. Corrupted JSON file
        bad_file = tmp_path / "run_corrupt.json"
        bad_file.write_text("{ incomplete json ...", encoding="utf-8")
        assert discover_runs() == []

        # 3. Valid JSON record
        good_file = tmp_path / "run_good.json"
        good_record = {
            "run_id": "test-uuid-1234",
            "issue_url": "https://github.com/org/repo/issues/42",
            "status": "SUCCESS",
            "pr_url": "https://github.com/org/repo/pull/43",
            "duration_seconds": 12.5,
            "final_state": {
                "issue_title": "Test Issue",
            },
            "events": []
        }
        good_file.write_text(json.dumps(good_record), encoding="utf-8")

        runs = discover_runs()
        assert len(runs) == 1
        assert runs[0]["run_id"] == "test-uuid-1234"
        assert runs[0]["issue_title"] == "Test Issue"
        assert runs[0]["status"] == "SUCCESS"


def test_calculate_replay_snapshot_only():
    record = {
        "run_id": "snap-123",
        "status": "SUCCESS",
        "pr_url": "https://github.com/test/pr/1",
        "events": [],
        "final_state": {
            "pipeline_status": "SUCCESS",
            "triage_result": {"summary": "Triage done"},
            "reproducer_result": {"test_code": "def test_foo(): assert False"},
            "repro_sandbox_output": {"returncode": 1},
            "fixer_result": {"patch": "--- a\n+++ b"},
            "verifier_result": {
                "full_suite_passed": True,
                "reproduction_test_passed": True,
                "total_tests": 10,
                "passed": 10,
            },
            "pr_url": "https://github.com/test/pr/1",
        }
    }
    state = calculate_replay_snapshot(record, 0)
    assert state["mode"] == "snapshot"
    assert state["stage_statuses"]["triage"] == "completed"
    assert state["stage_statuses"]["reproducer"] == "completed"
    assert state["stage_statuses"]["fixer"] == "completed"
    assert state["stage_statuses"]["verifier"] == "completed"
    assert state["stage_statuses"]["pr"] == "completed"
    assert state["visible_pr_url"] == "https://github.com/test/pr/1"


def test_calculate_replay_event_stream_progression():
    events = [
        {"stage": "pipeline", "status": "started", "payload": {}},
        {"stage": "triage", "status": "started", "payload": {}},
        {"stage": "triage", "status": "completed", "payload": {"summary": "Bug in add"}},
        {"stage": "reproducer", "status": "started", "payload": {}},
        {"stage": "reproducer", "status": "completed", "payload": {"sandbox_returncode": 1}},
        {"stage": "fixer", "status": "started", "payload": {"retry": 0}},
        {"stage": "fixer", "status": "completed", "payload": {"files_changed": ["a.py"]}},
        {"stage": "verifier", "status": "started", "payload": {"retry": 0}},
        {"stage": "verifier", "status": "completed", "payload": {"full_suite_passed": True, "repro_passed": True}},
        {"stage": "pr", "status": "opened", "payload": {"pr_url": "https://pr.url"}},
    ]
    record = {
        "run_id": "event-123",
        "events": events,
        "final_state": {
            "triage_result": {"summary": "Bug in add"},
            "reproducer_result": {"test_code": "assert False"},
            "fixer_result": {"patch": "+ fix"},
            "verifier_result": {"full_suite_passed": True, "repro_passed": True},
            "pr_url": "https://pr.url",
        }
    }

    # At step 2 (triage completed, reproducer not started)
    s2 = calculate_replay_snapshot(record, 2)
    assert s2["stage_statuses"]["triage"] == "completed"
    assert s2["stage_statuses"]["reproducer"] == "pending"
    assert s2["stage_statuses"]["fixer"] == "pending"
    assert s2["visible_fixer"] == {}
    assert s2["visible_pr_url"] is None

    # At step 6 (fixer completed, verifier not started)
    s6 = calculate_replay_snapshot(record, 6)
    assert s6["stage_statuses"]["triage"] == "completed"
    assert s6["stage_statuses"]["reproducer"] == "completed"
    assert s6["stage_statuses"]["fixer"] == "completed"
    assert s6["stage_statuses"]["verifier"] == "pending"
    assert s6["visible_fixer"]["patch"] == "+ fix"
    assert s6["visible_verifier"] == {}
    assert s6["visible_pr_url"] is None

    # At final step (all completed)
    s_final = calculate_replay_snapshot(record, len(events) - 1)
    assert s_final["stage_statuses"]["verifier"] == "completed"
    assert s_final["stage_statuses"]["pr"] == "completed"
    assert s_final["visible_pr_url"] == "https://pr.url"

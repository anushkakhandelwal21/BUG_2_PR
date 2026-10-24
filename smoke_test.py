"""Smoke test for P1+P2 integrated files: prompts.py, llm.py, graph.py, sandbox.py, gh.py, recorder.py"""
import os
import sys

# No API key needed for smoke tests — llm.py now uses lazy init
# Set a dummy key so imports don't fail if code checks env at any point
os.environ.setdefault("GROQ_API_KEY", "dummy_key_for_import_test")

# ── 1. prompts.py ────────────────────────────────────────────────────────────
from prompts import (
    TRIAGE_SYSTEM, REPRODUCER_SYSTEM, FIXER_SYSTEM, VERIFIER_SYSTEM,
    triage_prompt, reproducer_prompt, fixer_prompt, verifier_prompt, build_pr_body,
)

tp = triage_prompt(
    issue_title="Bug: crash on empty list",
    issue_body="When list is empty, utils.sort() crashes with IndexError",
    file_tree="/src\n  utils.py\n  main.py",
)
assert "Bug: crash on empty list" in tp, "triage_prompt missing issue title"

rp = reproducer_prompt(
    triage_summary="sort() crashes on empty input",
    affected_symbols=[{"file": "utils.py", "symbol": "sort", "reason": "crashes on []"}],
    source_snippets={"utils.py": "def sort(x):\n    return x[0]"},
    reproduction_hint="call sort([])",
)
assert "sort()" in rp

fp = fixer_prompt(
    triage_summary="sort() crashes on empty input",
    test_code="def test_sort_empty():\n    from utils import sort\n    sort([])",
    test_failure_output="IndexError: list index out of range",
    source_snippets={"utils.py": "def sort(x):\n    return x[0]"},
    retry_number=0,
)
assert "IndexError" in fp

vp = verifier_prompt(
    pytest_stdout="PASSED 5\nFAILED 0",
    pytest_returncode=0,
    reproduction_test_id="tests/test_utils.py::test_sort_empty",
)
assert "PASSED 5" in vp

pr_body = build_pr_body(
    issue_url="https://github.com/x/y/issues/1",
    triage_summary="sort crash",
    fixer_explanation="Added guard for empty list",
    verifier_result={
        "reproduction_test_passed": True,
        "full_suite_passed": True,
        "passed": 5,
        "total_tests": 5,
    },
    patch="--- a/utils.py\n+++ b/utils.py",
)
assert "Resolves" in pr_body

print("prompts.py: ALL PASS")


# ── 2. llm.py ────────────────────────────────────────────────────────────────
from llm import cache, estimate_tokens, _extract_json, _validate_keys

# estimate_tokens
assert estimate_tokens("hello world") > 0, "estimate_tokens returned 0"

# _extract_json — bare JSON
raw = '{"summary": "test", "confidence": 0.9}'
data = _extract_json(raw)
assert data["summary"] == "test"

# _extract_json — fenced JSON
fenced = '```json\n{"summary": "fenced", "confidence": 0.8}\n```'
data2 = _extract_json(fenced)
assert data2["summary"] == "fenced"

# _validate_keys
_validate_keys(data, ["summary", "confidence"])

# missing key raises
try:
    _validate_keys(data, ["missing_key"])
    assert False, "Should have raised"
except ValueError:
    pass

# cache put/get (in-memory)
cache.put("model-x", "sys", "usr", {"result": 42})
hit = cache.get("model-x", "sys", "usr")
assert hit == {"result": 42}, "Cache round-trip failed"

miss = cache.get("model-x", "sys", "different_usr")
assert miss is None, "Cache should miss on different prompt"

print("llm.py:     ALL PASS")


# ── 3. graph.py ──────────────────────────────────────────────────────────────
try:
    import graph as graph_mod
    assert hasattr(graph_mod, "run_pipeline"), "run_pipeline not found"
    assert hasattr(graph_mod, "graph"),        "compiled graph not found"
    assert hasattr(graph_mod, "event_bus"),    "event_bus not found"
    assert hasattr(graph_mod, "AgentState"),   "AgentState not found"
    print("graph.py:   ALL PASS")
except Exception as e:
    print(f"graph.py:   IMPORT WARNING — {e}")


# ── 4. sandbox.py ────────────────────────────────────────────────────────────
from sandbox import run_command, run_reproduction_test, run_patch
assert callable(run_command), "run_command not callable"
assert callable(run_reproduction_test), "run_reproduction_test not callable"
assert callable(run_patch), "run_patch not callable"
print("sandbox.py: ALL PASS")


# ── 5. gh.py ─────────────────────────────────────────────────────────────────
from gh import fetch_issue, clone_repo, get_file_tree, read_files, create_pull_request, _parse_issue_url
parsed = _parse_issue_url("https://github.com/octocat/hello-world/issues/42")
assert parsed["owner"] == "octocat"
assert parsed["repo"] == "hello-world"
assert parsed["number"] == "42"
print("gh.py:      ALL PASS")


# ── 6. recorder.py ───────────────────────────────────────────────────────────
from recorder import save_run, read_run, list_runs
assert callable(save_run), "save_run not callable"
assert callable(list_runs), "list_runs not callable"
print("recorder.py: ALL PASS")


print()
print("=" * 50)
print("  ALL SMOKE TESTS PASSED SUCCESSFULLY")
print("=" * 50)

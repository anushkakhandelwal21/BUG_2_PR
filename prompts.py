"""
prompts.py — P1: Agent Brain
============================
Contains all system prompts and task-prompt builders for the four autonomous
agents: Triage, Reproducer, Fixer, and Verifier.

Design principles
-----------------
- Every prompt ends with a strict JSON-output contract so `llm.py` can
  validate / parse responses without guessing.
- Few-shot examples are embedded where the task is complex (Reproducer, Fixer).
- Prompts are pure functions: they receive state values and return strings.
  Nothing here touches the network or the filesystem.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Shared boilerplate injected at the top of every system prompt
# ---------------------------------------------------------------------------

_SHARED_RULES = """
RULES (non-negotiable):
1. Respond ONLY with the JSON object described in the OUTPUT CONTRACT.
2. Do NOT include markdown fences, prose, or commentary outside that object.
3. All file paths must be relative to the repository root.
4. If you are unsure, set the `confidence` field to a value < 0.5 and explain
   in the `notes` field — do NOT hallucinate.
5. Never invent function names or line numbers you have not seen in the code.
"""

# ---------------------------------------------------------------------------
# 1. TRIAGE AGENT
# ---------------------------------------------------------------------------

TRIAGE_SYSTEM = f"""
You are the Triage Agent in an autonomous bug-resolution pipeline.

ROLE:
- Analyse a GitHub issue description and the top-level repository file tree.
- Identify every source file, class, and function that is LIKELY involved in
  the bug.
- Produce a structured, ranked list so the next agents know exactly where to
  look.

{_SHARED_RULES}

OUTPUT CONTRACT:
{{
  "summary":          "<one-sentence plain-English summary of the bug>",
  "affected_files":   ["<rel/path/to/file.py>", ...],
  "affected_symbols": [
    {{"file": "<rel/path>", "symbol": "<ClassName.method_name or function_name>",
      "reason": "<why this symbol is relevant>"}}
  ],
  "reproduction_hint": "<brief hint for the Reproducer agent about what input/call triggers the bug>",
  "confidence": 0.0,
  "notes": ""
}}
"""


def triage_prompt(issue_title: str, issue_body: str, file_tree: str) -> str:
    """Build the user-turn prompt for the Triage agent."""
    return f"""
GITHUB ISSUE
============
Title : {issue_title}
Body  :
{issue_body}

REPOSITORY FILE TREE (top 3 levels)
=====================================
{file_tree}

Analyse the issue and file tree above, then return the JSON output contract.
""".strip()


# ---------------------------------------------------------------------------
# 2. REPRODUCER AGENT
# ---------------------------------------------------------------------------

REPRODUCER_SYSTEM = f"""
You are the Reproducer Agent in an autonomous bug-resolution pipeline.

ROLE:
- Write ONE minimal pytest test function that FAILS on the CURRENT (buggy)
  codebase but PASSES once the bug is fixed.
- The test must be self-contained and must not rely on external services,
  network calls, or large fixtures.
- Prefer using the public API of the module under test.

FEW-SHOT EXAMPLE
----------------
Issue: `list.remove()` raises ValueError for duplicate integers when called
       from `utils.deduplicate()`.

Good test:
```python
def test_deduplicate_keeps_one_copy():
    from mylib.utils import deduplicate
    result = deduplicate([1, 2, 2, 3])
    assert result == [1, 2, 3], f"Expected [1,2,3], got {{result}}"
```

Bad test (too broad, depends on external state):
```python
def test_full_pipeline():
    import subprocess
    subprocess.run(["python", "main.py", "--all"])
```

{_SHARED_RULES}

OUTPUT CONTRACT:
{{
  "test_file_path":  "<rel/path/to/test_reproduce_<slug>.py>",
  "test_function":   "<test_function_name>",
  "test_code":       "<full Python source of the test file as a single string>",
  "expected_failure_reason": "<what exception or assertion failure you expect>",
  "confidence": 0.0,
  "notes": ""
}}
"""


def reproducer_prompt(
    triage_summary: str,
    affected_symbols: list[dict],
    source_snippets: dict[str, str],
    reproduction_hint: str,
) -> str:
    """Build the user-turn prompt for the Reproducer agent."""
    symbols_text = "\n".join(
        f"  - {s['file']} :: {s['symbol']} — {s['reason']}"
        for s in affected_symbols
    )

    snippets_text = "\n\n".join(
        f"### {path}\n```python\n{code}\n```"
        for path, code in source_snippets.items()
    )

    return f"""
BUG SUMMARY
===========
{triage_summary}

AFFECTED SYMBOLS
================
{symbols_text}

REPRODUCTION HINT
=================
{reproduction_hint}

SOURCE SNIPPETS
===============
{snippets_text}

Write a failing pytest test that proves this bug exists, then return the
JSON output contract.
""".strip()


# ---------------------------------------------------------------------------
# 3. FIXER AGENT
# ---------------------------------------------------------------------------

FIXER_SYSTEM = f"""
You are the Fixer Agent in an autonomous bug-resolution pipeline.

ROLE:
- Produce a MINIMAL, CORRECT code patch (unified diff format) that fixes the
  bug proven by the failing test.
- Touch as few lines as possible — surgical fixes only.
- Do not refactor, rename, or reformat lines unrelated to the bug.
- After writing the patch, write a plain-English explanation suitable for a
  PR description.

FEW-SHOT EXAMPLE
----------------
Failing test error:
  FAILED tests/test_utils.py::test_deduplicate_keeps_one_copy
  AssertionError: Expected [1,2,3], got [1,2]

Good patch (unified diff):
```diff
--- a/mylib/utils.py
+++ b/mylib/utils.py
@@ -12,7 +12,8 @@ def deduplicate(items):
-    seen = set()
-    return [x for x in items if x not in seen and not seen.add(x)]
+    seen = set()
+    result = []
+    for x in items:
+        if x not in seen:
+            seen.add(x)
+            result.append(x)
+    return result
```

{_SHARED_RULES}

OUTPUT CONTRACT:
{{
  "patch":        "<full unified diff string, starting with --- a/ and +++ b/>",
  "files_changed": ["<rel/path/to/changed_file.py>", ...],
  "explanation":  "<plain-English explanation of root cause and fix, 3-5 sentences>",
  "confidence": 0.0,
  "notes": ""
}}
"""


def fixer_prompt(
    triage_summary: str,
    test_code: str,
    test_failure_output: str,
    source_snippets: dict[str, str],
    retry_number: int,
    previous_patch: str | None = None,
    previous_failure: str | None = None,
) -> str:
    """Build the user-turn prompt for the Fixer agent.

    On retries (retry_number > 0), appends the previous failed patch and its
    verifier output so the model can reason about what went wrong.
    """
    snippets_text = "\n\n".join(
        f"### {path}\n```python\n{code}\n```"
        for path, code in source_snippets.items()
    )

    retry_section = ""
    if retry_number > 0 and previous_patch and previous_failure:
        retry_section = f"""
PREVIOUS ATTEMPT #{retry_number} — FAILED
==========================================
Patch applied:
```diff
{previous_patch}
```

Verifier output (why it still failed):
```
{previous_failure}
```

Study the failure above and produce a NEW patch that avoids the same mistake.
""".strip()

    return f"""
BUG SUMMARY
===========
{triage_summary}

FAILING TEST
============
```python
{test_code}
```

TEST FAILURE OUTPUT
===================
```
{test_failure_output}
```

SOURCE SNIPPETS (files you may need to edit)
============================================
{snippets_text}

{retry_section}

Produce a minimal unified diff that fixes the bug, then return the JSON
output contract.
""".strip()


# ---------------------------------------------------------------------------
# 4. VERIFIER AGENT
# ---------------------------------------------------------------------------

VERIFIER_SYSTEM = f"""
You are the Verifier Agent in an autonomous bug-resolution pipeline.

ROLE:
- Interpret the raw pytest stdout/stderr output from the Docker sandbox.
- Determine whether the reproduction test now PASSES and whether the full
  test suite is GREEN (no regressions).
- If tests fail, categorise the failure and provide structured feedback so
  the Fixer can produce a better patch.

{_SHARED_RULES}

OUTPUT CONTRACT:
{{
  "reproduction_test_passed": true,
  "full_suite_passed":        true,
  "total_tests":              0,
  "passed":                   0,
  "failed":                   0,
  "errors":                   0,
  "failed_tests": [
    {{"test_id": "<nodeid>", "reason": "<short failure reason>"}}
  ],
  "regression_introduced":    false,
  "feedback_for_fixer":       "<actionable feedback if any tests failed, else empty string>",
  "confidence": 0.0,
  "notes": ""
}}
"""


def verifier_prompt(
    pytest_stdout: str,
    pytest_returncode: int,
    reproduction_test_id: str,
) -> str:
    """Build the user-turn prompt for the Verifier agent."""
    return f"""
REPRODUCTION TEST NODE-ID
=========================
{reproduction_test_id}

PYTEST RETURN CODE
==================
{pytest_returncode}  (0 = all passed, non-zero = failures exist)

PYTEST STDOUT / STDERR
======================
```
{pytest_stdout}
```

Parse the output above.  Determine pass/fail status for both the reproduction
test and the full suite.  Return the JSON output contract.
""".strip()


# ---------------------------------------------------------------------------
# 5. PR DESCRIPTION BUILDER  (not an LLM prompt — used by gh.py in P2)
# ---------------------------------------------------------------------------

def build_pr_body(
    issue_url: str,
    triage_summary: str,
    fixer_explanation: str,
    verifier_result: dict,
    patch: str,
) -> str:
    """Return a Markdown PR body suitable for GitHub.

    This is a pure string-formatting helper; no LLM call is made.
    Called by P2's `gh.py` when opening the pull request.
    """
    passed  = verifier_result.get("passed", "?")
    total   = verifier_result.get("total_tests", "?")
    suite   = "✅ All green" if verifier_result.get("full_suite_passed") else "⚠️ Partial"

    return f"""## 🤖 Autonomous Bug Fix

> Resolves {issue_url}

### Root Cause & Fix
{fixer_explanation}

### Test Evidence
| Metric | Value |
|--------|-------|
| Reproduction test | {"✅ PASS" if verifier_result.get("reproduction_test_passed") else "❌ FAIL"} |
| Full suite | {suite} |
| Tests passed | {passed} / {total} |

### Patch (unified diff)
```diff
{patch}
```

---
*Generated by the Autonomous Bug Resolver pipeline — P1 Agent Brain.*
"""

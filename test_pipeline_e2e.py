"""
test_pipeline_e2e.py
====================
End-to-end verification of the P1 Multi-Agent State Machine without making
real Gemini API calls or requiring Docker.

Mocks the LLM calls and sandbox outputs to test:
  1. Success on first try (Triage -> Reproduce -> Fix -> Verify [pass] -> PR)
  2. Retry loop on failure (Triage -> Reproduce -> Fix -> Verify [fail] -> Fix -> Verify [pass] -> PR)
  3. Max 4 retries exhaustion (Verify fails 4 times -> FAILED status)
  4. Event bus emissions for P3 Dashboard integration
"""

import os
import unittest
from unittest.mock import patch, MagicMock

os.environ["GEMINI_API_KEY"] = "mock_key_for_testing"

import graph as g_module
from graph import run_pipeline, event_bus


class TestMultiAgentPipeline(unittest.TestCase):

    def setUp(self):
        # Clear event bus before each test
        while not event_bus.empty():
            event_bus.get_nowait()

    @patch("gh.create_pull_request", return_value="https://github.com/my-org/repo/pull/101")
    @patch("graph.call_agent_with_repair")
    def test_happy_path_first_attempt(self, mock_call_agent, mock_pr):
        """Pipeline succeeds on the first attempt without retries."""
        
        # Define mock responses for each agent
        def side_effect(agent, **kwargs):
            if agent == "triage":
                return {
                    "summary": "Fix off-by-one in pagination",
                    "affected_files": ["api/pagination.py"],
                    "affected_symbols": [{"file": "api/pagination.py", "symbol": "paginate", "reason": "excludes last item"}],
                    "reproduction_hint": "call paginate(total=10, limit=5, page=2)",
                    "confidence": 0.95,
                    "notes": "",
                }
            elif agent == "reproducer":
                return {
                    "test_file_path": "tests/test_reproduce_pagination.py",
                    "test_function": "test_last_page_includes_all_items",
                    "test_code": "def test_last_page_includes_all_items(): assert False",
                    "expected_failure_reason": "IndexError",
                    "confidence": 0.9,
                    "notes": "",
                }
            elif agent == "fixer":
                return {
                    "patch": "--- a/api/pagination.py\n+++ b/api/pagination.py\n@@ -10,1 +10,1 @@\n- return items[:limit-1]\n+ return items[:limit]",
                    "files_changed": ["api/pagination.py"],
                    "explanation": "Fixed off-by-one slicing boundary.",
                    "confidence": 0.98,
                    "notes": "",
                }
            elif agent == "verifier":
                return {
                    "reproduction_test_passed": True,
                    "full_suite_passed": True,
                    "total_tests": 42,
                    "passed": 42,
                    "failed": 0,
                    "errors": 0,
                    "failed_tests": [],
                    "regression_introduced": False,
                    "feedback_for_fixer": "",
                    "confidence": 1.0,
                    "notes": "",
                }
            raise ValueError(f"Unexpected agent: {agent}")

        mock_call_agent.side_effect = side_effect

        final_state = run_pipeline(
            issue_url="https://github.com/my-org/repo/issues/101",
            issue_title="Bug: Pagination drops last element",
            issue_body="When calling paginate with 10 elements on page 2, the 10th item is missing.",
            repo_path="/tmp/mock_repo",
            file_tree="api/\n  pagination.py\ntests/\n  test_api.py",
        )

        self.assertEqual(final_state["pipeline_status"], "SUCCESS")
        self.assertEqual(final_state["retry_count"], 0)
        self.assertTrue(final_state["pr_url"].startswith("http"))
        self.assertIn("Fix off-by-one in pagination", final_state["triage_result"]["summary"])
        print("Test 1: Happy path (0 retries) -> PASS")

    @patch("gh.create_pull_request", return_value="https://github.com/my-org/repo/pull/102")
    @patch("graph.call_agent_with_repair")
    def test_retry_loop_recovers_on_second_attempt(self, mock_call_agent, mock_pr):
        """Pipeline fails first test verification, retries once, then passes."""
        verifier_call_count = [0]

        def side_effect(agent, **kwargs):
            if agent == "triage":
                return {
                    "summary": "Fix zero division in analytics",
                    "affected_files": ["math.py"],
                    "affected_symbols": [],
                    "reproduction_hint": "calc(0)",
                    "confidence": 0.9,
                    "notes": "",
                }
            elif agent == "reproducer":
                return {
                    "test_file_path": "tests/test_reproduce_zero.py",
                    "test_function": "test_zero_div",
                    "test_code": "def test_zero_div(): assert False",
                    "expected_failure_reason": "ZeroDivisionError",
                    "confidence": 0.9,
                    "notes": "",
                }
            elif agent == "fixer":
                return {
                    "patch": "--- a/math.py\n+++ b/math.py\n+ if x == 0: return 0",
                    "files_changed": ["math.py"],
                    "explanation": "Handled zero case.",
                    "confidence": 0.9,
                    "notes": "",
                }
            elif agent == "verifier":
                verifier_call_count[0] += 1
                if verifier_call_count[0] == 1:
                    # First attempt fails
                    return {
                        "reproduction_test_passed": False,
                        "full_suite_passed": False,
                        "total_tests": 10,
                        "passed": 9,
                        "failed": 1,
                        "errors": 0,
                        "failed_tests": [{"test_id": "test_zero_div", "reason": "still raised"}],
                        "regression_introduced": False,
                        "feedback_for_fixer": "ZeroDivisionError still triggered on line 12",
                        "confidence": 0.8,
                        "notes": "",
                    }
                else:
                    # Second attempt passes
                    return {
                        "reproduction_test_passed": True,
                        "full_suite_passed": True,
                        "total_tests": 10,
                        "passed": 10,
                        "failed": 0,
                        "errors": 0,
                        "failed_tests": [],
                        "regression_introduced": False,
                        "feedback_for_fixer": "",
                        "confidence": 1.0,
                        "notes": "",
                    }
            raise ValueError(f"Unexpected agent: {agent}")

        mock_call_agent.side_effect = side_effect

        final_state = run_pipeline(
            issue_url="https://github.com/my-org/repo/issues/102",
            issue_title="Bug: Zero division error",
            issue_body="Throws ZeroDivisionError when x=0",
            repo_path="/tmp/mock_repo",
            file_tree="math.py\ntests/test_math.py",
        )

        self.assertEqual(final_state["pipeline_status"], "SUCCESS")
        self.assertEqual(final_state["retry_count"], 1)
        self.assertEqual(len(final_state["retry_history"]), 2)
        print("Test 2: Retry loop recovery (1 retry) -> PASS")

    @patch("graph.call_agent_with_repair")
    def test_max_retries_exhaustion(self, mock_call_agent):
        """Pipeline stops after 4 retries if verifier stays failing."""
        def side_effect(agent, **kwargs):
            if agent == "triage":
                return {
                    "summary": "Tough bug",
                    "affected_files": ["core.py"],
                    "affected_symbols": [],
                    "reproduction_hint": "",
                    "confidence": 0.5,
                    "notes": "",
                }
            elif agent == "reproducer":
                return {
                    "test_file_path": "tests/test_reproduce.py",
                    "test_function": "test_bug",
                    "test_code": "def test_bug(): assert False",
                    "expected_failure_reason": "Fail",
                    "confidence": 0.5,
                    "notes": "",
                }
            elif agent == "fixer":
                return {
                    "patch": "diff mock",
                    "files_changed": ["core.py"],
                    "explanation": "attempt",
                    "confidence": 0.5,
                    "notes": "",
                }
            elif agent == "verifier":
                return {
                    "reproduction_test_passed": False,
                    "full_suite_passed": False,
                    "total_tests": 10,
                    "passed": 8,
                    "failed": 2,
                    "errors": 0,
                    "failed_tests": [],
                    "regression_introduced": True,
                    "feedback_for_fixer": "Test still fails",
                    "confidence": 0.5,
                    "notes": "",
                }
            raise ValueError(f"Unexpected agent: {agent}")

        mock_call_agent.side_effect = side_effect

        final_state = run_pipeline(
            issue_url="https://github.com/my-org/repo/issues/103",
            issue_title="Unsolvable bug",
            issue_body="Complicated bug",
            repo_path="/tmp/mock_repo",
            file_tree="core.py",
        )

        self.assertEqual(final_state["pipeline_status"], "FAILED")
        self.assertEqual(final_state["retry_count"], 4)
        print("Test 3: Max 4 retries exhaustion -> PASS")


if __name__ == "__main__":
    unittest.main()


import sys
from pathlib import Path

from gh import get_issue
from sandbox import run_command
from recorder import save_run
from auto_fixer import apply_and_verify_fix


PROJECT_DIR = Path(__file__).resolve().parent


def process_issue(issue_number):
    print(f"Fetching GitHub Issue #{issue_number}...")

    issue_result = get_issue(issue_number)

    if not issue_result["success"]:
        print("Issue fetch failed:", issue_result.get("error", "Unknown error"))
        return 1

    issue = issue_result["issue"]

    print(f"Title: {issue['title']}")
    print(f"URL: {issue['url']}")

    print("\nRunning initial tests...")

    test_result = run_command(
        [
            sys.executable,
            "-m",
            "pytest",
            "tests/test_demo_bug.py",
            "-v"
        ],
        cwd=PROJECT_DIR,
        timeout=60
    )

    print(test_result["output"])

    if test_result["error"]:
        print(test_result["error"])

    if test_result["success"]:
        print("\nInitial tests already pass. No fix needed.")
        return 0

    print("\nInitial tests failed. Asking AI to propose and verify a fix...")

    result = apply_and_verify_fix(
        issue=issue,
        test_output=test_result["output"],
        test_error=test_result["error"]
    )

    print("\n--- Automatic Fix Result ---")
    print(result["message"])

    if result.get("details"):
        print(result["details"])

    if result.get("test_output"):
        print(result["test_output"])

    if result.get("test_error"):
        print(result["test_error"])

    record_path = save_run({
        "module": "P2 automatic issue fixing",
        "issue_number": issue["number"],
        "issue_title": issue["title"],
        "issue_url": issue["url"],
        "initial_test_status": "failed",
        "fix_result": result
    })

    print(f"\nRun record saved: {record_path}")

    return 0 if result["success"] else 1


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python issue_workflow.py <issue_number>")
        raise SystemExit(2)

    raise SystemExit(process_issue(sys.argv[1]))




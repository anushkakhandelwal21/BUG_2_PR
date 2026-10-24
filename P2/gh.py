
import subprocess
from pathlib import Path


def run_gh_command(args, cwd=None, timeout=30):
    """
    Run a GitHub CLI command and return a structured result.

    Example:
        run_gh_command(["auth", "status"])
        run_gh_command(["repo", "view"])
    """
    if not isinstance(args, (list, tuple)) or not args:
        return {
            "success": False,
            "output": "",
            "error": "args must be a non-empty list or tuple.",
            "return_code": -1
        }

    if not all(isinstance(arg, str) for arg in args):
        return {
            "success": False,
            "output": "",
            "error": "All command arguments must be strings.",
            "return_code": -1
        }

    try:
        result = subprocess.run(
            ["gh", *args],
            cwd=Path(cwd).resolve() if cwd else None,
            capture_output=True,
            text=True,
            timeout=timeout,
            shell=False
        )

        return {
            "success": result.returncode == 0,
            "output": result.stdout.strip(),
            "error": result.stderr.strip(),
            "return_code": result.returncode
        }

    except FileNotFoundError:
        return {
            "success": False,
            "output": "",
            "error": "GitHub CLI (gh) is not installed or not in PATH.",
            "return_code": -1
        }

    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "output": "",
            "error": f"GitHub command timed out after {timeout} seconds.",
            "return_code": -1
        }

    except (OSError, ValueError) as exc:
        return {
            "success": False,
            "output": "",
            "error": str(exc),
            "return_code": -1
        }

def create_pull_request(
    title,
    body,
    head,
    base="main",
    repo="anushkakhandelwal21/p2-infrastructure",
    draft=False
):
    """Create a GitHub pull request from an existing branch."""
    if not all(isinstance(value, str) and value.strip()
               for value in (title, body, head, base, repo)):
        return {
            "success": False,
            "output": "",
            "error": "Title, body, head, base, and repo are required.",
            "return_code": -1
        }

    args = [
        "pr", "create",
        "--repo", repo,
        "--title", title,
        "--body", body,
        "--head", head,
        "--base", base
    ]

    if draft:
        args.append("--draft")

    return run_gh_command(args)


def get_issue(issue_number, repo="anushkakhandelwal21/p2-infrastructure"):
    """Fetch a GitHub issue's details without modifying the issue."""
    try:
        number = int(issue_number)
        if number <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return {
            "success": False,
            "output": "",
            "error": "Issue number must be a positive integer.",
            "return_code": -1
        }

    result = run_gh_command([
        "issue", "view", str(number),
        "--repo", repo,
        "--json", "number,title,body,state,url,labels"
    ])

    if not result["success"]:
        return result

    import json

    try:
        issue_data = json.loads(result["output"])
        result["issue"] = issue_data
    except json.JSONDecodeError:
        result["success"] = False
        result["error"] = "Could not parse GitHub issue details."

    return result

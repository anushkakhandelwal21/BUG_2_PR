"""
main.py — CLI Entry Point
===========================
Usage:
    python main.py <github_issue_url>

Example:
    python main.py https://github.com/yourorg/demo-bugs/issues/1

Orchestrates the full pipeline:
  1. Fetch issue metadata from GitHub
  2. Clone the repository
  3. Build file tree and read source files
  4. Run the multi-agent pipeline (graph.py)
  5. Save the run record (recorder.py)
  6. Print results
"""

from __future__ import annotations

import logging
import sys
import time
from pathlib import Path

# Load .env file if python-dotenv is available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from gh import fetch_issue, clone_repo, get_file_tree, read_files
from graph import run_pipeline, event_bus
from recorder import save_run

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("bug_resolver.main")


def main(issue_url: str) -> int:
    """
    Run the full bug-resolution pipeline on a GitHub issue.

    Returns 0 on success, 1 on failure.
    """
    start_time = time.time()

    print("=" * 60)
    print("  [Bug-to-PR Agent] Autonomous Bug Resolution")
    print("=" * 60)
    print()

    # ── 1. Fetch issue ────────────────────────────────────────────
    print(f"[+] Fetching issue: {issue_url}")
    try:
        issue = fetch_issue(issue_url)
    except Exception as exc:
        print(f"[!] Failed to fetch issue: {exc}")
        return 1

    print(f"   Title: {issue['title']}")
    print(f"   Repo:  {issue['owner']}/{issue['repo']}")
    print()

    # ── 2. Clone repo ────────────────────────────────────────────
    print("[+] Cloning repository...")
    try:
        repo_path = clone_repo(issue_url, target_dir="repos")
    except Exception as exc:
        print(f"[!] Failed to clone repo: {exc}")
        return 1

    print(f"   Cloned to: {repo_path}")
    print()

    # ── 3. Build file tree ────────────────────────────────────────
    print("[+] Building file tree...")
    file_tree = get_file_tree(repo_path)
    print(f"   Files found: {len(file_tree.splitlines())}")
    print()

    # ── 4. Run pipeline ──────────────────────────────────────────
    print("[+] Starting multi-agent pipeline...")
    print("   Triage -> Reproducer -> Fixer -> Verifier")
    print()

    try:
        final_state = run_pipeline(
            issue_url=issue_url,
            issue_title=issue["title"],
            issue_body=issue["body"],
            repo_path=repo_path,
            file_tree=file_tree,
        )
    except Exception as exc:
        print(f"[!] Pipeline crashed: {exc}")
        logger.exception("Pipeline crash")
        return 1

    # ── 5. Save run record ────────────────────────────────────────
    duration = round(time.time() - start_time, 2)
    try:
        record_path = save_run(
            final_state=final_state,
            issue_url=issue_url,
            start_time=start_time,
        )
        print(f"[+] Run record saved: {record_path}")
    except Exception as exc:
        logger.warning("Failed to save run record: %s", exc)
        record_path = None

    # ── 6. Print results ──────────────────────────────────────────
    status = final_state.get("pipeline_status", "UNKNOWN")
    print()
    print("=" * 60)

    if status == "SUCCESS":
        pr_url = final_state.get("pr_url", "")
        print(f"  [SUCCESS] PR opened!")
        print(f"  PR URL:   {pr_url}")
        print(f"  Duration: {duration}s")
        print(f"  Retries:  {final_state.get('retry_count', 0)}")
    elif status == "FAILED":
        print(f"  [FAILED] Could not fix within {final_state.get('retry_count', 0)} retries")
        print(f"  Duration: {duration}s")
        print(f"  (This is an honest failure -- no fake PR was created)")
    elif status == "ERROR":
        print(f"  [ERROR] {final_state.get('error_message', 'Unknown error')}")
        print(f"  Duration: {duration}s")
    else:
        print(f"  Status: {status}")

    print("=" * 60)
    return 0 if status == "SUCCESS" else 1


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python main.py <github_issue_url>")
        print("Example: python main.py https://github.com/org/repo/issues/1")
        sys.exit(2)

    sys.exit(main(sys.argv[1]))

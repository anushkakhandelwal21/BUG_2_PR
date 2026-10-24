"""
gh.py — P2: GitHub Integration
================================
GitHub REST API interactions for the bug-resolution pipeline.

Functions (called by graph.py and main.py):
  • fetch_issue(issue_url)        → {title, body, labels, url, owner, repo, number}
  • clone_repo(issue_url, target) → local path
  • get_file_tree(repo_path)      → tree string
  • read_files(repo_path, paths)  → {rel_path: content}
  • create_pull_request(...)      → PR URL string

Uses the `requests` library + GITHUB_TOKEN env var.
"""

from __future__ import annotations

import logging
import os
import re
import subprocess
import time
from pathlib import Path
from typing import Any

import requests

logger = logging.getLogger("bug_resolver.gh")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_ISSUE_URL_RE = re.compile(
    r"https?://github\.com/(?P<owner>[^/]+)/(?P<repo>[^/]+)/issues/(?P<number>\d+)"
)


def _parse_issue_url(issue_url: str) -> dict[str, str]:
    """Extract owner, repo, and issue number from a GitHub issue URL."""
    m = _ISSUE_URL_RE.match(issue_url.strip())
    if not m:
        raise ValueError(
            f"Invalid GitHub issue URL: {issue_url!r}. "
            "Expected format: https://github.com/owner/repo/issues/123"
        )
    return {
        "owner": m.group("owner"),
        "repo": m.group("repo"),
        "number": m.group("number"),
    }


def _gh_headers() -> dict[str, str]:
    """Return GitHub API request headers with auth token if available."""
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def fetch_issue(issue_url: str) -> dict[str, Any]:
    """
    Fetch a GitHub issue's details.

    Parameters
    ----------
    issue_url : str
        Full GitHub issue URL (e.g., "https://github.com/org/repo/issues/42")

    Returns
    -------
    dict with keys: title, body, labels, url, owner, repo, number
    """
    parsed = _parse_issue_url(issue_url)
    api_url = (
        f"https://api.github.com/repos/{parsed['owner']}/{parsed['repo']}"
        f"/issues/{parsed['number']}"
    )

    logger.info("Fetching issue: %s", api_url)
    resp = requests.get(api_url, headers=_gh_headers(), timeout=30)
    resp.raise_for_status()
    data = resp.json()

    return {
        "title": data["title"],
        "body": data.get("body") or "",
        "labels": [l["name"] for l in data.get("labels", [])],
        "url": data["html_url"],
        "owner": parsed["owner"],
        "repo": parsed["repo"],
        "number": int(parsed["number"]),
    }


def clone_repo(issue_url: str, target_dir: str = "repos") -> str:
    """
    Clone the repository that the issue belongs to.

    Returns the local filesystem path to the cloned repo.
    """
    parsed = _parse_issue_url(issue_url)
    clone_url = f"https://github.com/{parsed['owner']}/{parsed['repo']}.git"
    local_path = os.path.join(
        target_dir, f"{parsed['owner']}_{parsed['repo']}_{int(time.time())}"
    )

    Path(target_dir).mkdir(parents=True, exist_ok=True)

    logger.info("Cloning %s → %s", clone_url, local_path)
    result = subprocess.run(
        ["git", "clone", "--depth=1", clone_url, local_path],
        capture_output=True, text=True, timeout=120,
    )
    if result.returncode != 0:
        raise RuntimeError(f"git clone failed: {result.stderr}")

    logger.info("Cloned successfully to %s", local_path)
    return str(Path(local_path).resolve())


def get_file_tree(repo_path: str, max_depth: int = 3) -> str:
    """
    Walk the repo and return a tree string representation.

    Skips .git, __pycache__, node_modules, .venv, etc.
    """
    SKIP_DIRS = {
        ".git", "__pycache__", "node_modules", ".venv", "venv",
        ".tox", ".mypy_cache", ".pytest_cache", ".eggs", "*.egg-info",
        ".idea", ".vscode",
    }
    SKIP_EXTENSIONS = {".pyc", ".pyo", ".so", ".o", ".a"}

    lines = []
    root = Path(repo_path)

    def _walk(current: Path, prefix: str, depth: int):
        if depth > max_depth:
            return

        try:
            entries = sorted(current.iterdir(), key=lambda p: (p.is_file(), p.name))
        except PermissionError:
            return

        dirs = [e for e in entries if e.is_dir() and e.name not in SKIP_DIRS]
        files = [
            e for e in entries
            if e.is_file() and e.suffix not in SKIP_EXTENSIONS
            and not e.name.startswith(".")
        ]

        for f in files:
            lines.append(f"{prefix}{f.name}")
        for d in dirs:
            lines.append(f"{prefix}{d.name}/")
            _walk(d, prefix + "  ", depth + 1)

    _walk(root, "", 0)
    return "\n".join(lines)


def read_files(repo_path: str, file_paths: list[str]) -> dict[str, str]:
    """
    Read specified files from the repo.

    Returns a dict of {relative_path: file_content}.
    Skips files that don't exist or can't be read.
    """
    result = {}
    for rel_path in file_paths:
        full_path = Path(repo_path) / rel_path
        if full_path.is_file():
            try:
                content = full_path.read_text(encoding="utf-8", errors="replace")
                # Cap individual files at 12K chars to stay within LLM context
                if len(content) > 12000:
                    content = content[:12000] + "\n\n... (truncated)"
                result[rel_path] = content
            except Exception as exc:
                logger.warning("Could not read %s: %s", full_path, exc)
        else:
            logger.warning("File not found: %s", full_path)
    return result


def create_pull_request(
    repo_path: str,
    patch: str,
    pr_title: str,
    pr_body: str,
    issue_url: str,
) -> str:
    """
    Create a branch, apply the patch, commit, push, and open a PR.

    Parameters
    ----------
    repo_path : str
        Local path to the cloned repo.
    patch : str
        Unified diff from the Fixer agent.
    pr_title : str
        Title for the pull request.
    pr_body : str
        Markdown body for the pull request.
    issue_url : str
        Original issue URL (used to extract owner/repo).

    Returns
    -------
    str : URL of the created pull request.
    """
    parsed = _parse_issue_url(issue_url)
    branch_name = f"fix/issue-{parsed['number']}-{int(time.time())}"
    full_repo = f"{parsed['owner']}/{parsed['repo']}"

    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise EnvironmentError("GITHUB_TOKEN is required to create pull requests.")

    def _git(*args):
        result = subprocess.run(
            ["git"] + list(args),
            cwd=repo_path, capture_output=True, text=True, timeout=60,
        )
        if result.returncode != 0:
            raise RuntimeError(f"git {' '.join(args)} failed: {result.stderr}")
        return result.stdout.strip()

    # Configure git user for commit
    _git("config", "user.email", "bug-resolver-bot@users.noreply.github.com")
    _git("config", "user.name", "Bug Resolver Bot")

    # Create and checkout new branch
    _git("checkout", "-b", branch_name)

    # Apply the patch (uses sandbox._apply_patch logic)
    from sandbox import _apply_patch
    if not _apply_patch(repo_path, patch):
        raise RuntimeError("Failed to apply patch to repo for PR creation.")

    # Stage all changes and commit
    _git("add", "-A")
    _git("commit", "-m", f"{pr_title}\n\nResolves {issue_url}")

    # Set remote URL with token for pushing
    remote_url = f"https://x-access-token:{token}@github.com/{full_repo}.git"
    _git("remote", "set-url", "origin", remote_url)

    # Push the branch
    _git("push", "-u", "origin", branch_name)

    # Create PR via GitHub REST API
    pr_api_url = f"https://api.github.com/repos/{full_repo}/pulls"
    pr_data = {
        "title": pr_title,
        "body": pr_body,
        "head": branch_name,
        "base": "main",
    }

    logger.info("Creating PR on %s: %s", full_repo, pr_title)
    resp = requests.post(
        pr_api_url,
        json=pr_data,
        headers=_gh_headers(),
        timeout=30,
    )

    if resp.status_code == 422:
        # Might be using "master" instead of "main"
        pr_data["base"] = "master"
        resp = requests.post(
            pr_api_url, json=pr_data, headers=_gh_headers(), timeout=30,
        )

    resp.raise_for_status()
    pr_url = resp.json()["html_url"]
    logger.info("PR created: %s", pr_url)
    return pr_url

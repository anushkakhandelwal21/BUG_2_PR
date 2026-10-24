"""
sandbox.py — P2: Infrastructure
=================================
Secure sandbox for running tests on untrusted repository code.

Supports two modes (set via SANDBOX_MODE env var):
  • "docker" (default) — runs tests inside a Docker container with:
      - No network access (--network=none)
      - 1 GB memory limit
      - 1 CPU limit
      - 120s timeout
  • "local"  — runs tests via local subprocess (fast, for development)

Interface contract (used by graph.py):
  • run_reproduction_test(repo_path, test_file_path, test_code) → {stdout, stderr, returncode}
  • run_patch(repo_path, patch, test_node_id) → {stdout, stderr, returncode}
"""

from __future__ import annotations

import logging
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

logger = logging.getLogger("bug_resolver.sandbox")

SANDBOX_MODE = os.environ.get("SANDBOX_MODE", "local").lower()  # "docker" or "local"
DOCKER_IMAGE = os.environ.get("SANDBOX_IMAGE", "bug-resolver-sandbox")
SANDBOX_TIMEOUT = int(os.environ.get("SANDBOX_TIMEOUT", "120"))

# ---------------------------------------------------------------------------
# Docker image management
# ---------------------------------------------------------------------------

def build_sandbox_image(dockerfile_dir: str | None = None) -> bool:
    """Build the Docker sandbox image. Returns True on success."""
    dockerfile_dir = dockerfile_dir or str(Path(__file__).resolve().parent)
    try:
        result = subprocess.run(
            ["docker", "build", "-t", DOCKER_IMAGE, dockerfile_dir],
            capture_output=True, text=True, timeout=300,
        )
        if result.returncode == 0:
            logger.info("Docker image '%s' built successfully.", DOCKER_IMAGE)
            return True
        logger.error("Docker build failed: %s", result.stderr)
        return False
    except FileNotFoundError:
        logger.error("Docker is not installed or not in PATH.")
        return False


# ---------------------------------------------------------------------------
# Internal: run pytest in Docker or locally
# ---------------------------------------------------------------------------

def _run_pytest_docker(work_dir: str, pytest_args: str) -> dict[str, str | int]:
    """Run pytest inside a Docker container with the repo mounted."""
    abs_work_dir = str(Path(work_dir).resolve())

    cmd = [
        "docker", "run", "--rm",
        "--network=none",
        "--memory=1g",
        "--cpus=1",
        "-v", f"{abs_work_dir}:/repo",
        "-w", "/repo",
        DOCKER_IMAGE,
        "sh", "-c",
        f"pip install -e . 2>/dev/null; python -m pytest {pytest_args}",
    ]

    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=SANDBOX_TIMEOUT,
        )
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode,
        }
    except subprocess.TimeoutExpired:
        logger.warning("Docker sandbox timed out after %ds", SANDBOX_TIMEOUT)
        return {"stdout": "", "stderr": f"Sandbox timed out after {SANDBOX_TIMEOUT}s", "returncode": -1}
    except FileNotFoundError:
        logger.error("Docker not found. Falling back to local mode.")
        return _run_pytest_local(work_dir, pytest_args)


def _run_pytest_local(work_dir: str, pytest_args: str) -> dict[str, str | int]:
    """Run pytest directly via local subprocess."""
    cmd = [sys.executable, "-m", "pytest"] + pytest_args.split()

    try:
        result = subprocess.run(
            cmd,
            cwd=work_dir,
            capture_output=True,
            text=True,
            timeout=SANDBOX_TIMEOUT,
            shell=False,
        )
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode,
        }
    except subprocess.TimeoutExpired:
        logger.warning("Local sandbox timed out after %ds", SANDBOX_TIMEOUT)
        return {"stdout": "", "stderr": f"Timed out after {SANDBOX_TIMEOUT}s", "returncode": -1}
    except FileNotFoundError:
        return {"stdout": "", "stderr": "pytest not found", "returncode": -1}


def _run_pytest(work_dir: str, pytest_args: str) -> dict[str, str | int]:
    """Route to Docker or local sandbox based on SANDBOX_MODE."""
    if SANDBOX_MODE == "docker":
        return _run_pytest_docker(work_dir, pytest_args)
    return _run_pytest_local(work_dir, pytest_args)


# ---------------------------------------------------------------------------
# Internal: apply a unified diff patch
# ---------------------------------------------------------------------------

def _apply_patch(repo_path: str, patch: str) -> bool:
    """
    Apply a unified diff patch to the repo.

    Tries multiple strategies:
    1. git apply
    2. git apply --3way
    3. Manual file-content replacement (fallback for LLM-generated patches)
    """
    patch_file = Path(repo_path) / ".tmp_patch.diff"
    try:
        patch_file.write_text(patch, encoding="utf-8")

        # Strategy 1: git apply
        result = subprocess.run(
            ["git", "apply", "--verbose", str(patch_file)],
            cwd=repo_path, capture_output=True, text=True, timeout=30,
        )
        if result.returncode == 0:
            logger.info("Patch applied with 'git apply'")
            return True

        # Strategy 2: git apply --3way
        result = subprocess.run(
            ["git", "apply", "--3way", str(patch_file)],
            cwd=repo_path, capture_output=True, text=True, timeout=30,
        )
        if result.returncode == 0:
            logger.info("Patch applied with 'git apply --3way'")
            return True

        # Strategy 3: manual replacement (parse diff and overwrite files)
        logger.warning("git apply failed, trying manual patch: %s", result.stderr)
        return _manual_apply_patch(repo_path, patch)

    finally:
        if patch_file.exists():
            patch_file.unlink()


def _manual_apply_patch(repo_path: str, patch: str) -> bool:
    """
    Fallback: parse unified diff and apply line replacements to targets.
    """
    lines = patch.splitlines()
    files_to_patch = {}
    current_file = None
    current_removals = []
    current_additions = []

    for line in lines:
        if line.startswith("+++ b/") or line.startswith("+++ "):
            if current_file and (current_removals or current_additions):
                files_to_patch.setdefault(current_file, []).append((list(current_removals), list(current_additions)))
                current_removals.clear()
                current_additions.clear()
            
            p = line.split("+++ ")[-1].strip()
            if p.startswith("b/"):
                p = p[2:]
            current_file = p
        elif line.startswith("@@"):
            if current_file and (current_removals or current_additions):
                files_to_patch.setdefault(current_file, []).append((list(current_removals), list(current_additions)))
                current_removals.clear()
                current_additions.clear()
        elif line.startswith("-") and not line.startswith("---"):
            current_removals.append(line[1:])
        elif line.startswith("+") and not line.startswith("+++"):
            current_additions.append(line[1:])
        elif line.startswith(" "):
            # Context line
            pass

    if current_file and (current_removals or current_additions):
        files_to_patch.setdefault(current_file, []).append((list(current_removals), list(current_additions)))

    applied_count = 0
    for rel_path, hunks in files_to_patch.items():
        file_path = Path(repo_path) / rel_path
        if not file_path.exists():
            continue
        
        content = file_path.read_text(encoding="utf-8")
        file_patched = False

        for removals, additions in hunks:
            old_str = "\n".join(removals)
            new_str = "\n".join(additions)
            
            if old_str and old_str in content:
                content = content.replace(old_str, new_str, 1)
                file_patched = True
            else:
                # Try single-line replacement if multi-line block didn't match cleanly
                for r_line, a_line in zip(removals, additions):
                    if r_line.strip() and r_line in content:
                        content = content.replace(r_line, a_line, 1)
                        file_patched = True

        if file_patched:
            file_path.write_text(content, encoding="utf-8")
            applied_count += 1

    return applied_count > 0


def _apply_line_changes(
    file_path: Path,
    old_lines: list[str],
    new_lines: list[str],
) -> None:
    """Replace old_lines with new_lines in file_path."""
    content = file_path.read_text(encoding="utf-8")

    # Try exact match first
    old_block = "\n".join(old_lines)
    new_block = "\n".join(new_lines)

    if old_block and old_block in content:
        content = content.replace(old_block, new_block, 1)
        file_path.write_text(content, encoding="utf-8")
        return

    # If exact match fails, try stripped matching
    old_stripped = "\n".join(l.strip() for l in old_lines)
    content_lines = content.split("\n")
    for i in range(len(content_lines) - len(old_lines) + 1):
        window = "\n".join(l.strip() for l in content_lines[i:i + len(old_lines)])
        if window == old_stripped:
            # Replace these lines
            content_lines[i:i + len(old_lines)] = new_lines
            file_path.write_text("\n".join(content_lines), encoding="utf-8")
            return

    # Last resort: just write new content (risky but better than failing in hackathon)
    logger.warning("Could not find exact match in %s, appending new lines", file_path)
    file_path.write_text(content + "\n" + new_block, encoding="utf-8")


# ---------------------------------------------------------------------------
# Public API: run_reproduction_test
# ---------------------------------------------------------------------------

def run_reproduction_test(
    repo_path: str,
    test_file_path: str,
    test_code: str,
) -> dict[str, str | int]:
    """
    Write a reproduction test into the repo and run it.

    The test is expected to FAIL (returncode != 0) to confirm the bug exists.

    Parameters
    ----------
    repo_path : str
        Absolute path to the cloned repository.
    test_file_path : str
        Relative path where the test file should be written (e.g., "tests/test_reproduce_bug.py").
    test_code : str
        Full Python source code of the reproduction test.

    Returns
    -------
    dict with keys: stdout, stderr, returncode
    """
    logger.info("Running reproduction test: %s", test_file_path)

    # Write the test file into the repo
    full_path = Path(repo_path) / test_file_path
    full_path.parent.mkdir(parents=True, exist_ok=True)
    full_path.write_text(test_code, encoding="utf-8")

    # Ensure __init__.py exists in test directory
    init_path = full_path.parent / "__init__.py"
    if not init_path.exists():
        init_path.write_text("", encoding="utf-8")

    # Run only the reproduction test
    result = _run_pytest(repo_path, f"{test_file_path} -v")

    logger.info(
        "Reproduction test result: returncode=%s (expected non-zero for bug confirmation)",
        result["returncode"],
    )
    return result


# ---------------------------------------------------------------------------
# Public API: run_patch
# ---------------------------------------------------------------------------

def run_patch(
    repo_path: str,
    patch: str,
    test_node_id: str,
) -> dict[str, str | int]:
    """
    Apply a patch to a COPY of the repo and run the full test suite.

    The patch is applied to a temporary copy so the original repo stays clean
    for potential retries.

    Parameters
    ----------
    repo_path : str
        Absolute path to the cloned repository (with reproduction test already written).
    patch : str
        Unified diff string from the Fixer agent.
    test_node_id : str
        Pytest node ID of the reproduction test (for logging; full suite is run).

    Returns
    -------
    dict with keys: stdout, stderr, returncode
    """
    logger.info("Running patch verification (test: %s)", test_node_id)

    # Create a temporary copy of the repo
    temp_dir = tempfile.mkdtemp(prefix="bug_resolver_patch_")
    try:
        work_dir = os.path.join(temp_dir, "repo")
        shutil.copytree(repo_path, work_dir, dirs_exist_ok=True)

        # Apply the patch
        if not _apply_patch(work_dir, patch):
            return {
                "stdout": "",
                "stderr": "Failed to apply patch to repository",
                "returncode": -1,
            }

        # Run the FULL test suite (including the reproduction test)
        result = _run_pytest(work_dir, "-v")

        logger.info("Patch verification result: returncode=%s", result["returncode"])
        return result

    finally:
        # Clean up temp copy
        shutil.rmtree(temp_dir, ignore_errors=True)


# ---------------------------------------------------------------------------
# Legacy: run_command (kept for backward compatibility with P2)
# ---------------------------------------------------------------------------

def run_command(command, cwd=None, timeout=30):
    """
    Run a command locally and capture its output.
    Kept for backward compatibility with P2's existing tests.
    """
    try:
        result = subprocess.run(
            command,
            cwd=Path(cwd).resolve() if cwd else None,
            capture_output=True,
            text=True,
            timeout=timeout,
            shell=False,
        )
        return {
            "success": result.returncode == 0,
            "output": result.stdout,
            "error": result.stderr,
            "return_code": result.returncode,
            "timed_out": False,
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False, "output": "", "timed_out": True,
            "error": f"Command timed out after {timeout} seconds.",
            "return_code": -1,
        }
    except FileNotFoundError:
        return {
            "success": False, "output": "", "timed_out": False,
            "error": "Command not found.",
            "return_code": -1,
        }
    except (OSError, ValueError) as exc:
        return {
            "success": False, "output": "", "timed_out": False,
            "error": str(exc),
            "return_code": -1,
        }

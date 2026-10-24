
import ast
import shutil
import subprocess
import sys
from pathlib import Path

from ai_engine import analyze_issue


PROJECT_DIR = Path(__file__).resolve().parent
TARGET_FILE = PROJECT_DIR / "demo_bug.py"
TEST_FILE = PROJECT_DIR / "tests" / "test_demo_bug.py"
BACKUP_FILE = PROJECT_DIR / "demo_bug.py.backup"


def apply_and_verify_fix(issue, test_output="", test_error=""):
    """Apply an AI proposal to the demo file and verify it with tests."""

    if not TARGET_FILE.is_file() or not TEST_FILE.is_file():
        return {
            "success": False,
            "message": "Demo source or focused test file not found."
        }

    original_code = TARGET_FILE.read_text(encoding="utf-8")

    diagnosis = analyze_issue(
        issue=issue,
        test_output=test_output,
        test_error=test_error,
        source_code=original_code
    )

    if not diagnosis.get("success"):
        return {
            "success": False,
            "message": "AI diagnosis failed.",
            "details": diagnosis.get("error", "Unknown error")
        }

    parsed = diagnosis.get("parsed_analysis")
    if not isinstance(parsed, dict):
        return {
            "success": False,
            "message": "AI response was not valid JSON."
        }

    proposed_fix = parsed.get("proposed_fix")
    if not isinstance(proposed_fix, dict):
        return {
            "success": False,
            "message": "AI did not provide a structured proposed fix."
        }

    new_code = proposed_fix.get("code")
    if not isinstance(new_code, str) or not new_code.strip():
        return {
            "success": False,
            "message": "AI did not provide replacement code."
        }

    try:
        tree = ast.parse(new_code)
    except SyntaxError as exc:
        return {
            "success": False,
            "message": "AI proposal has invalid Python syntax.",
            "details": str(exc)
        }

    # Restrict the proposal to the expected function.
    functions = [
        node for node in tree.body
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    ]
    if len(functions) != 1 or functions[0].name != "calculate_average":
        return {
            "success": False,
            "message": "Proposal must contain only calculate_average()."
        }

    if BACKUP_FILE.exists():
        return {
            "success": False,
            "message": "Backup already exists. Resolve it before retrying."
        }

    shutil.copy2(TARGET_FILE, BACKUP_FILE)

    try:
        TARGET_FILE.write_text(new_code.rstrip() + "\n", encoding="utf-8")

        result = subprocess.run(
            [
                sys.executable, "-m", "pytest",
                str(TEST_FILE), "-v"
            ],
            cwd=str(PROJECT_DIR),
            capture_output=True,
            text=True,
            timeout=60,
            shell=False
        )

        if result.returncode == 0:
            BACKUP_FILE.unlink()
            return {
                "success": True,
                "message": "Proposed fix passed focused tests.",
                "test_output": result.stdout,
                "test_error": result.stderr,
                "ai_analysis": parsed
            }

        shutil.copy2(BACKUP_FILE, TARGET_FILE)
        return {
            "success": False,
            "message": "Tests failed; original source restored.",
            "test_output": result.stdout,
            "test_error": result.stderr
        }

    except (OSError, subprocess.TimeoutExpired) as exc:
        shutil.copy2(BACKUP_FILE, TARGET_FILE)
        return {
            "success": False,
            "message": "Verification failed; original source restored.",
            "details": type(exc).__name__
        }

    finally:
        if BACKUP_FILE.exists():
            BACKUP_FILE.unlink()


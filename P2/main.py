

import sys
from pathlib import Path

from sandbox import run_command
from recorder import save_run


PROJECT_DIR = Path(__file__).resolve().parent


def main():
    print("P2 - Autonomous Bug Resolution")
    print("Running project verification...")

    result = run_command(
        [
            sys.executable,
            "-m",
            "pytest",
            "tests/",
            "-v"
        ],
        cwd=PROJECT_DIR,
        timeout=60
    )

    status = "passed" if result["success"] else (
        "timeout" if result.get("timed_out", False) else "failed"
    )

    record_path = save_run({
        "status": status,
        "module": "P2 infrastructure",
        "command": "pytest tests/ -v",
        "output": result["output"],
        "error": result["error"],
        "return_code": result["return_code"]
    })

    print("\n--- Verification Result ---")
    print(f"Status: {status.upper()}")
    print(result["output"])

    if result["error"]:
        print("Errors:")
        print(result["error"])

    print(f"\nRun record saved: {record_path}")

    return 0 if result["success"] else 1


if __name__ == "__main__":
    raise SystemExit(main())


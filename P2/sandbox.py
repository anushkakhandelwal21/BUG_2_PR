
import subprocess
from pathlib import Path


def run_command(command, cwd=None, timeout=30):
    """
    Run a command locally and capture its output.

    Note: This is a local command runner, NOT a secure sandbox.
    Do not use it to execute untrusted code.
    """
    try:
        result = subprocess.run(
            command,
            cwd=Path(cwd).resolve() if cwd else None,
            capture_output=True,
            text=True,
            timeout=timeout,
            shell=False
        )

        return {
            "success": result.returncode == 0,
            "output": result.stdout,
            "error": result.stderr,
            "return_code": result.returncode,
            "timed_out": False
        }

    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "output": "",
            "error": f"Command timed out after {timeout} seconds.",
            "return_code": -1,
            "timed_out": True
        }

    except FileNotFoundError:
        return {
            "success": False,
            "output": "",
            "error": "Command not found. Check that it is installed.",
            "return_code": -1,
            "timed_out": False
        }

    except (OSError, ValueError) as exc:
        return {
            "success": False,
            "output": "",
            "error": str(exc),
            "return_code": -1,
            "timed_out": False
        }


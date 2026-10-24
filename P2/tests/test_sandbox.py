
import sys
from sandbox import run_command


def test_python_command():
    result = run_command([
        sys.executable,
        "-c",
        "print('Sandbox test successful')"
    ])

    assert result["success"] is True
    assert "Sandbox test successful" in result["output"]
    assert result["return_code"] == 0
    assert result["timed_out"] is False


def test_failed_command():
    result = run_command([
        sys.executable,
        "-c",
        "raise SystemExit(1)"
    ])

    assert result["success"] is False
    assert result["return_code"] == 1


def test_timeout():
    result = run_command(
        [
            sys.executable,
            "-c",
            "import time; time.sleep(3)"
        ],
        timeout=1
    )

    assert result["success"] is False
    assert result["timed_out"] is True
    assert "timed out" in result["error"].lower()


def test_missing_command():
    result = run_command(["command_that_does_not_exist_12345"])

    assert result["success"] is False
    assert result["return_code"] == -1
    assert result["timed_out"] is False


if __name__ == "__main__":
    test_python_command()
    test_failed_command()
    test_timeout()
    test_missing_command()
    print("All sandbox tests passed!")


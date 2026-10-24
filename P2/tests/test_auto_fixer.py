
from unittest.mock import patch

from auto_fixer import apply_and_verify_fix


def test_rejects_invalid_ai_response():
    with patch(
        "auto_fixer.analyze_issue",
        return_value={
            "success": True,
            "parsed_analysis": {
                "proposed_fix": {
                    "code": "this is not valid python !!!"
                }
            }
        },
    ):
        result = apply_and_verify_fix(
            issue={"number": 1, "title": "Test"},
            test_output="failed",
        )

    assert result["success"] is False
    assert "syntax" in result["message"].lower()


def test_rejects_unexpected_function():
    with patch(
        "auto_fixer.analyze_issue",
        return_value={
            "success": True,
            "parsed_analysis": {
                "proposed_fix": {
                    "code": "def delete_everything():\n    pass\n"
                }
            }
        },
    ):
        result = apply_and_verify_fix(
            issue={"number": 1, "title": "Test"},
            test_output="failed",
        )

    assert result["success"] is False
    assert "calculate_average" in result["message"]


from pathlib import Path
from unittest.mock import patch

import auto_fixer


def test_restores_original_file_when_fix_fails(tmp_path, monkeypatch):
    target_file = tmp_path / "demo_bug.py"
    test_file = tmp_path / "test_demo_bug.py"
    backup_file = tmp_path / "demo_bug.py.backup"

    original_code = (
        "def calculate_average(numbers):\n"
        "    return sum(numbers) / len(numbers)\n"
    )
    target_file.write_text(original_code, encoding="utf-8")
    test_file.write_text("# simulated test file\n", encoding="utf-8")

    monkeypatch.setattr(auto_fixer, "TARGET_FILE", target_file)
    monkeypatch.setattr(auto_fixer, "TEST_FILE", test_file)
    monkeypatch.setattr(auto_fixer, "BACKUP_FILE", backup_file)

    ai_response = {
        "success": True,
        "parsed_analysis": {
            "proposed_fix": {
                "code": (
                    "def calculate_average(numbers):\n"
                    "    if not numbers:\n"
                    "        return 0\n"
                    "    return sum(numbers) / len(numbers)\n"
                ),
                "explanation": "Handle empty lists",
            }
        },
    }

    with patch("auto_fixer.analyze_issue", return_value=ai_response), \
         patch("auto_fixer.subprocess.run") as mock_run:

        mock_run.return_value.returncode = 1
        mock_run.return_value.stdout = "Tests failed"
        mock_run.return_value.stderr = ""

        result = auto_fixer.apply_and_verify_fix(
            issue={"number": 1, "title": "Rollback test"},
            test_output="Initial tests failed",
        )

    assert result["success"] is False
    assert target_file.read_text(encoding="utf-8") == original_code
    assert not backup_file.exists()


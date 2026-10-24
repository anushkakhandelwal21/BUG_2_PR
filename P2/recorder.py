
import json
from datetime import datetime, timezone
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
RECORDS_DIR = BASE_DIR / "runs"


def save_run(data):
    """
    Save execution details as a JSON file.
    Returns the path of the saved record.
    """
    RECORDS_DIR.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(timezone.utc)

    record = {
        "timestamp": timestamp.isoformat(),
        "status": data.get("status", "unknown"),
        "data": data
    }

    filename = RECORDS_DIR / (
        f"run_{timestamp.strftime('%Y%m%d_%H%M%S_%f')}.json"
    )

    with filename.open("w", encoding="utf-8") as file:
        json.dump(record, file, indent=2, ensure_ascii=False)

    return str(filename)


def read_run(filepath):
    """Read a saved execution record."""
    path = Path(filepath)

    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


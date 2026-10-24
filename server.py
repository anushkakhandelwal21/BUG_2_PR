"""
server.py — Bug2PR Backend API Server
======================================
Serves the autonomous bug-resolution engine and saved execution records
to the Bug2PR Vite frontend.

Endpoints:
  GET  /api/health      - System health & credential diagnostics
  GET  /api/runs        - List all saved execution records from recorder.py
  GET  /api/records     - Raw list of JSON run records
  GET  /api/runs/<id>   - Retrieve a specific execution record by run_id
  POST /api/runs        - Submit a real GitHub issue URL to run the pipeline
"""

from __future__ import annotations

import json
import logging
import os
import shutil
import sys
import time
from pathlib import Path
from typing import Any, Optional

# Load environment
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from flask import Flask, jsonify, request
from flask_cors import CORS

import gh
import graph
import recorder

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("bug_resolver.server")

app = Flask("bug2pr_api")
CORS(app)

BASE_DIR = Path(__file__).resolve().parent
RUNS_DIR = BASE_DIR / "runs"


def _find_run_by_id(run_id: str) -> Optional[dict[str, Any]]:
    """Scan RUNS_DIR for a run matching the given run_id."""
    if not RUNS_DIR.exists():
        return None

    clean_id = run_id.strip()
    for file in sorted(RUNS_DIR.glob("run_*.json"), reverse=True):
        try:
            with file.open("r", encoding="utf-8") as f:
                data = json.load(f)
                if data.get("run_id") == clean_id or clean_id in file.name:
                    return data
        except Exception:
            continue
    return None


@app.route("/api/health", methods=["GET"])
def get_health():
    """Honest credential and system status checks."""
    groq_key = os.environ.get("GROQ_API_KEY", "")
    gemini_key = os.environ.get("GEMINI_API_KEY", "")
    gh_token = os.environ.get("GITHUB_TOKEN", "")

    total_runs = len(list(RUNS_DIR.glob("run_*.json"))) if RUNS_DIR.exists() else 0

    return jsonify({
        "status": "healthy",
        "service": "Bug2PR Autonomous Engine API",
        "repository": "https://github.com/anushkakhandelwal21/BUG_2_PR",
        "tagline": "From Issue to Verified PR",
        "credentials": {
            "llmConfigured": bool(groq_key or gemini_key),
            "groqConfigured": bool(groq_key),
            "geminiConfigured": bool(gemini_key),
            "githubConfigured": bool(gh_token),
        },
        "recordsDirectory": str(RUNS_DIR),
        "totalRunsRecorded": total_runs,
    })


@app.route("/api/runs", methods=["GET"])
def get_runs():
    """Return all recorded runs from the runs/ directory."""
    if not RUNS_DIR.exists():
        return jsonify([])

    records = []
    for file in sorted(RUNS_DIR.glob("run_*.json"), reverse=True):
        try:
            with file.open("r", encoding="utf-8") as f:
                records.append(json.load(f))
        except Exception as exc:
            logger.warning("Error reading %s: %s", file, exc)
            continue
    return jsonify(records)


@app.route("/api/records", methods=["GET"])
def get_records():
    """Alias for /api/runs returning raw execution records."""
    return get_runs()


@app.route("/api/runs/<run_id>", methods=["GET"])
def get_run_details(run_id: str):
    """Retrieve full execution record by run_id."""
    record = _find_run_by_id(run_id)
    if not record:
        return jsonify({"error": f"Run record '{run_id}' not found"}), 404
    return jsonify(record)


@app.route("/api/runs", methods=["POST"])
def submit_run():
    """
    Execute the Bug2PR autonomous pipeline on a real GitHub issue URL.
    Saves the final immutable record to runs/ and returns the full record.
    """
    body = request.get_json(force=True, silent=True) or {}
    issue_url = (body.get("issueUrl") or "").strip()

    if not issue_url.startswith("https://github.com/"):
        return jsonify({
            "error": "Invalid issue URL. Must be in format https://github.com/owner/repo/issues/N"
        }), 400

    start_time = time.time()
    logger.info("Starting Bug2PR pipeline for issue: %s", issue_url)

    # 1. Check LLM configuration
    groq_key = os.environ.get("GROQ_API_KEY", "")
    gemini_key = os.environ.get("GEMINI_API_KEY", "")
    if not groq_key and not gemini_key:
        return jsonify({
            "error": "Missing LLM API key. Set GROQ_API_KEY or GEMINI_API_KEY in backend environment before starting pipeline."
        }), 503

    # 2. Fetch issue metadata
    try:
        issue = gh.fetch_issue(issue_url)
    except Exception as exc:
        logger.error("Failed to fetch issue from GitHub: %s", exc)
        return jsonify({"error": f"Failed to fetch issue from GitHub: {exc}"}), 400

    # 3. Clone repository
    try:
        repo_path = gh.clone_repo(issue_url, target_dir=str(BASE_DIR / "repos"))
    except Exception as exc:
        logger.error("Failed to clone repository: %s", exc)
        return jsonify({"error": f"Failed to clone repository: {exc}"}), 500

    # 4. Build file tree
    file_tree = gh.get_file_tree(repo_path)

    # 5. Execute multi-agent state machine
    try:
        final_state = graph.run_pipeline(
            issue_url=issue_url,
            issue_title=issue.get("title", "GitHub Issue"),
            issue_body=issue.get("body", ""),
            repo_path=repo_path,
            file_tree=file_tree,
        )
    except Exception as exc:
        logger.exception("Pipeline crashed: %s", exc)
        return jsonify({"error": f"Pipeline crashed during execution: {exc}"}), 500

    # 6. Save execution record
    saved_path = recorder.save_run(
        final_state=final_state,
        issue_url=issue_url,
        start_time=start_time,
    )
    logger.info("Saved run record to %s", saved_path)

    # Also copy record to Vite public/records so Vite static fallback is kept synchronized
    for target_dir in [
        BASE_DIR / "frontend" / "public" / "records",
        BASE_DIR.parent / "patchpilot" / "public" / "records",
    ]:
        try:
            if target_dir.exists():
                shutil.copy(saved_path, target_dir / Path(saved_path).name)
                all_files = [f.name for f in sorted(target_dir.glob("run_*.json"), reverse=True)]
                with (target_dir / "index.json").open("w", encoding="utf-8") as idx_f:
                    json.dump(all_files, idx_f, indent=2)
        except Exception as exc:
            logger.warning("Could not sync record to %s: %s", target_dir, exc)

    return jsonify(recorder.read_run(saved_path)), 201


if __name__ == "__main__":
    print("=" * 60)
    print("  Bug2PR Backend API Server")
    print("  Tagline: From Issue to Verified PR")
    print("  Serving at: http://127.0.0.1:8000")
    print("=" * 60)
    app.run(host="127.0.0.1", port=8000, debug=False)

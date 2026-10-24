"""
server.py — Bug2PR FastAPI Backend Server
===========================================
High-performance asynchronous API server serving the Bug2PR autonomous
resolution engine and execution records to the React/Vite frontend.

Endpoints:
  GET  /api/health       - System health & credential diagnostics
  GET  /api/runs         - List all recorded runs from runs/
  GET  /api/records      - Alias for /api/runs (raw execution records)
  GET  /api/runs/{run_id}- Retrieve full execution record by run_id
  POST /api/runs         - Submit a GitHub issue URL to run the pipeline
"""

from __future__ import annotations

import json
import logging
import os
import shutil
import time
from pathlib import Path
from typing import Any, Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import uvicorn
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import gh
import graph
import recorder

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("bug_resolver.fastapi")

app = FastAPI(
    title="Bug2PR Autonomous Engine API",
    description="High-performance backend for autonomous bug resolution and PR synthesis",
    version="2.0.0",
)

# Enable CORS for the Vite development server (localhost:5173) and any deployed frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


class RunSubmission(BaseModel):
    issueUrl: str = Field(..., description="Target GitHub Issue URL")
    targetBranch: Optional[str] = Field("main", description="Target base branch")
    maxRetries: Optional[int] = Field(4, description="Maximum self-repair retry loops")


@app.get("/api/health")
def get_health():
    """System health, environment credentials check, and trace counts."""
    groq_key = os.environ.get("GROQ_API_KEY", "")
    gh_token = os.environ.get("GITHUB_TOKEN", "")
    total_runs = len(list(RUNS_DIR.glob("run_*.json"))) if RUNS_DIR.exists() else 0

    return {
        "status": "healthy",
        "service": "Bug2PR FastAPI Engine",
        "repository": "https://github.com/anushkakhandelwal21/BUG_2_PR",
        "tagline": "From Issue to Verified PR",
        "credentials": {
            "llmConfigured": bool(groq_key),
            "groqConfigured": bool(groq_key),
            "githubConfigured": bool(gh_token),
        },
        "recordsDirectory": str(RUNS_DIR),
        "totalRunsRecorded": total_runs,
    }


@app.get("/api/runs")
def get_runs():
    """Retrieve all recorded runs sorted by timestamp descending."""
    if not RUNS_DIR.exists():
        return []

    records = []
    for file in sorted(RUNS_DIR.glob("run_*.json"), reverse=True):
        try:
            with file.open("r", encoding="utf-8") as f:
                records.append(json.load(f))
        except Exception as exc:
            logger.warning("Error reading %s: %s", file, exc)
            continue
    return records


@app.get("/api/records")
def get_records():
    """Alias for /api/runs returning raw execution traces for Vite frontend."""
    return get_runs()


@app.get("/api/runs/{run_id}")
def get_run_details(run_id: str):
    """Retrieve full execution record details by run_id."""
    record = _find_run_by_id(run_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Run record '{run_id}' not found",
        )
    return record


@app.post("/api/runs", status_code=status.HTTP_201_CREATED)
def submit_run(payload: RunSubmission):
    """
    Execute the Bug2PR autonomous pipeline on a real GitHub issue URL.
    Saves the final immutable record to runs/ and returns the full JSON record.
    """
    issue_url = payload.issueUrl.strip()

    if not issue_url.startswith("https://github.com/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid issue URL. Must follow format https://github.com/owner/repo/issues/N",
        )

    start_time = time.time()
    logger.info("FastAPI triggered pipeline for issue: %s", issue_url)

    # 1. Check LLM configuration
    groq_key = os.environ.get("GROQ_API_KEY", "")
    if not groq_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Missing GROQ_API_KEY. Configure .env with your Groq API key before triggering runs.",
        )

    # 2. Fetch issue metadata
    try:
        issue = gh.fetch_issue(issue_url)
    except Exception as exc:
        logger.error("Failed to fetch issue from GitHub: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch issue from GitHub: {exc}",
        )

    # 3. Clone repository
    try:
        repo_path = gh.clone_repo(issue_url, target_dir=str(BASE_DIR / "repos"))
    except Exception as exc:
        logger.error("Failed to clone repository: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clone repository: {exc}",
        )

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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pipeline crashed during execution: {exc}",
        )

    # 6. Save execution record
    saved_path = recorder.save_run(
        final_state=final_state,
        issue_url=issue_url,
        start_time=start_time,
    )
    logger.info("Saved run record to %s", saved_path)

    # Synchronize to Vite static public directories if they exist
    for target_dir in [
        BASE_DIR / "frontend" / "public" / "records",
        BASE_DIR.parent / "temp_frontend_check" / "frontend" / "public" / "records",
    ]:
        try:
            if target_dir.exists():
                shutil.copy(saved_path, target_dir / Path(saved_path).name)
                all_files = [f.name for f in sorted(target_dir.glob("run_*.json"), reverse=True)]
                with (target_dir / "index.json").open("w", encoding="utf-8") as idx_f:
                    json.dump(all_files, idx_f, indent=2)
        except Exception as exc:
            logger.warning("Could not sync record to %s: %s", target_dir, exc)

    return recorder.read_run(saved_path)


if __name__ == "__main__":
    print("=" * 60)
    print("  Bug2PR FastAPI Server")
    print("  Serving at: http://127.0.0.1:8000")
    print("  Docs:       http://127.0.0.1:8000/docs")
    print("=" * 60)
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")

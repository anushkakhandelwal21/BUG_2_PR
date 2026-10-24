# Fixtrail P3 — Dashboard & Replay Integration Contracts

This document formalizes the public interfaces and schemas for integrating **P1 (Agent Core)** and **P2 (Sandbox & Recorder)** with **P3 (Dashboard & Replay)**.

---

## 1. P1: Live Agent Event Interface

P3 observes the execution pipeline across 5 canonical stages without managing agents directly:

1. **`triage`**: Ingestion of defect report, stack trace extraction, candidate symbol identification.
2. **`reproducer`**: Generation and execution of an automated baseline test confirming failure (**RED**) on unmodified master.
3. **`fixer`**: Synthesis and application of a minimal defensive patch to the isolated worktree.
4. **`verifier`**: Container sandbox execution of the regression test and full repository test matrix.
5. **`pull_request`**: Pull request composition and delivery only when the verification invariant is satisfied.

### Event Format

When emitting streaming events or polling endpoints, P1 should emit events conforming to:

```json
{
  "id": "ev-unique-id",
  "timestamp": "14:15:32",
  "stage": "triage | reproducer | fixer | verifier | pull_request",
  "status": "pending | running | passed | failed | retrying | blocked",
  "agent": "Triage Agent | Reproducer Agent | Fixer Agent | Verifier Agent | Pull Request Agent",
  "message": "Human-readable action description",
  "stdout": "Optional stdout chunk",
  "stderr": "Optional stderr or traceback chunk",
  "test_results": {
    "total_tests": 86,
    "passed_count": 86,
    "failed_count": 0,
    "skipped_count": 0,
    "duration_ms": 3120
  }
}
```

---

## 2. P2: Recorder JSON Schema (`recorder.py`)

Recorded runs saved to `records/*.json` must conform to the following schema to support deterministic replay in P3:

```json
{
  "run_id": "run_rec_xxxx",
  "recorded_at": "2026-10-24T14:15:30Z",
  "recorder_version": "1.2.0",
  "issue": {
    "number": 5129,
    "title": "Bug description",
    "url": "https://github.com/owner/repo/issues/5129",
    "repository": "owner/repo"
  },
  "final_status": "verified | failed | blocked | running",
  "duration_seconds": 184,
  "events": [
    {
      "id": "ev-01",
      "timestamp": "14:15:32",
      "stage": "triage",
      "status": "passed",
      "agent": "Triage Agent",
      "message": "Analyzed defect stack trace",
      "stdout": "stdout logs...",
      "stderr": "stderr if any..."
    }
  ],
  "diffs": [
    {
      "filename": "lib/modified_file.js",
      "status": "modified",
      "additions": 8,
      "deletions": 2,
      "isRegressionTest": false,
      "unifiedDiff": "@@ -140,8 +140,14 @@ ...\n+added line\n-removed line"
    }
  ],
  "verification": {
    "status": "verified_passed | verification_failed | blocked | unverified",
    "baselineReproduced": true,
    "baselineFailedTest": "test/baseline.test.js",
    "baselineFailureMessage": "TypeError: Cannot read properties of undefined",
    "postFixPassed": true,
    "totalTests": 86,
    "passedCount": 86,
    "failedCount": 0,
    "skippedCount": 0,
    "executionDurationMs": 3120,
    "attemptNumber": 1,
    "maxAttempts": 3
  },
  "pull_request": {
    "title": "fix(scope): resolved issue (#123)",
    "branchName": "fixtrail/fix-issue-123",
    "baseBranch": "master",
    "prNumber": 124,
    "url": "https://github.com/owner/repo/pull/124",
    "status": "ready",
    "bodyMarkdown": "Markdown description of changes..."
  }
}
```

---

## 3. P3 API Endpoints (`dashboard.py`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/status` | Backend health, record count, and active configuration. |
| `GET` | `/api/runs` | Returns all active and historical runs. |
| `GET` | `/api/runs/:id` | Returns run details by `run_id`. |
| `POST` | `/api/runs` | Ingests a new issue URL and dispatches the pipeline. |
| `POST` | `/api/runs/:id/cancel` | Halts execution of an in-progress pipeline. |
| `GET` | `/api/records` | Lists all saved JSON run records from `/records`. |
| `GET` | `/api/records/:filename` | Returns a specific historical run record. |

---

## 4. Invariant Rules Enforced by P3

1. **No Speculative Progress**: Stages are only marked complete when backed by actual events. Time elapsed never advances a stage automatically.
2. **Untrusted Diff Rendering**: Diff content is strictly parsed as plain text and rendered without script execution or raw HTML injection.
3. **Deterministic Replay**: Replaying a saved record reconstructs timeline, logs, diffs, and verification metrics purely from the recorded event stream, without re-executing agents or invoking Docker.
4. **Honest Empty States**: If logs, diffs, or records are missing or uncaptured, P3 clearly displays an honest "Not captured" notice rather than manufacturing fake data.

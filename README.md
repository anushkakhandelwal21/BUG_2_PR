# P1: Agent Brain — Autonomous Bug Resolver

This directory contains the core intelligence, prompts, model routing, and state machine orchestration for the autonomous bug resolution pipeline.

---

## 📁 Architecture & File Layout

| File | Role | Description |
|---|---|---|
| [`prompts.py`](file:///c:/Users/bhema/antigravity/SIH/bug_resolver/prompts.py) | **Agent Prompts** | System prompts, few-shot examples, and JSON-output contracts for Triage, Reproducer, Fixer, and Verifier. |
| [`llm.py`](file:///c:/Users/bhema/antigravity/SIH/bug_resolver/llm.py) | **Gemini Engine** | Model routing (Fast `gemini-2.0-flash` vs Smart `gemini-2.5-pro`), SHA-256 prompt caching, self-repair retries, and output schema validation. |
| [`graph.py`](file:///c:/Users/bhema/antigravity/SIH/bug_resolver/graph.py) | **State Machine Orchestrator** | Multi-agent state graph, retry loop (up to max 4 attempts), event bus for P3, and P2 sandbox/GitHub integration points. |
| [`smoke_test.py`](file:///c:/Users/bhema/antigravity/SIH/bug_resolver/smoke_test.py) | **Smoke Verification** | Validates syntax, prompt builders, JSON extraction, and cache round-trips. |
| [`test_pipeline_e2e.py`](file:///c:/Users/bhema/antigravity/SIH/bug_resolver/test_pipeline_e2e.py) | **E2E Simulation Tests** | Tests zero-retry happy path, retry recovery, and max-retry exhaustion. |

---

## 🔄 Agent Workflow & Loop

```
[GitHub Issue] 
      │
      ▼
   Triage  (Gemini 2.0 Flash)
      │
      ▼
 Reproducer (Gemini 2.5 Pro) ──► Docker Sandbox (fails test)
      │
      ▼
 ┌──► Fixer (Gemini 2.5 Pro)
 │    │
 │    ▼
 │   Verifier (Gemini 2.0 Flash) ──► Docker Sandbox (runs pytest)
 │    │
 └─── No (tests fail, max 4 retries)
      │
      Yes (green)
      ▼
  Pull Request (Diff, Proof & Explanation)
```

---

## 🤝 Interfaces with Other Roles

- **P2 (Infra & GitHub):**
  - Calls `sandbox.run_reproduction_test()` and `sandbox.run_patch()`.
  - Calls `gh.create_pull_request()`.
  - Graceful stubs are built in when running in non-Docker testing environments.
- **P3 (Dashboard & Replay):**
  - Imports `from graph import event_bus`.
  - Consumes live events: `triage`, `reproducer`, `fixer`, `verifier`, `retry`, `pr`, `pipeline`.
- **P4 (Evaluation & Benchmarks):**
  - Runs `run_pipeline(issue_url, issue_title, issue_body, repo_path, file_tree)` across the 8–10 benchmark repos.
  - Returns `AgentState` containing diffs, retry history, and execution metrics.

---

## 🚀 Quickstart & Verification

```powershell
cd bug_resolver

# Run smoke test
python smoke_test.py

# Run E2E pipeline unit tests
python test_pipeline_e2e.py
```

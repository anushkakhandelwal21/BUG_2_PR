# 🤖 Bug-to-PR Agent

> *"Copilot suggests code. We ship verified fixes."*

[![Autonomous Resolution](https://img.shields.io/badge/Verification-Test--First-brightgreen.svg)](#-what-makes-us-different)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://www.python.org/)
[![LLM: Groq](https://img.shields.io/badge/LLM-Groq%20Llama%203.3%20%2F%20GPT--OSS-orange.svg)](https://groq.com/)

An autonomous multi-agent software engineering system that takes a **GitHub Issue URL** and outputs a **fully verified Pull Request**—guaranteed by an automated regression test written *before* the fix is authored.

Built for the **IIT Roorkee "Syntax Error" Hackathon 2026**.

---

## ⚡ Live Verification in Numbers

Our pipeline is evaluated on real seeded bugs and benchmarked against execution speed and test integrity:

| Benchmark Issue | Target Bug | Diagnosis & Proof | Resolution Time | Retries | Verified PR |
|---|---|---|---|---|---|
| **[Issue #1](https://github.com/Trident1211/Demo-buggy-repo/issues/1)** | Pagination drops last page element | ✅ Reproducing test written & failed | **13.08s** | 0 | **[PR #3](https://github.com/Trident1211/Demo-buggy-repo/pull/3)** |
| **[Issue #2](https://github.com/Trident1211/Demo-buggy-repo/issues/2)** | Discount $>100\%$ produces negative price | ✅ Reproducing test written & failed | **12.75s** | 0 | **[PR #4](https://github.com/Trident1211/Demo-buggy-repo/pull/4)** |

---

## 💡 The Problem

Software maintainers and agile engineering teams are inundated with bug reports. While modern LLM tools suggest plausible patches, **they do not prove them**:
- They don't reproduce the bug in an isolated environment.
- They don't verify that the fix actually eliminates the failure.
- They don't ensure that existing features didn't silently regress.
- **Humans are still forced to verify and test everything manually.**

---

## 🏆 What Makes Us Different

AI that writes code is not new. **Our differentiator is how we prove it:**

1. **Test-First Verification:** A failing regression test is generated and proven to fail in the sandbox *before* any patch is written. The regression test ships inside the PR as permanent proof.
2. **Honest Failure (Zero Hallucinated PRs):** If the agent fails to reproduce the bug or fails the test suite after maximum attempts, it **stops and reports honestly**. No fake, half-baked PRs are ever opened.
3. **Safe by Design:** Code and tests run in an isolated execution sandbox (`SANDBOX_MODE=docker` or `local`), preventing network access during test runs and restricting file writes strictly to the target repository.
4. **Offline Replay Mode for Judges:** Every single run emits an immutable trace to `runs/*.json`. Judges can explore every decision, test failure trace, and unified diff locally **without entering an API key**.

---

## 🔄 Multi-Agent Architecture

The resolution engine is designed as an event-driven state machine:

```mermaid
flowchart TD
    START([GitHub Issue URL]) --> SETUP[Fetch Issue & Clone Repo]
    SETUP --> TRIAGE[Agent 1: Triage<br><i>Fast Model</i>]
    TRIAGE --> REPRO[Agent 2: Reproducer<br><i>Reasoning Model</i>]
    
    subgraph Sandbox Gate
        REPRO --> REPRO_TEST[Run Pytest in Sandbox]
        REPRO_TEST -->|Test Failed ✅<br>Bug Proven| FIXER[Agent 3: Fixer<br><i>Reasoning Model</i>]
        REPRO_TEST -->|Test Passed ❌<br>Cannot Prove Bug| ABORT([Honest Exit: Not Confirmed])
    end

    subgraph Verification Loop [Max 4 Attempts]
        FIXER --> VERIFY[Agent 4: Verifier<br><i>Runs Full Test Suite in Sandbox</i>]
        VERIFY -->|Tests Fail| RETRY{Retries Left?}
        RETRY -->|Yes| FIXER
        RETRY -->|No| FAILED([Honest Exit: Unresolved])
    end

    VERIFY -->|100% Green ✅| PR_AGENT[Git Branch, Commit & Open PR]
    PR_AGENT --> END([Verified Pull Request Opened!])
```

### Agent Roles:
- **Triage Agent (`openai/gpt-oss-20b`):** Reads the issue title, body, and repo file tree to identify the exact affected files and symbols. Automatically loads source code into working memory.
- **Reproducer Agent (`openai/gpt-oss-120b`):** Authors a minimal, targeted `pytest` regression test. If the test doesn't fail on the current code, the pipeline aborts immediately (honest verification gate).
- **Fixer Agent (`openai/gpt-oss-120b`):** Produces a surgical unified diff. It has zero ability to tamper with or modify the reproducer's test.
- **Verifier Agent (`openai/gpt-oss-20b`):** Executes the patch against the full test suite in the sandbox and verifies that zero regressions were introduced.
- **PR Automator:** Commits the regression test + the fix, pushes to a unique branch, and opens a GitHub PR with root cause, test evidence, and explanations.

---

## 📁 Repository Layout

```
BUG_2_PR/
├── main.py              # CLI Entrypoint (python main.py <issue_url>)
├── graph.py             # Multi-agent state machine orchestrator
├── llm.py               # Groq LLM client with caching & self-repair
├── prompts.py           # Structured prompts with JSON output contracts
├── sandbox.py           # Docker/Local isolated test execution & patch applier
├── gh.py                # GitHub REST API client (clone, issues, PRs)
├── recorder.py          # Saves immutable execution traces to runs/
├── dashboard.py         # Streamlit visual UI with Replay Mode (P3)
├── Dockerfile           # Minimal Python sandbox container
├── demo_repo/           # Seeded bug testbed (pagination & pricing bugs)
├── runs/                # Real historical run records for judge replay
└── requirements.txt     # Unified project dependencies
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Python 3.11+
- Git

### 2. Installation
```bash
git clone https://github.com/anushkakhandelwal21/BUG_2_PR.git
cd BUG_2_PR
pip install -r requirements.txt
```

### 3. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your credentials:
```ini
GROQ_API_KEY=gsk_your_groq_api_key
GITHUB_TOKEN=ghp_your_github_personal_access_token
SANDBOX_MODE=local   # or 'docker' for containerized runs
```

---

## 💻 Running the Autonomous Agent

Resolve any GitHub issue with a single command:
```bash
python main.py https://github.com/Trident1211/Demo-buggy-repo/issues/1
```

**Terminal Output:**
```text
============================================================
  [Bug-to-PR Agent] Autonomous Bug Resolution
============================================================

[+] Fetching issue: https://github.com/Trident1211/Demo-buggy-repo/issues/1
   Title: Bug: Pagination drops the last item on each page
   Repo:  Trident1211/Demo-buggy-repo

[+] Cloning repository...
[+] Starting multi-agent pipeline...
   Triage -> Reproducer -> Fixer -> Verifier

[+] Run record saved: runs/run_20261024_161128_e345224f.json

============================================================
  [SUCCESS] PR opened!
  PR URL:   https://github.com/Trident1211/Demo-buggy-repo/pull/3
  Duration: 13.08s
  Retries:  0
============================================================
```

---

## 🖥️ Streamlit Dashboard & Judge Replay Mode

Judges can inspect real recorded runs without an API key using our interactive Streamlit dashboard:

```bash
streamlit run dashboard.py
```

- **Replay Selector:** Pick any run from the `runs/` folder.
- **Stage Visualizer:** Inspect Triage, Reproducer code, Unified Diff, and Pytest logs.
- **One-Click PR Link:** Jump directly to the verified PR on GitHub.

---

## 👥 Team & Responsibilities

- **P1 (Agent Brain):** Multi-agent state machine, model routing, system prompt contracts (`graph.py`, `llm.py`, `prompts.py`).
- **P2 (Infra / GitHub / Sandbox):** Docker sandbox, diff application, GitHub REST client, run recorder (`sandbox.py`, `gh.py`, `main.py`, `recorder.py`).
- **P3 (Dashboard / Replay):** Streamlit UI, stage timeline stepper, judge replay viewer (`dashboard.py`).
- **P4 (Evaluation / Content):** Benchmark testbed, seeded bugs, evaluation metrics, documentation, and submission video.

---

## 📄 License
This project is open-source under the MIT License.

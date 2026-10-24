# Bug-to-PR Multi-Agent Architecture & Protocol Specification

## State Machine Architecture
The pipeline is designed as an asynchronous, deterministic state machine driven by `AgentState`:

```
               [GitHub Issue URL]
                       │
                       ▼
                 [node_triage]
           (openai/gpt-oss-20b | Fast)
                       │
                       ▼
               [node_reproducer]
          (openai/gpt-oss-120b | Smart)
                       │
                       ▼
           [Sandbox Execution Gate]
                       │
        ┌──────────────┴──────────────┐
  [Test Fails]                  [Test Passes]
  (Bug Proven)                (Not Reproducible)
        │                              │
        ▼                              ▼
   [node_fixer]                   [node_end]
(openai/gpt-oss-120b)           (Honest Abort)
        │
        ▼
  [node_verifier]
 (Sandbox Pytest)
        │
  ┌─────┴───────────────────────┐
[Pass]                       [Fail]
  │                             │
  ▼                             ▼
[node_open_pr]          [Retry <= 4 Loops]
```

## Agent Communication Contracts

### 1. Triage Agent Contract
- **Input:** Issue Title, Issue Body, Repository File Tree.
- **Output:**
  ```json
  {
    "summary": "String",
    "affected_files": ["List[str]"],
    "affected_symbols": [{"file": "str", "symbol": "str", "reason": "str"}],
    "reproduction_hint": "String",
    "confidence": 0.95
  }
  ```

### 2. Reproducer Agent Contract
- **Input:** Triage Summary, Affected Symbols, Source Snippets.
- **Output:**
  ```json
  {
    "test_file_path": "tests/test_reproduce_<slug>.py",
    "test_function": "test_<slug>",
    "test_code": "def test_...(): assert ...",
    "expected_failure_reason": "String",
    "confidence": 0.95
  }
  ```

### 3. Fixer Agent Contract
- **Input:** Triage Summary, Reproducer Test, Failure Trace, Source Code, Retry History.
- **Output:**
  ```json
  {
    "patch": "Unified Diff (--- a/... +++ b/...)",
    "files_changed": ["List[str]"],
    "explanation": "String",
    "confidence": 0.95
  }
  ```

### 4. Verifier Agent Contract
- **Input:** Sandbox Pytest Stdout/Stderr, Returncode, Reproduction Test ID.
- **Output:**
  ```json
  {
    "reproduction_test_passed": true,
    "full_suite_passed": true,
    "total_tests": 8,
    "passed": 8,
    "failed": 0,
    "confidence": 1.0
  }
  ```

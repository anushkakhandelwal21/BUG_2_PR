# Security & Sandbox Isolation Policy

## Security Model
The **Bug-to-PR Agent** executes untrusted repository code during bug diagnosis and test verification. To prevent arbitrary code execution, the following safeguards are implemented:

### 1. Isolated Sandbox Execution
- When `SANDBOX_MODE=docker` is set, repository code executes in a sandboxed container:
  - Memory ceiling capped at `1GB`.
  - CPU usage restricted to 1 virtual core.
  - Network interface disabled (`--network=none`) during test execution to prevent data exfiltration.

### 2. Local Fallback Mode
- Under `SANDBOX_MODE=local`, execution is constrained with explicit timeouts (`SANDBOX_TIMEOUT=120s`).
- Tests run inside isolated working directory copies to prevent state corruption.

### 3. Untrusted Input Handling
- GitHub issue titles, descriptions, and user inputs are escaped and passed strictly as structured prompt payloads.
- Generated diffs undergo syntax validation before disk write.

## Reporting Vulnerabilities
If you discover a security vulnerability within the pipeline, please file an issue or contact the maintainers directly.

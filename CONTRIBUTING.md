# Contributing to Bug-to-PR Agent

Thank you for your interest in contributing! This project is designed as an autonomous multi-agent software engineering system.

## Code Standards
- **Python 3.11+**: All Python files must adhere to PEP 8 standards.
- **Type Annotations**: Functions should provide complete typing information where feasible.
- **JSON Contracts**: Agents must strictly follow schema definitions specified in `prompts.py`.
- **Sandbox Isolation**: Never introduce code that breaks Docker container isolation or executes network requests during test runs.

## Testing Your Changes
Before submitting a pull request, run the smoke test suite:
```bash
python smoke_test.py
python test_pipeline_e2e.py
```

## Pull Request Guidelines
1. Branch naming format: `feat/<feature-name>` or `fix/<bug-name>`.
2. Ensure commit messages follow the Conventional Commits specification (e.g. `feat:`, `fix:`, `docs:`, `test:`, `chore:`).
3. Update the `README.md` if your contribution alters public CLI or configuration options.

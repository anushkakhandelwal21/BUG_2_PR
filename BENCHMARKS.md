# Empirical Evaluation & Benchmark Report

## Methodology
The **Bug-to-PR Agent** is evaluated against real, isolated Python repositories containing seeded defects. The objective is to measure:
1. **Reproduction Accuracy:** Did the Reproducer Agent author a test that accurately isolated the failure?
2. **First-Pass Pass Rate:** Did the Fixer resolve the defect without requiring retries?
3. **Regression Prevention:** Did the full test suite remain 100% green after applying the patch?
4. **Resolution Latency:** Wall-clock time from issue ingestion to pull request opening.

---

## Live Benchmark Results

| Run ID | Defect Target | Reproduction Verified | Resolution Time | Iterations | PR Status |
|---|---|---|---|---|---|
| `e345224f` | Off-by-one boundary in pagination | ✅ Yes (exit code 1) | **13.08s** | 0 retries | **[PR #3 Opened](https://github.com/Trident1211/Demo-buggy-repo/pull/3)** |
| `e18ab1be` | Unbounded discount resulting in negative price | ✅ Yes (exit code 1) | **12.75s** | 0 retries | **[PR #4 Opened](https://github.com/Trident1211/Demo-buggy-repo/pull/4)** |

---

## Analysis
- **Average Time to Resolution:** **12.91 seconds**
- **First-Attempt Success Rate:** **100% (2 / 2)**
- **Regression Rate:** **0%** (zero existing tests broken across all runs)
- **Zero Hallucination Guarantee:** Both runs strictly followed the test-first reproduction gate.

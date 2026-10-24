import { ResolutionRun, WorkflowStage, AgentActivity, FileDiff, PullRequestDetails } from '../types';

export const INITIAL_STAGES_TEMPLATE: WorkflowStage[] = [
  {
    id: 'analysis',
    label: 'Issue Analysis',
    shortDesc: 'Parsing issue description, stack traces, and reproduction hints',
    status: 'pending',
    assignedAgent: 'Issue Analyst',
  },
  {
    id: 'exploration',
    label: 'Repository Exploration',
    shortDesc: 'Mapping call graph, dependency tree, and relevant source modules',
    status: 'pending',
    assignedAgent: 'Repository Explorer',
  },
  {
    id: 'reproduction',
    label: 'Bug Reproduction',
    shortDesc: 'Triggering failure condition to isolate root cause',
    status: 'pending',
    assignedAgent: 'Reproduction Engineer',
  },
  {
    id: 'regression_test',
    label: 'Regression Test Creation',
    shortDesc: 'Writing automated test that strictly fails on current baseline (RED)',
    status: 'pending',
    assignedAgent: 'Reproduction Engineer',
  },
  {
    id: 'fix_implementation',
    label: 'Fix Implementation',
    shortDesc: 'Synthesizing minimal, defensive patch addressing the defect',
    status: 'pending',
    assignedAgent: 'Fix Engineer',
  },
  {
    id: 'sandbox_verification',
    label: 'Sandbox Verification',
    shortDesc: 'Running regression test and full regression suite in isolated sandbox',
    status: 'pending',
    assignedAgent: 'Verification Agent',
  },
  {
    id: 'pr_preparation',
    label: 'Pull Request Preparation',
    shortDesc: 'Composing code diff, test evidence report, and verified PR body',
    status: 'pending',
    assignedAgent: 'PR Composer',
  },
];

export const INITIAL_AGENTS_TEMPLATE: AgentActivity[] = [
  {
    role: 'Issue Analyst',
    status: 'idle',
    currentAction: 'Waiting for issue URL ingestion',
  },
  {
    role: 'Repository Explorer',
    status: 'idle',
    currentAction: 'Waiting for AST and symbol indexer',
  },
  {
    role: 'Reproduction Engineer',
    status: 'idle',
    currentAction: 'Awaiting workspace build environment',
  },
  {
    role: 'Fix Engineer',
    status: 'idle',
    currentAction: 'Standby for verified failure baseline',
  },
  {
    role: 'Verification Agent',
    status: 'idle',
    currentAction: 'Docker sandbox daemon ready',
  },
  {
    role: 'PR Composer',
    status: 'idle',
    currentAction: 'Standing by for green verification seal',
  },
];

// Sample Run 1: Flagship Verified Run
export const MOCK_RUN_FLAGSHIP: ResolutionRun = {
  id: 'run_8f9e21',
  issueNumber: 142,
  issueTitle: 'TypeError: Cannot read properties of undefined (reading "role") in auth_middleware',
  issueUrl: 'https://github.com/demo-org/sample-service/issues/142',
  repository: 'demo-org/sample-service',
  targetBranch: 'main',
  workingBranch: 'fixtrail/fix-auth-role-undefined-142',
  commitHash: '7f8a92c',
  status: 'verified',
  startedAt: '2026-10-24T08:12:00Z',
  completedAt: '2026-10-24T08:14:42Z',
  elapsedSeconds: 162,
  isDemo: true,
  stages: [
    {
      id: 'analysis',
      label: 'Issue Analysis',
      shortDesc: 'Parsing issue description, stack traces, and reproduction hints',
      status: 'passed',
      startedAt: '08:12:01',
      completedAt: '08:12:15',
      durationSeconds: 14,
      assignedAgent: 'Issue Analyst',
      evidenceSummary: 'Identified null pointer dereference in auth_middleware.ts:L48 when JWT payload lacks nested claims object.',
    },
    {
      id: 'exploration',
      label: 'Repository Exploration',
      shortDesc: 'Mapping call graph, dependency tree, and relevant source modules',
      status: 'passed',
      startedAt: '08:12:15',
      completedAt: '08:12:38',
      durationSeconds: 23,
      assignedAgent: 'Repository Explorer',
      evidenceSummary: 'Located 3 call sites invoking extractUserRole() across router and webhook dispatcher.',
    },
    {
      id: 'reproduction',
      label: 'Bug Reproduction',
      shortDesc: 'Triggering failure condition to isolate root cause',
      status: 'passed',
      startedAt: '08:12:38',
      completedAt: '08:12:59',
      durationSeconds: 21,
      assignedAgent: 'Reproduction Engineer',
      evidenceSummary: 'Simulated HTTP GET /v1/telemetry with bearer token missing user metadata. Reproduced unhandled rejection 500.',
    },
    {
      id: 'regression_test',
      label: 'Regression Test Creation',
      shortDesc: 'Writing automated test that strictly fails on current baseline (RED)',
      status: 'passed',
      startedAt: '08:12:59',
      completedAt: '08:13:25',
      durationSeconds: 26,
      assignedAgent: 'Reproduction Engineer',
      evidenceSummary: 'Created test_auth_empty_claims_regression in tests/auth/middleware.test.ts. Baseline test failed as expected (RED).',
    },
    {
      id: 'fix_implementation',
      label: 'Fix Implementation',
      shortDesc: 'Synthesizing minimal, defensive patch addressing the defect',
      status: 'passed',
      startedAt: '08:13:25',
      completedAt: '08:13:58',
      durationSeconds: 33,
      assignedAgent: 'Fix Engineer',
      evidenceSummary: 'Added optional chaining and fallback guest role resolver in src/middleware/auth.ts (+14 lines, -3 lines).',
    },
    {
      id: 'sandbox_verification',
      label: 'Sandbox Verification',
      shortDesc: 'Running regression test and full regression suite in isolated sandbox',
      status: 'passed',
      startedAt: '08:13:58',
      completedAt: '08:14:28',
      durationSeconds: 30,
      assignedAgent: 'Verification Agent',
      evidenceSummary: 'Sandbox tests completed: 86 passed, 0 failed, 2 skipped in 3.42s. Regression test passed (GREEN).',
    },
    {
      id: 'pr_preparation',
      label: 'Pull Request Preparation',
      shortDesc: 'Composing code diff, test evidence report, and verified PR body',
      status: 'passed',
      startedAt: '08:14:28',
      completedAt: '08:14:42',
      durationSeconds: 14,
      assignedAgent: 'PR Composer',
      evidenceSummary: 'Verified PR #143 generated with reproduction logs and diff proof.',
    },
  ],
  agents: [
    {
      role: 'Issue Analyst',
      status: 'completed',
      currentAction: 'Analysis finished. Identified root cause and minimal reproduction spec.',
      thoughtProcess: 'The stack trace points directly to auth_middleware.ts line 48. When an API client submits an OAuth service token, decodedToken.claims is undefined, causing role lookup to fail with TypeError.',
      lastCommand: 'ast_grep --pattern "function extractUserRole($$$)"',
      lastOutput: 'Found 1 definition in src/middleware/auth.ts:44',
      artifactsCreated: ['issue_spec.json'],
    },
    {
      role: 'Repository Explorer',
      status: 'completed',
      currentAction: 'Target files and dependents verified in isolated worktree.',
      thoughtProcess: 'Scanning references to ensure modifying extractUserRole return type does not break downstream downstream rate-limiters or analytics tracking.',
      lastCommand: 'find_references --symbol "extractUserRole"',
      lastOutput: '2 downstream references confirmed compatible with string | null union.',
      artifactsCreated: ['call_graph.json'],
    },
    {
      role: 'Reproduction Engineer',
      status: 'completed',
      currentAction: 'Regression test created and confirmed failing on master baseline.',
      thoughtProcess: 'Writing tests/auth/middleware.test.ts:test_auth_empty_claims_regression. Verified it throws TypeError on unmodified code.',
      lastCommand: 'npm test -- -t "extractUserRole with undefined claims"',
      lastOutput: 'FAIL: TypeError: Cannot read properties of undefined (reading "role")',
      artifactsCreated: ['tests/auth/middleware.test.ts'],
    },
    {
      role: 'Fix Engineer',
      status: 'completed',
      currentAction: 'Synthesized defensive guard with optional chaining and fallback.',
      thoughtProcess: 'Modifying src/middleware/auth.ts to safely access token?.claims?.role ?? token?.role ?? null. Also handles empty string tokens gracefully.',
      lastCommand: 'git apply --check /tmp/patch_auth_role.diff',
      lastOutput: 'Patch cleanly applied to worktree.',
      artifactsCreated: ['src/middleware/auth.ts'],
    },
    {
      role: 'Verification Agent',
      status: 'completed',
      currentAction: 'Sandbox verification passed: 86 passed, 0 failed.',
      thoughtProcess: 'Spun up ephemeral Docker container with Alpine 3.19 + Node 22. Executed full test suite with coverage report.',
      lastCommand: 'docker exec sandbox-8f9e21 npm test -- --coverage',
      lastOutput: 'Test Suites: 8 passed, 8 total. Tests: 86 passed, 86 total. Time: 3.42s',
      artifactsCreated: ['sandbox_verification_report.json'],
    },
    {
      role: 'PR Composer',
      status: 'completed',
      currentAction: 'Pull Request prepared with verification seal and test evidence.',
      thoughtProcess: 'Formatted comprehensive PR summary with reproduction step, code diff breakdown, and sandbox test run logs.',
      lastCommand: 'gh pr create --title "fix(auth): safely extract role from token without claims object" --body-file /tmp/pr_body.md',
      lastOutput: 'https://github.com/demo-org/sample-service/pull/143',
      artifactsCreated: ['pull_request_spec.md'],
    },
  ],
  logs: [
    { id: 'l1', timestamp: '08:12:01.120', severity: 'INFO', agent: 'Issue Analyst', message: 'Ingested issue URL: https://github.com/demo-org/sample-service/issues/142' },
    { id: 'l2', timestamp: '08:12:04.450', severity: 'AGENT', agent: 'Issue Analyst', message: 'Analyzing issue body and stack trace for reproduction candidates' },
    { id: 'l3', timestamp: '08:12:09.810', severity: 'DEBUG', agent: 'Issue Analyst', message: 'Detected candidate function: `extractUserRole` in src/middleware/auth.ts:48' },
    { id: 'l4', timestamp: '08:12:15.200', severity: 'INFO', agent: 'Repository Explorer', message: 'Cloned repository worktree to sandbox at commit 7f8a92c' },
    { id: 'l5', timestamp: '08:12:22.010', severity: 'COMMAND', agent: 'Repository Explorer', message: '$ ripgrep "extractUserRole" src/' },
    { id: 'l6', timestamp: '08:12:28.900', severity: 'DEBUG', agent: 'Repository Explorer', message: 'Symbol index loaded. 3 usages found across router and analytics pipeline' },
    { id: 'l7', timestamp: '08:12:38.110', severity: 'INFO', agent: 'Reproduction Engineer', message: 'Crafting standalone regression test reproducing unhandled TypeError' },
    { id: 'l8', timestamp: '08:12:47.330', severity: 'COMMAND', agent: 'Reproduction Engineer', message: '$ npm test -- -t "extractUserRole with undefined claims"' },
    { id: 'l9', timestamp: '08:12:52.020', severity: 'TEST_FAIL', agent: 'Reproduction Engineer', message: '❌ BASELINE FAILURE REPRODUCED: TypeError: Cannot read properties of undefined (reading "role")' },
    { id: 'l10', timestamp: '08:12:59.400', severity: 'SUCCESS', agent: 'Reproduction Engineer', message: 'Verification Invariant Step 1 Passed: Bug successfully isolated & reproduced (RED)' },
    { id: 'l11', timestamp: '08:13:25.100', severity: 'INFO', agent: 'Fix Engineer', message: 'Synthesizing defensive patch with optional chaining in auth.ts' },
    { id: 'l12', timestamp: '08:13:40.750', severity: 'COMMAND', agent: 'Fix Engineer', message: '$ git diff -U3 src/middleware/auth.ts' },
    { id: 'l13', timestamp: '08:13:58.200', severity: 'INFO', agent: 'Verification Agent', message: 'Mounting patched workspace in clean ephemeral container `sandbox-8f9e21`' },
    { id: 'l14', timestamp: '08:14:05.800', severity: 'COMMAND', agent: 'Verification Agent', message: '$ npm test -- --runInBand' },
    { id: 'l15', timestamp: '08:14:18.400', severity: 'TEST_PASS', agent: 'Verification Agent', message: '✔ PASS: tests/auth/middleware.test.ts > extractUserRole with undefined claims (14ms)' },
    { id: 'l16', timestamp: '08:14:26.900', severity: 'TEST_PASS', agent: 'Verification Agent', message: '✔ PASS: 86 passed, 0 failed, 2 skipped (3.42s). Zero regressions.' },
    { id: 'l17', timestamp: '08:14:28.150', severity: 'SUCCESS', agent: 'Verification Agent', message: 'Strict Verification Passed: Regression test green + full test suite clean!' },
    { id: 'l18', timestamp: '08:14:35.400', severity: 'AGENT', agent: 'PR Composer', message: 'Generating pull request artifact with automated verification badge and audit trail' },
    { id: 'l19', timestamp: '08:14:42.000', severity: 'SUCCESS', agent: 'PR Composer', message: 'Pull request prepared and verified: Ready for review' },
  ],
  verification: {
    status: 'verified_passed',
    baselineReproduced: true,
    baselineFailedTest: 'tests/auth/middleware.test.ts > extractUserRole with undefined claims',
    baselineFailureMessage: 'TypeError: Cannot read properties of undefined (reading "role")\n    at extractUserRole (src/middleware/auth.ts:48:28)\n    at Object.<anonymous> (tests/auth/middleware.test.ts:32:15)',
    postFixPassed: true,
    totalTests: 88,
    passedCount: 86,
    failedCount: 0,
    skippedCount: 2,
    executionDurationMs: 3420,
    attemptNumber: 1,
    maxAttempts: 3,
    testCases: [
      {
        name: 'extractUserRole with undefined claims (REGRESSION)',
        file: 'tests/auth/middleware.test.ts',
        durationMs: 14,
        status: 'passed',
        isRegressionTest: true,
      },
      {
        name: 'extractUserRole with valid admin payload',
        file: 'tests/auth/middleware.test.ts',
        durationMs: 8,
        status: 'passed',
      },
      {
        name: 'extractUserRole with expired JWT token',
        file: 'tests/auth/middleware.test.ts',
        durationMs: 12,
        status: 'passed',
      },
      {
        name: 'authenticateBearer rejects empty header',
        file: 'tests/auth/middleware.test.ts',
        durationMs: 6,
        status: 'passed',
      },
      {
        name: 'telemetryIngest handles high-throughput batches',
        file: 'tests/api/telemetry.test.ts',
        durationMs: 240,
        status: 'passed',
      },
      {
        name: 'webhookDispatcher gracefully queues on 429',
        file: 'tests/webhooks/dispatcher.test.ts',
        durationMs: 110,
        status: 'passed',
      },
      {
        name: 'database connection pool stress test',
        file: 'tests/db/pool.test.ts',
        durationMs: 0,
        status: 'skipped',
      },
    ],
  },
  diffs: [
    {
      filename: 'src/middleware/auth.ts',
      status: 'modified',
      additions: 14,
      deletions: 3,
      isRegressionTest: false,
      unifiedDiff: `@@ -43,9 +43,20 @@ export interface TokenPayload {
 }
 
 export function extractUserRole(token: TokenPayload | null | undefined): string | null {
-  // Previous implementation assumed claims was always present on decoded token
-  const claims = token.claims;
-  return claims.role;
+  if (!token) {
+    return null;
+  }
+
+  // Safely extract role supporting both nested claims and root-level role attributes
+  if (token.claims && typeof token.claims.role === 'string') {
+    return token.claims.role;
+  }
+
+  if (typeof token.role === 'string') {
+    return token.role;
+  }
+
+  return null;
 }`,
    },
    {
      filename: 'tests/auth/middleware.test.ts',
      status: 'modified',
      additions: 38,
      deletions: 0,
      isRegressionTest: true,
      unifiedDiff: `@@ -24,3 +24,41 @@ describe('Auth Middleware', () => {
     expect(role).toBe('admin');
   });
+
+  describe('Regression #142: Undefined claims handling', () => {
+    it('extractUserRole with undefined claims should return null instead of throwing', () => {
+      const malformedToken = {
+        sub: 'usr_98231',
+        iss: 'auth0.acme.com',
+        // Note: claims field intentionally absent
+      };
+
+      expect(() => {
+        const role = extractUserRole(malformedToken as any);
+        expect(role).toBeNull();
+      }).not.toThrow();
+    });
+
+    it('extractUserRole with null token returns null', () => {
+      expect(extractUserRole(null)).toBeNull();
+      expect(extractUserRole(undefined)).toBeNull();
+    });
+
+    it('extractUserRole with root-level role fallback', () => {
+      const rootRoleToken = {
+        sub: 'usr_4412',
+        role: 'editor',
+      };
+      expect(extractUserRole(rootRoleToken as any)).toBe('editor');
+    });
+  });
+});`,
    },
  ],
  pullRequest: {
    title: 'fix(auth): safely extract role from token when claims object is undefined (#142)',
    branchName: 'fixtrail/fix-auth-role-undefined-142',
    baseBranch: 'main',
    prNumber: 143,
    url: 'https://github.com/demo-org/sample-service/pull/143',
    status: 'ready',
    bodyMarkdown: `## 🎯 Summary of Changes
Addresses issue #142: Fixes unhandled \`TypeError: Cannot read properties of undefined (reading 'role')\` occurring when authenticating OAuth tokens that do not supply a nested \`claims\` dictionary.

---

### 🧪 Verification & Evidence (Bug2PR Verification Trace)
This pull request was autonomously synthesized and verified in an isolated container sandbox:

1. **Reproduction Test Baseline (RED):**
   - Executed \`tests/auth/middleware.test.ts\` on unmodified \`main\` branch.
   - Reproduced exact failure: \`TypeError: Cannot read properties of undefined (reading 'role')\`.

2. **Verification Suite Post-Patch (GREEN):**
   - Regression test suite passed in 14ms.
   - Complete project test suite passed: **86 passed, 0 failed, 2 skipped** (3.42s).
   - No performance or memory regression detected.

---

### 📂 File Modifications
- \`src/middleware/auth.ts\`: Added safe optional chaining and fallback to root-level role field.
- \`tests/auth/middleware.test.ts\`: Added dedicated regression suite covering missing claims, null tokens, and fallback roles.

> **Verification Seal:** Passed all sandbox checks. PR opened with human review policy enabled.`,
  },
};

// Sample Run 2: Run with Intelligent Retry (Demonstrates retry UX)
export const MOCK_RUN_RETRY: ResolutionRun = {
  id: 'run_4b2c19',
  issueNumber: 89,
  issueTitle: 'Off-by-one boundary error in cursor pagination query generator',
  issueUrl: 'https://github.com/demo-org/sample-service/issues/89',
  repository: 'demo-org/sample-service',
  targetBranch: 'main',
  workingBranch: 'fixtrail/fix-cursor-boundary-89',
  commitHash: '3d19b4e',
  status: 'verified',
  startedAt: '2026-10-24T07:45:00Z',
  completedAt: '2026-10-24T07:49:12Z',
  elapsedSeconds: 252,
  isDemo: true,
  retryReason: 'Attempt 1 failed: Edge case test `test_empty_table_cursor` threw boundary index exception. Agent revised hypothesis and synthesized patch v2.',
  stages: [
    {
      id: 'analysis',
      label: 'Issue Analysis',
      shortDesc: 'Parsing issue description, stack traces, and reproduction hints',
      status: 'passed',
      assignedAgent: 'Issue Analyst',
      evidenceSummary: 'Cursor boundary omitted last record when limit was exactly equal to page size.',
    },
    {
      id: 'exploration',
      label: 'Repository Exploration',
      shortDesc: 'Mapping call graph, dependency tree, and relevant source modules',
      status: 'passed',
      assignedAgent: 'Repository Explorer',
      evidenceSummary: 'Located src/db/pagination.ts and 4 SQL query builders.',
    },
    {
      id: 'reproduction',
      label: 'Bug Reproduction',
      shortDesc: 'Triggering failure condition to isolate root cause',
      status: 'passed',
      assignedAgent: 'Reproduction Engineer',
      evidenceSummary: 'Isolated boundary condition with mock dataset of 50 records.',
    },
    {
      id: 'regression_test',
      label: 'Regression Test Creation',
      shortDesc: 'Writing automated test that strictly fails on current baseline (RED)',
      status: 'passed',
      assignedAgent: 'Reproduction Engineer',
      evidenceSummary: 'Added tests/db/pagination_boundary.test.ts. Baseline test failed.',
    },
    {
      id: 'fix_implementation',
      label: 'Fix Implementation',
      shortDesc: 'Synthesizing minimal, defensive patch addressing the defect',
      status: 'passed',
      assignedAgent: 'Fix Engineer',
      evidenceSummary: 'Synthesized patch v2 after Attempt 1 edge case test failure.',
    },
    {
      id: 'sandbox_verification',
      label: 'Sandbox Verification',
      shortDesc: 'Running regression test and full regression suite in isolated sandbox',
      status: 'passed',
      assignedAgent: 'Verification Agent',
      evidenceSummary: 'Attempt 2 passed: 112 passed, 0 failed. Full test matrix verified.',
    },
    {
      id: 'pr_preparation',
      label: 'Pull Request Preparation',
      shortDesc: 'Composing code diff, test evidence report, and verified PR body',
      status: 'passed',
      assignedAgent: 'PR Composer',
      evidenceSummary: 'PR #92 created with retry log history.',
    },
  ],
  agents: [
    {
      role: 'Issue Analyst',
      status: 'completed',
      currentAction: 'Identified cursor inequality bug (>= vs >).',
    },
    {
      role: 'Repository Explorer',
      status: 'completed',
      currentAction: 'Indexed pagination utils.',
    },
    {
      role: 'Reproduction Engineer',
      status: 'completed',
      currentAction: 'Created reproducible boundary test.',
    },
    {
      role: 'Fix Engineer',
      status: 'completed',
      currentAction: 'Patched pagination SQL generator.',
      thoughtProcess: 'Attempt 1 changed > to >=, but broke empty table edge case. In Attempt 2, added explicit totalCount === 0 guard.',
    },
    {
      role: 'Verification Agent',
      status: 'completed',
      currentAction: 'Attempt 2: 112/112 tests passed.',
    },
    {
      role: 'PR Composer',
      status: 'completed',
      currentAction: 'PR #92 generated.',
    },
  ],
  logs: [
    { id: 'l201', timestamp: '07:45:05.100', severity: 'INFO', agent: 'Issue Analyst', message: 'Analyzing issue #89: Off-by-one boundary error in cursor pagination' },
    { id: 'l202', timestamp: '07:45:40.300', severity: 'TEST_FAIL', agent: 'Reproduction Engineer', message: 'Baseline regression test failed: Expected 10 items, returned 9' },
    { id: 'l203', timestamp: '07:46:20.100', severity: 'INFO', agent: 'Fix Engineer', message: 'Synthesized patch v1 modifying query offset generator' },
    { id: 'l204', timestamp: '07:46:50.000', severity: 'WARN', agent: 'Verification Agent', message: 'Verification Attempt 1 failed on edge case: `test_empty_table_cursor`' },
    { id: 'l205', timestamp: '07:47:05.200', severity: 'AGENT', agent: 'Fix Engineer', message: 'Intelligent Retry: Analyzing edge case failure. Generating revised hypothesis.' },
    { id: 'l206', timestamp: '07:47:45.800', severity: 'INFO', agent: 'Fix Engineer', message: 'Synthesized patch v2 with explicit zero-records guard' },
    { id: 'l207', timestamp: '07:48:30.100', severity: 'TEST_PASS', agent: 'Verification Agent', message: '✔ PASS: 112 passed, 0 failed in 4.10s (Attempt 2 successful)' },
    { id: 'l208', timestamp: '07:49:12.000', severity: 'SUCCESS', agent: 'PR Composer', message: 'PR #92 ready for review' },
  ],
  verification: {
    status: 'verified_passed',
    baselineReproduced: true,
    baselineFailedTest: 'tests/db/pagination_boundary.test.ts > cursor limit boundary',
    baselineFailureMessage: 'AssertionError: Expected array length 10 but received 9\n    at tests/db/pagination_boundary.test.ts:45:12',
    postFixPassed: true,
    totalTests: 112,
    passedCount: 112,
    failedCount: 0,
    skippedCount: 0,
    executionDurationMs: 4100,
    attemptNumber: 2,
    maxAttempts: 3,
    testCases: [
      {
        name: 'cursor limit boundary (REGRESSION)',
        file: 'tests/db/pagination_boundary.test.ts',
        durationMs: 22,
        status: 'passed',
        isRegressionTest: true,
      },
      {
        name: 'test_empty_table_cursor (Edge Case)',
        file: 'tests/db/pagination_boundary.test.ts',
        durationMs: 15,
        status: 'passed',
      },
      {
        name: 'query batching with 10k mock rows',
        file: 'tests/db/batch.test.ts',
        durationMs: 380,
        status: 'passed',
      },
    ],
  },
  diffs: [
    {
      filename: 'src/db/pagination.ts',
      status: 'modified',
      additions: 11,
      deletions: 4,
      isRegressionTest: false,
      unifiedDiff: `@@ -18,4 +18,11 @@ export function buildCursorQuery(cursor: string | null, limit: number) {
-  if (!cursor) return { limit };
-  return { where: { id: { gt: decodeCursor(cursor) } }, limit };
+  if (!cursor) {
+    return { limit: Math.max(1, limit) };
+  }
+  const decodedId = decodeCursor(cursor);
+  return {
+    where: { id: { gte: decodedId } },
+    limit: Math.max(1, limit),
+  };
 }`,
    },
    {
      filename: 'tests/db/pagination_boundary.test.ts',
      status: 'added',
      additions: 29,
      deletions: 0,
      isRegressionTest: true,
      unifiedDiff: `@@ -0,0 +1,29 @@
+import { buildCursorQuery } from '../../src/db/pagination';
+
+describe('Pagination boundary regression #89', () => {
+  it('correctly handles cursor boundary with exact page count', () => {
+    const query = buildCursorQuery('cursor_rec_10', 10);
+    expect(query.where.id.gte).toBe('cursor_rec_10');
+    expect(query.limit).toBe(10);
+  });
+
+  it('handles empty table cursor query without throw', () => {
+    const query = buildCursorQuery(null, 0);
+    expect(query.limit).toBe(1);
+  });
+});`,
    },
  ],
  pullRequest: {
    title: 'fix(db): correct cursor pagination boundary operator and zero limit guard (#89)',
    branchName: 'fixtrail/fix-cursor-boundary-89',
    baseBranch: 'main',
    prNumber: 92,
    url: 'https://github.com/demo-org/sample-service/pull/92',
    status: 'ready',
    bodyMarkdown: '## Summary\nFixes #89 off-by-one error when cursor boundary equals page size. Verified across 112 tests.',
  },
};

// Sample Run 3: In-Progress Run
export const MOCK_RUN_IN_PROGRESS: ResolutionRun = {
  id: 'run_7a3d90',
  issueNumber: 204,
  issueTitle: 'Memory leak in EventSub WebSocket reconnection listener pool',
  issueUrl: 'https://github.com/demo-org/sample-service/issues/204',
  repository: 'demo-org/sample-service',
  targetBranch: 'main',
  workingBranch: 'fixtrail/fix-eventsub-leak-204',
  commitHash: '9a01f4c',
  status: 'running',
  startedAt: '2026-10-24T08:22:00Z',
  elapsedSeconds: 78,
  isDemo: true,
  stages: [
    {
      id: 'analysis',
      label: 'Issue Analysis',
      shortDesc: 'Parsing issue description, stack traces, and reproduction hints',
      status: 'passed',
      durationSeconds: 16,
      assignedAgent: 'Issue Analyst',
      evidenceSummary: 'Identified MaxListenersExceededWarning on client disconnect and reconnect.',
    },
    {
      id: 'exploration',
      label: 'Repository Exploration',
      shortDesc: 'Mapping call graph, dependency tree, and relevant source modules',
      status: 'passed',
      durationSeconds: 22,
      assignedAgent: 'Repository Explorer',
      evidenceSummary: 'Traced event handler registration in src/ws/eventsub.ts.',
    },
    {
      id: 'reproduction',
      label: 'Bug Reproduction',
      shortDesc: 'Triggering failure condition to isolate root cause',
      status: 'passed',
      durationSeconds: 25,
      assignedAgent: 'Reproduction Engineer',
      evidenceSummary: 'Simulated 15 disconnect cycles; listener count grew to 30.',
    },
    {
      id: 'regression_test',
      label: 'Regression Test Creation',
      shortDesc: 'Writing automated test that strictly fails on current baseline (RED)',
      status: 'passed',
      durationSeconds: 15,
      assignedAgent: 'Reproduction Engineer',
      evidenceSummary: 'Added tests/ws/leak.test.ts. Baseline test failed on cycle 11.',
    },
    {
      id: 'fix_implementation',
      label: 'Fix Implementation',
      shortDesc: 'Synthesizing minimal, defensive patch addressing the defect',
      status: 'running',
      assignedAgent: 'Fix Engineer',
    },
    {
      id: 'sandbox_verification',
      label: 'Sandbox Verification',
      shortDesc: 'Running regression test and full regression suite in isolated sandbox',
      status: 'pending',
      assignedAgent: 'Verification Agent',
    },
    {
      id: 'pr_preparation',
      label: 'Pull Request Preparation',
      shortDesc: 'Composing code diff, test evidence report, and verified PR body',
      status: 'pending',
      assignedAgent: 'PR Composer',
    },
  ],
  agents: [
    {
      role: 'Issue Analyst',
      status: 'completed',
      currentAction: 'Issue classified as listener accumulation leak.',
    },
    {
      role: 'Repository Explorer',
      status: 'completed',
      currentAction: 'Mapped WebSocket reconnection lifecycle.',
    },
    {
      role: 'Reproduction Engineer',
      status: 'completed',
      currentAction: 'Regression test established and confirmed failing on master.',
    },
    {
      role: 'Fix Engineer',
      status: 'active',
      currentAction: 'Adding removeAllListeners cleanup hook in onReconnect()',
      thoughtProcess: 'Prior reconnect logic registers new "message" listener without removing previously attached handlers. Inserting cleanup block prior to socket replacement.',
    },
    {
      role: 'Verification Agent',
      status: 'idle',
      currentAction: 'Waiting for patch synthesis.',
    },
    {
      role: 'PR Composer',
      status: 'idle',
      currentAction: 'Waiting for green test results.',
    },
  ],
  logs: [
    { id: 'l301', timestamp: '08:22:01.000', severity: 'INFO', agent: 'Issue Analyst', message: 'Ingested issue #204: Memory leak in EventSub WebSocket reconnection listener pool' },
    { id: 'l302', timestamp: '08:22:20.400', severity: 'DEBUG', agent: 'Repository Explorer', message: 'Analyzing src/ws/eventsub.ts line 72: socket.on("message", this.handler)' },
    { id: 'l303', timestamp: '08:22:45.100', severity: 'TEST_FAIL', agent: 'Reproduction Engineer', message: '❌ Baseline test failed: Expected listenerCount <= 2, got 14' },
    { id: 'l304', timestamp: '08:23:02.800', severity: 'AGENT', agent: 'Fix Engineer', message: 'Fix Engineer drafting AbortController cleanup binding...' },
  ],
  verification: {
    status: 'baseline_reproduced',
    baselineReproduced: true,
    baselineFailedTest: 'tests/ws/leak.test.ts > listeners should not exceed max on reconnect',
    baselineFailureMessage: 'MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 11 message listeners added to [WebSocket].',
    postFixPassed: false,
    totalTests: 42,
    passedCount: 41,
    failedCount: 1,
    skippedCount: 0,
    executionDurationMs: 1200,
    attemptNumber: 1,
    maxAttempts: 3,
    testCases: [
      {
        name: 'listeners should not exceed max on reconnect (REGRESSION)',
        file: 'tests/ws/leak.test.ts',
        durationMs: 820,
        status: 'failed',
        errorMessage: 'AssertionError: Expected <= 2 listeners, received 14',
        isRegressionTest: true,
      },
    ],
  },
  diffs: [],
};

// Sample Run 4: Invariant Enforced - Bug NOT Reproduced (No PR Allowed!)
export const MOCK_RUN_UNREPRODUCED: ResolutionRun = {
  id: 'run_1e8f44',
  issueNumber: 67,
  issueTitle: 'Reported race condition in Redis distributed lock release',
  issueUrl: 'https://github.com/demo-org/sample-service/issues/67',
  repository: 'demo-org/sample-service',
  targetBranch: 'main',
  workingBranch: 'fixtrail/investigate-redis-lock-67',
  commitHash: '2b4c10a',
  status: 'failed',
  startedAt: '2026-10-24T06:10:00Z',
  completedAt: '2026-10-24T06:13:20Z',
  elapsedSeconds: 200,
  isDemo: true,
  retryReason: 'Strict Invariant Halt: Reproduction Engineer could not induce a failing baseline test across 10,000 concurrency permutations. As per policy: No verified failure baseline = No patch generated = No automated PR opened.',
  stages: [
    {
      id: 'analysis',
      label: 'Issue Analysis',
      shortDesc: 'Parsing issue description, stack traces, and reproduction hints',
      status: 'passed',
      durationSeconds: 15,
      assignedAgent: 'Issue Analyst',
      evidenceSummary: 'Parsed claim of lock release race condition on Redis 7.2.',
    },
    {
      id: 'exploration',
      label: 'Repository Exploration',
      shortDesc: 'Mapping call graph, dependency tree, and relevant source modules',
      status: 'passed',
      durationSeconds: 25,
      assignedAgent: 'Repository Explorer',
      evidenceSummary: 'Located src/locks/distributed.ts Lua script release logic.',
    },
    {
      id: 'reproduction',
      label: 'Bug Reproduction',
      shortDesc: 'Triggering failure condition to isolate root cause',
      status: 'failed',
      durationSeconds: 160,
      assignedAgent: 'Reproduction Engineer',
      evidenceSummary: 'Executed 10,000 parallel acquire/release cycles. Lua script is atomic. Failure could not be reproduced.',
    },
    {
      id: 'regression_test',
      label: 'Regression Test Creation',
      shortDesc: 'Writing automated test that strictly fails on current baseline (RED)',
      status: 'skipped',
      assignedAgent: 'Reproduction Engineer',
    },
    {
      id: 'fix_implementation',
      label: 'Fix Implementation',
      shortDesc: 'Synthesizing minimal, defensive patch addressing the defect',
      status: 'skipped',
      assignedAgent: 'Fix Engineer',
    },
    {
      id: 'sandbox_verification',
      label: 'Sandbox Verification',
      shortDesc: 'Running regression test and full regression suite in isolated sandbox',
      status: 'skipped',
      assignedAgent: 'Verification Agent',
    },
    {
      id: 'pr_preparation',
      label: 'Pull Request Preparation',
      shortDesc: 'Composing code diff, test evidence report, and verified PR body',
      status: 'skipped',
      assignedAgent: 'PR Composer',
    },
  ],
  agents: [
    {
      role: 'Issue Analyst',
      status: 'completed',
      currentAction: 'Analyzed report from external user.',
    },
    {
      role: 'Repository Explorer',
      status: 'completed',
      currentAction: 'Audited Lua release script.',
    },
    {
      role: 'Reproduction Engineer',
      status: 'failed',
      currentAction: 'Unable to induce failure baseline. Concurrency harness returned 100% success.',
      thoughtProcess: 'The reported issue likely stems from client-side network partition rather than lock script flaw. Without a reproducible failure, applying a blind speculative fix would risk introducing regressions.',
    },
    {
      role: 'Fix Engineer',
      status: 'idle',
      currentAction: 'Halted: Invariant gate prevented speculative patch.',
    },
    {
      role: 'Verification Agent',
      status: 'idle',
      currentAction: 'Halted.',
    },
    {
      role: 'PR Composer',
      status: 'idle',
      currentAction: 'Halted: No PR allowed without verified fix.',
    },
  ],
  logs: [
    { id: 'l401', timestamp: '06:10:01.000', severity: 'INFO', agent: 'Issue Analyst', message: 'Ingesting issue #67: Reported race condition in Redis distributed lock release' },
    { id: 'l402', timestamp: '06:10:20.000', severity: 'INFO', agent: 'Reproduction Engineer', message: 'Constructing stress-test matrix: 50 concurrent worker threads' },
    { id: 'l403', timestamp: '06:12:45.000', severity: 'WARN', agent: 'Reproduction Engineer', message: 'Warning: 10,000 lock cycles completed without reproducing reported race condition' },
    { id: 'l404', timestamp: '06:13:10.000', severity: 'TEST_FAIL', agent: 'Reproduction Engineer', message: '❌ Baseline Failure Invariant Not Met: Unable to establish failing regression test' },
    { id: 'l405', timestamp: '06:13:20.000', severity: 'WARN', agent: 'PR Composer', message: 'STRICT POLICY HALT: No green tests, no verified fix. No verified fix, no automatically opened PR.' },
  ],
  verification: {
    status: 'verification_failed',
    baselineReproduced: false,
    postFixPassed: false,
    totalTests: 64,
    passedCount: 64,
    failedCount: 0,
    skippedCount: 0,
    executionDurationMs: 8900,
    attemptNumber: 1,
    maxAttempts: 1,
    testCases: [],
  },
  diffs: [],
};

export const INITIAL_ALL_RUNS: ResolutionRun[] = [
  MOCK_RUN_FLAGSHIP,
  MOCK_RUN_RETRY,
  MOCK_RUN_IN_PROGRESS,
  MOCK_RUN_UNREPRODUCED,
];

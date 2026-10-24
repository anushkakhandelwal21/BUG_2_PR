import { ResolutionRun, WorkflowStage, AgentActivity, LogEntry, StageId, RunSubmissionPayload } from '../types';
import { INITIAL_STAGES_TEMPLATE, INITIAL_AGENTS_TEMPLATE } from './mockData';
import { recordReader } from './recordReader';

// Storage key for persisting runs across browser navigation
const STORAGE_KEY = 'bug2pr_runs_v3';

export class SimulationStore {
  private runs: ResolutionRun[] = [];
  private listeners: Set<(runs: ResolutionRun[]) => void> = new Set();
  private activeIntervals: Map<string, number> = new Map();

  constructor() {
    this.load();
  }

  private async load() {
    try {
      const records = await recordReader.getSavedRecords();
      if (records.length > 0) {
        this.runs = records.map((r) => ({
          id: r.runId,
          issueNumber: r.issue.number,
          issueTitle: r.issue.title,
          issueUrl: r.issue.url,
          repository: r.issue.repository,
          targetBranch: 'main',
          workingBranch: `bug2pr/fix-${String(r.runId).slice(0, 8)}`,
          commitHash: 'HEAD',
          status: r.finalStatus,
          startedAt: r.recordedAt,
          elapsedSeconds: r.durationSeconds || 0,
          stages: r.events.length > 0 ? [
            { id: 'triage', label: 'Triage', shortDesc: 'Root cause identified', status: 'passed', assignedAgent: 'Triage Agent' },
            { id: 'reproducer', label: 'Reproducer', shortDesc: 'Baseline test confirmed', status: 'passed', assignedAgent: 'Reproducer Agent' },
            { id: 'fixer', label: 'Fixer', shortDesc: 'Patch synthesized', status: 'passed', assignedAgent: 'Fixer Agent' },
            { id: 'verifier', label: 'Verifier', shortDesc: 'Suite verified', status: r.finalStatus === 'failed' ? 'failed' : 'passed', assignedAgent: 'Verifier Agent' },
            { id: 'pull_request', label: 'Pull Request', shortDesc: 'PR outcome', status: r.finalStatus === 'verified' ? 'passed' : 'pending', assignedAgent: 'Pull Request Agent' },
          ] : [],
          agents: [],
          logs: r.events.map((e, idx) => ({
            id: `log-${idx}`,
            timestamp: e.timestamp,
            severity: e.stageStatus === 'failed' ? 'TEST_FAIL' : 'INFO',
            agent: e.agentName,
            message: e.actionDescription,
            stream: 'stdout',
          })),
          verification: r.verification || {
            status: r.finalStatus === 'verified' ? 'verified_passed' : 'unverified',
            baselineReproduced: true,
            postFixPassed: r.finalStatus === 'verified',
            totalTests: 0,
            passedCount: 0,
            failedCount: 0,
            skippedCount: 0,
            executionDurationMs: (r.durationSeconds || 0) * 1000,
            testCases: [],
            attemptNumber: 1,
            maxAttempts: 4,
          },
          diffs: r.diffs || [],
          pullRequest: r.pullRequest,
        }));
        this.notify();
      } else {
        this.runs = [];
        this.notify();
      }
    } catch {
      this.runs = [];
      this.notify();
    }
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.runs));
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }
    this.notify();
  }

  public subscribe(fn: (runs: ResolutionRun[]) => void): () => void {
    this.listeners.add(fn);
    fn(this.runs);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify() {
    const copy = [...this.runs];
    this.listeners.forEach((fn) => fn(copy));
  }

  public getAllRuns(): ResolutionRun[] {
    return [...this.runs];
  }

  public getRunById(id: string): ResolutionRun | undefined {
    return this.runs.find((r) => r.id === id);
  }

  public async resetToDefault() {
    this.activeIntervals.forEach((intervalId) => clearInterval(intervalId));
    this.activeIntervals.clear();
    await this.load();
    this.save();
  }

  public createRun(payload: RunSubmissionPayload): ResolutionRun {
    // Parse issue owner/repo and number
    const match = payload.issueUrl.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
    const repo = match ? `${match[1]}/${match[2]}` : 'demo-org/sample-service';
    const issueNum = match ? parseInt(match[3], 10) : Math.floor(Math.random() * 800) + 100;
    
    // Generate clean run ID
    const runId = `run_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    const newRun: ResolutionRun = {
      id: runId,
      issueNumber: issueNum,
      issueTitle: payload.issueUrl.includes('express') 
        ? 'Router regex crash on nested percent-encoded path parameter'
        : 'TypeError: Cannot read properties of undefined in auth_token validator',
      issueUrl: payload.issueUrl,
      repository: repo,
      targetBranch: payload.targetBranch || 'main',
      workingBranch: `bug2pr/fix-issue-${issueNum}`,
      commitHash: Math.random().toString(16).substring(2, 9),
      status: 'running',
      startedAt: now.toISOString(),
      elapsedSeconds: 0,
      isDemo: true,
      stages: INITIAL_STAGES_TEMPLATE.map((s, index) => ({
        ...s,
        status: index === 0 ? 'running' : 'pending',
        startedAt: index === 0 ? timeStr : undefined,
      })),
      agents: INITIAL_AGENTS_TEMPLATE.map((a, index) => ({
        ...a,
        status: index === 0 ? 'active' : 'idle',
        currentAction: index === 0 ? 'Parsing GitHub issue description and stack trace' : a.currentAction,
      })),
      logs: [
        {
          id: `log_${Date.now()}_1`,
          timestamp: `${timeStr}.100`,
          severity: 'INFO',
          agent: 'Issue Analyst',
          message: `Ingested issue URL: ${payload.issueUrl}`,
        },
        {
          id: `log_${Date.now()}_2`,
          timestamp: `${timeStr}.400`,
          severity: 'AGENT',
          agent: 'Issue Analyst',
          message: 'Extracting error signatures and call stack hints from issue body...',
        },
      ],
      verification: {
        status: 'unverified',
        baselineReproduced: false,
        postFixPassed: false,
        totalTests: 0,
        passedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        executionDurationMs: 0,
        attemptNumber: 1,
        maxAttempts: payload.maxRetries || 3,
        testCases: [],
      },
      diffs: [],
    };

    this.runs.unshift(newRun);
    this.save();

    // Kick off automatic deterministic step progression
    this.startSimulationStepper(runId);

    return newRun;
  }

  public startSimulationStepper(runId: string, speedMs: number = 3500) {
    if (this.activeIntervals.has(runId)) {
      clearInterval(this.activeIntervals.get(runId));
    }

    const interval = window.setInterval(() => {
      const run = this.getRunById(runId);
      if (!run || run.status === 'verified' || run.status === 'failed') {
        this.stopSimulation(runId);
        return;
      }

      this.stepRun(runId);
    }, speedMs);

    this.activeIntervals.set(runId, interval);
  }

  public stopSimulation(runId: string) {
    if (this.activeIntervals.has(runId)) {
      clearInterval(this.activeIntervals.get(runId));
      this.activeIntervals.delete(runId);
    }
  }

  public stepRun(runId: string) {
    const run = this.getRunById(runId);
    if (!run || run.status === 'verified' || run.status === 'failed') return;

    const timeNow = new Date().toTimeString().split(' ')[0];
    const currentRunningStageIndex = run.stages.findIndex((s) => s.status === 'running');

    if (currentRunningStageIndex === -1) {
      // Find first pending stage
      const firstPending = run.stages.findIndex((s) => s.status === 'pending');
      if (firstPending !== -1) {
        run.stages[firstPending].status = 'running';
        run.stages[firstPending].startedAt = timeNow;
      }
      this.save();
      return;
    }

    const currentStage = run.stages[currentRunningStageIndex];
    currentStage.status = 'passed';
    currentStage.completedAt = timeNow;
    currentStage.durationSeconds = Math.floor(Math.random() * 12) + 14;

    const nextIndex = currentRunningStageIndex + 1;

    // Apply specific stage progress events
    this.applyStageEffects(run, currentStage.id, nextIndex, timeNow);

    if (nextIndex < run.stages.length) {
      run.stages[nextIndex].status = 'running';
      run.stages[nextIndex].startedAt = timeNow;
    } else {
      // All stages completed!
      run.status = 'verified';
      run.completedAt = new Date().toISOString();
      this.stopSimulation(runId);
    }

    run.elapsedSeconds += 18;
    this.save();
  }

  private applyStageEffects(run: ResolutionRun, stageId: StageId, nextIndex: number, timeNow: string) {
    switch (stageId) {
      case 'analysis':
        run.stages[0].evidenceSummary = 'Located null dereference candidate in input validation middleware.';
        run.agents[0].status = 'completed';
        run.agents[0].currentAction = 'Analysis complete. Passed context to Repository Explorer.';
        run.agents[1].status = 'active';
        run.agents[1].currentAction = 'Indexing AST and dependency graph in sandbox worktree';
        run.logs.push({
          id: `log_${Date.now()}_a1`,
          timestamp: `${timeNow}.120`,
          severity: 'INFO',
          agent: 'Repository Explorer',
          message: 'Cloned repository worktree into isolated container environment.',
        });
        break;

      case 'exploration':
        run.stages[1].evidenceSummary = 'Identified 4 module references across API routing layer.';
        run.agents[1].status = 'completed';
        run.agents[2].status = 'active';
        run.agents[2].currentAction = 'Synthesizing isolated test fixture to reproduce bug';
        run.logs.push({
          id: `log_${Date.now()}_e1`,
          timestamp: `${timeNow}.240`,
          severity: 'COMMAND',
          agent: 'Reproduction Engineer',
          message: '$ npx jest tests/reproduction/baseline_check.test.ts',
        });
        break;

      case 'reproduction':
        run.stages[2].evidenceSummary = 'Isolated defect: Unhandled exception reproduced with empty input payload.';
        run.logs.push({
          id: `log_${Date.now()}_r1`,
          timestamp: `${timeNow}.400`,
          severity: 'TEST_FAIL',
          agent: 'Reproduction Engineer',
          message: '❌ BASELINE FAILURE CONFIRMED: TypeError: Cannot read properties of undefined',
        });
        run.verification.baselineReproduced = true;
        run.verification.baselineFailedTest = 'tests/reproduction/baseline_check.test.ts > empty payload test';
        run.verification.baselineFailureMessage = 'TypeError: Cannot read properties of undefined (reading "role")';
        break;

      case 'regression_test':
        run.stages[3].evidenceSummary = 'Committed tests/auth/middleware.test.ts regression test (Confirmed RED on baseline).';
        run.agents[2].status = 'completed';
        run.agents[3].status = 'active';
        run.agents[3].currentAction = 'Drafting minimal defensive patch';
        run.logs.push({
          id: `log_${Date.now()}_rt1`,
          timestamp: `${timeNow}.500`,
          severity: 'SUCCESS',
          agent: 'Reproduction Engineer',
          message: 'Strict Invariant Gate 1 Passed: Regression test reproduces failure on master branch.',
        });
        break;

      case 'fix_implementation':
        run.stages[4].evidenceSummary = 'Patched src/middleware/auth.ts with safe fallback role resolver.';
        run.agents[3].status = 'completed';
        run.agents[4].status = 'active';
        run.agents[4].currentAction = 'Executing complete test suite in isolated Docker container';
        run.diffs = [
          {
            filename: 'src/middleware/auth.ts',
            status: 'modified',
            additions: 12,
            deletions: 2,
            isRegressionTest: false,
            unifiedDiff: `@@ -44,6 +44,16 @@ export function extractUserRole(token: any) {
-  return token.claims.role;
+  if (!token) return null;
+  if (token.claims?.role) return token.claims.role;
+  if (token.role) return token.role;
+  return null;
 }`,
          },
          {
            filename: 'tests/auth/middleware.test.ts',
            status: 'added',
            additions: 28,
            deletions: 0,
            isRegressionTest: true,
            unifiedDiff: `@@ -0,0 +1,28 @@
+describe('Regression test #142', () => {
+  it('should handle token with undefined claims without throwing', () => {
+    const token = { sub: 'usr_123' };
+    expect(extractUserRole(token)).toBeNull();
+  });
+});`,
          },
        ];
        run.logs.push({
          id: `log_${Date.now()}_f1`,
          timestamp: `${timeNow}.100`,
          severity: 'INFO',
          agent: 'Fix Engineer',
          message: 'Synthesized patch diff: +12 lines, -2 lines in src/middleware/auth.ts',
        });
        break;

      case 'sandbox_verification':
        run.stages[5].evidenceSummary = 'Full test suite passed: 86 passed, 0 failed, 2 skipped in 3.12s.';
        run.agents[4].status = 'completed';
        run.agents[5].status = 'active';
        run.agents[5].currentAction = 'Composing pull request with verified test evidence';
        run.verification.postFixPassed = true;
        run.verification.status = 'verified_passed';
        run.verification.totalTests = 88;
        run.verification.passedCount = 86;
        run.verification.failedCount = 0;
        run.verification.skippedCount = 2;
        run.verification.executionDurationMs = 3120;
        run.verification.testCases = [
          {
            name: 'extractUserRole with undefined claims (REGRESSION)',
            file: 'tests/auth/middleware.test.ts',
            durationMs: 12,
            status: 'passed',
            isRegressionTest: true,
          },
          {
            name: 'full test suite suite execution',
            file: 'tests/suite.test.ts',
            durationMs: 3108,
            status: 'passed',
          },
        ];
        run.logs.push({
          id: `log_${Date.now()}_v1`,
          timestamp: `${timeNow}.600`,
          severity: 'TEST_PASS',
          agent: 'Verification Agent',
          message: '✔ PASS: Regression test passed (12ms). Full test suite passed (86 passed, 0 failed).',
        });
        run.logs.push({
          id: `log_${Date.now()}_v2`,
          timestamp: `${timeNow}.700`,
          severity: 'SUCCESS',
          agent: 'Verification Agent',
          message: 'Strict Verification Invariant Satisfied: Green tests confirmed in clean sandbox.',
        });
        break;

      case 'pr_preparation':
        run.stages[6].evidenceSummary = 'Pull Request generated and verified ready for human review.';
        run.agents[5].status = 'completed';
        run.agents[5].currentAction = 'PR prepared and ready';
        run.pullRequest = {
          title: `fix(auth): safely extract role from token when claims object is undefined (#${run.issueNumber})`,
          branchName: run.workingBranch,
          baseBranch: run.targetBranch,
          prNumber: run.issueNumber + 1,
          url: `https://github.com/${run.repository}/pull/${run.issueNumber + 1}`,
          status: 'ready',
          bodyMarkdown: `## 🎯 Summary of Changes\nAddresses issue #${run.issueNumber}: Fixes unhandled TypeError when token claims are omitted.\n\n### 🧪 Verification Evidence\n- Baseline Reproduction: Red (Failed)\n- Post-Fix Sandbox: Green (86 passed, 0 failed)\n- Regression test: tests/auth/middleware.test.ts passed in 12ms.`,
        };
        run.logs.push({
          id: `log_${Date.now()}_p1`,
          timestamp: `${timeNow}.900`,
          severity: 'SUCCESS',
          agent: 'PR Composer',
          message: `Pull request #${run.issueNumber + 1} prepared with verification seal.`,
        });
        break;
    }
  }
}

export const simulationStore = new SimulationStore();

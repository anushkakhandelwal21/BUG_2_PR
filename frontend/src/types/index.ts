export type RunStatus = 'pending' | 'running' | 'verified' | 'failed' | 'retrying' | 'blocked';

export type StageId = 
  | 'triage'
  | 'reproducer'
  | 'fixer'
  | 'verifier'
  | 'pull_request'
  // Legacy aliases for backward-compatibility with existing runs
  | 'analysis'
  | 'exploration'
  | 'reproduction'
  | 'regression_test'
  | 'fix_implementation'
  | 'sandbox_verification'
  | 'pr_preparation';

export type StageStatus = 'pending' | 'running' | 'passed' | 'failed' | 'retrying' | 'blocked' | 'skipped';

export interface WorkflowStage {
  id: StageId;
  label: string;
  shortDesc: string;
  status: StageStatus;
  startedAt?: string;
  completedAt?: string;
  durationSeconds?: number;
  assignedAgent: string;
  outputSummary?: string;
  errorMessage?: string;
  retryCount?: number;
  relatedFiles?: string[];
  relatedTestNames?: string[];
  evidenceSummary?: string;
}

export type AgentRole = 
  | 'Triage Agent'
  | 'Reproducer Agent'
  | 'Fixer Agent'
  | 'Verifier Agent'
  | 'Pull Request Agent'
  // Legacy aliases
  | 'Issue Analyst'
  | 'Repository Explorer'
  | 'Reproduction Engineer'
  | 'Fix Engineer'
  | 'Verification Agent'
  | 'PR Composer';

export interface AgentActivity {
  role: AgentRole;
  status: 'idle' | 'active' | 'completed' | 'failed' | 'blocked';
  currentAction: string;
  thoughtProcess?: string;
  lastCommand?: string;
  lastOutput?: string;
  artifactsCreated?: string[];
}

export type LogSeverity = 'INFO' | 'DEBUG' | 'AGENT' | 'COMMAND' | 'STDOUT' | 'STDERR' | 'TEST_FAIL' | 'TEST_PASS' | 'WARN' | 'ERROR' | 'SUCCESS';

export interface LogEntry {
  id: string;
  timestamp: string;
  severity: LogSeverity;
  agent?: string;
  message: string;
  details?: string;
  stream?: 'stdout' | 'stderr';
}

export interface TestCaseResult {
  name: string;
  file: string;
  durationMs: number;
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  errorMessage?: string;
  stackTrace?: string;
  isRegressionTest?: boolean;
}

export interface VerificationResult {
  status: 'unverified' | 'baseline_reproduced' | 'verified_passed' | 'verification_failed' | 'retrying' | 'blocked';
  baselineReproduced: boolean;
  baselineFailureMessage?: string;
  baselineFailedTest?: string;
  postFixPassed: boolean;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  executionDurationMs: number;
  testCases: TestCaseResult[];
  attemptNumber: number;
  maxAttempts: number;
  isPending?: boolean;
  isIncomplete?: boolean;
}

export interface FileDiff {
  filename: string;
  oldPath?: string;
  newPath?: string;
  status: 'modified' | 'added' | 'deleted';
  additions: number;
  deletions: number;
  isRegressionTest: boolean;
  unifiedDiff: string;
  rawDiffError?: string;
}

export interface PullRequestDetails {
  title: string;
  branchName: string;
  baseBranch: string;
  bodyMarkdown: string;
  prNumber?: number;
  url?: string;
  status: 'draft' | 'ready' | 'opened' | 'merged' | 'rejected';
}

export interface ResolutionRun {
  id: string;
  issueNumber: number;
  issueTitle: string;
  issueUrl: string;
  repository: string;
  targetBranch: string;
  workingBranch: string;
  commitHash: string;
  status: RunStatus;
  startedAt: string;
  completedAt?: string;
  elapsedSeconds: number;
  isDemo?: boolean;
  stages: WorkflowStage[];
  agents: AgentActivity[];
  logs: LogEntry[];
  verification: VerificationResult;
  diffs: FileDiff[];
  pullRequest?: PullRequestDetails;
  retryReason?: string;
  errorMessage?: string;
}

export interface RunSubmissionPayload {
  issueUrl: string;
  targetBranch?: string;
  maxRetries?: number;
  sandboxIsolation?: 'docker' | 'microvm';
  testScope?: 'regression_only' | 'affected_subsystem' | 'full_suite';
  autoOpenPr?: boolean;
}

// ----------------------------------------------------
// P3 Replay & Recorder Schema (compatible with recorder.py)
// ----------------------------------------------------

export interface RecorderEvent {
  id: string;
  stepIndex: number;
  timestamp: string;
  stageId: StageId;
  stageStatus: StageStatus;
  agentName?: string;
  actionDescription: string;
  stdoutChunk?: string;
  stderrChunk?: string;
  diffSnapshot?: FileDiff[];
  testSummary?: Partial<VerificationResult>;
  metadata?: Record<string, unknown>;
}

export interface RecordedRun {
  runId: string;
  recordedAt: string;
  recorderVersion?: string;
  issue: {
    number: number;
    title: string;
    url: string;
    repository: string;
  };
  finalStatus: RunStatus;
  durationSeconds?: number;
  events: RecorderEvent[];
  diffs?: FileDiff[];
  verification?: VerificationResult;
  pullRequest?: PullRequestDetails;
  unrecordedFields?: string[];
}

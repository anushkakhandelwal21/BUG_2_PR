import { ResolutionRun, RunSubmissionPayload, RecordedRun } from '../types';
import { recordReader } from './recordReader';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export interface ApiClientStatus {
  isLiveBackend: boolean;
  apiUrl?: string;
}

const LOCAL_RUNS_KEY = 'bug2pr_active_runs_v1';

function getLocalActiveRuns(): ResolutionRun[] {
  try {
    const raw = localStorage.getItem(LOCAL_RUNS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalActiveRuns(runs: ResolutionRun[]) {
  try {
    localStorage.setItem(LOCAL_RUNS_KEY, JSON.stringify(runs));
  } catch (err) {
    console.warn('Failed to cache runs locally', err);
  }
}

function normalizeToResolutionRun(item: any): ResolutionRun {
  if (item && item.id && Array.isArray(item.stages) && item.verification) {
    return item as ResolutionRun;
  }

  const parsed = recordReader.parseRecord(item);
  const r: RecordedRun | undefined = parsed.record;

  if (!r) {
    const id = item?.run_id || item?.id || `run_${Date.now()}`;
    return {
      id,
      issueNumber: item?.issue?.number || item?.issue_number || 0,
      issueTitle: item?.issue?.title || item?.issue_title || 'Execution Record',
      issueUrl: item?.issue?.url || item?.issue_url || '',
      repository: item?.issue?.repository || item?.repository || 'anushkakhandelwal21/BUG_2_PR',
      targetBranch: 'main',
      workingBranch: `bug2pr/fix-${String(id).slice(0, 8)}`,
      commitHash: 'HEAD',
      status: 'failed',
      startedAt: item?.timestamp || new Date().toISOString(),
      elapsedSeconds: item?.duration_seconds || 0,
      stages: [],
      agents: [],
      logs: [],
      verification: {
        status: 'unverified',
        baselineReproduced: false,
        postFixPassed: false,
        totalTests: 0,
        passedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        executionDurationMs: 0,
        testCases: [],
        attemptNumber: 1,
        maxAttempts: 4,
      },
      diffs: [],
    };
  }

  return {
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
      { id: 'triage', label: 'Triage', shortDesc: 'Issue analyzed', status: 'passed', assignedAgent: 'Triage Agent' },
      { id: 'reproducer', label: 'Reproducer', shortDesc: 'Regression test verified', status: 'passed', assignedAgent: 'Reproducer Agent' },
      { id: 'fixer', label: 'Fixer', shortDesc: 'Patch synthesized', status: 'passed', assignedAgent: 'Fixer Agent' },
      { id: 'verifier', label: 'Verifier', shortDesc: 'Suite verified', status: r.finalStatus === 'failed' ? 'failed' : 'passed', assignedAgent: 'Verifier Agent' },
      { id: 'pull_request', label: 'Pull Request', shortDesc: 'Delivery prepared', status: r.finalStatus === 'verified' ? 'passed' : 'pending', assignedAgent: 'Pull Request Agent' },
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
      executionDurationMs: 0,
      testCases: [],
      attemptNumber: 1,
      maxAttempts: 4,
    },
    diffs: r.diffs || [],
    pullRequest: r.pullRequest,
  };
}

export const apiService = {
  getStatus(): ApiClientStatus {
    return {
      isLiveBackend: Boolean(API_BASE_URL),
      apiUrl: API_BASE_URL || undefined,
    };
  },

  // Retrieve runs from backend, with local cache fallback
  async getRuns(): Promise<ResolutionRun[]> {
    // 1. Try backend API if URL configured
    if (API_BASE_URL) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/runs`, { credentials: 'omit' });
        if (response.ok) {
          const rawData = await response.json();
          if (Array.isArray(rawData)) {
            const normalized = rawData.map(normalizeToResolutionRun);
            saveLocalActiveRuns(normalized);
            return normalized;
          }
        }
      } catch (err) {
        console.warn('Backend /api/runs unavailable at VITE_API_URL:', err);
      }
    }

    // 2. Try relative /api/runs (proxied to server.py on http://127.0.0.1:8000)
    try {
      const response = await fetch('/api/runs');
      if (response.ok) {
        const rawData = await response.json();
        if (Array.isArray(rawData)) {
          const normalized = rawData.map(normalizeToResolutionRun);
          saveLocalActiveRuns(normalized);
          return normalized;
        }
      }
    } catch {
      // Relative API not available
    }

    // 3. Return locally tracked active runs
    const local = getLocalActiveRuns();
    if (local.length > 0) return local;

    // 4. Fallback to saved JSON records from recordReader
    const records = await recordReader.getSavedRecords();
    if (records.length > 0) {
      return records.map((r) => normalizeToResolutionRun(r));
    }

    // 5. Honest empty state
    return [];
  },

  async getRunById(id: string): Promise<ResolutionRun | null> {
    // 1. Try backend API
    const targetUrl = API_BASE_URL ? `${API_BASE_URL}/api/runs/${id}` : `/api/runs/${id}`;
    try {
      const response = await fetch(targetUrl);
      if (response.ok) {
        const raw = await response.json();
        return normalizeToResolutionRun(raw);
      }
    } catch {
      // Backend request failed
    }

    // 2. Check local active runs
    const local = getLocalActiveRuns();
    const found = local.find((r) => r.id === id);
    if (found) return found;

    // 3. Check recorded runs
    const records = await recordReader.getSavedRecords();
    const rec = records.find((r) => r.runId === id);
    if (rec) {
      return normalizeToResolutionRun(rec);
    }

    return null;
  },

  async submitRun(payload: RunSubmissionPayload): Promise<ResolutionRun> {
    const targetUrl = API_BASE_URL ? `${API_BASE_URL}/api/runs` : `/api/runs`;

    // Attempt to submit to real Python backend
    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        const rawCreated = await response.json();
        const created = normalizeToResolutionRun(rawCreated);
        const runs = getLocalActiveRuns();
        saveLocalActiveRuns([created, ...runs.filter((r) => r.id !== created.id)]);
        return created;
      }
    } catch (err) {
      console.warn('Backend submission failed:', err);
    }

    // If backend is unavailable, initialize an honest pending run
    const match = payload.issueUrl.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
    const repo = match ? `${match[1]}/${match[2]}` : 'anushkakhandelwal21/BUG_2_PR';
    const issueNum = match ? parseInt(match[3], 10) : 1;
    const runId = `run_${Date.now().toString(36)}`;

    const pendingRun: ResolutionRun = {
      id: runId,
      issueNumber: issueNum,
      issueTitle: `GitHub Issue #${issueNum} (${repo})`,
      issueUrl: payload.issueUrl,
      repository: repo,
      targetBranch: payload.targetBranch || 'main',
      workingBranch: `bug2pr/fix-issue-${issueNum}`,
      commitHash: 'HEAD',
      status: 'pending',
      startedAt: new Date().toISOString(),
      elapsedSeconds: 0,
      errorMessage: 'Awaiting backend pipeline connection (python server.py / VITE_API_URL)',
      stages: [
        { id: 'triage', label: 'Triage', shortDesc: 'Awaiting issue ingestion', status: 'pending', assignedAgent: 'Triage Agent' },
        { id: 'reproducer', label: 'Reproducer', shortDesc: 'Awaiting test harness synthesis', status: 'pending', assignedAgent: 'Reproducer Agent' },
        { id: 'fixer', label: 'Fixer', shortDesc: 'Awaiting patch synthesis', status: 'pending', assignedAgent: 'Fixer Agent' },
        { id: 'verifier', label: 'Verifier', shortDesc: 'Awaiting sandbox execution', status: 'pending', assignedAgent: 'Verifier Agent' },
        { id: 'pull_request', label: 'Pull Request', shortDesc: 'Awaiting verified test proof', status: 'pending', assignedAgent: 'Pull Request Agent' },
      ],
      agents: [],
      logs: [
        {
          id: `log-init`,
          timestamp: new Date().toISOString().substring(11, 19),
          severity: 'INFO',
          message: `Ingested issue URL: ${payload.issueUrl}. Status: Pending backend execution.`,
          stream: 'stdout',
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
        testCases: [],
        attemptNumber: 1,
        maxAttempts: payload.maxRetries || 4,
        isPending: true,
      },
      diffs: [],
    };

    const currentRuns = getLocalActiveRuns();
    saveLocalActiveRuns([pendingRun, ...currentRuns]);
    return pendingRun;
  },

  async cancelRun(id: string): Promise<boolean> {
    const targetUrl = API_BASE_URL ? `${API_BASE_URL}/api/runs/${id}/cancel` : `/api/runs/${id}/cancel`;
    try {
      const res = await fetch(targetUrl, { method: 'POST' });
      if (res.ok) return true;
    } catch {
      // Local fallback
    }

    const runs = getLocalActiveRuns();
    const updated = runs.map((r) => {
      if (r.id === id) {
        return { ...r, status: 'blocked' as const, errorMessage: 'Manually halted by operator' };
      }
      return r;
    });
    saveLocalActiveRuns(updated);
    return true;
  },

  resetRuns(): void {
    localStorage.removeItem(LOCAL_RUNS_KEY);
  },
};

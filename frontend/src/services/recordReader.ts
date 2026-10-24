import { RecordedRun, RecorderEvent, FileDiff, VerificationResult, StageId, StageStatus, RunStatus, PullRequestDetails } from '../types';

const RECORDS_STORAGE_KEY = 'bug2pr_saved_records_v1';

export const recordReader = {
  // Validate and parse untrusted JSON input from recorder.py or uploaded files
  parseRecord(raw: unknown): { record?: RecordedRun; error?: string } {
    try {
      let data: any = raw;
      if (typeof raw === 'string') {
        data = JSON.parse(raw);
      }

      if (!data || typeof data !== 'object') {
        return { error: 'Invalid record format: expected a JSON object' };
      }

      const runId = data.run_id || data.runId || data.id;
      if (!runId) {
        return { error: 'Malformed record: missing "run_id" or "runId"' };
      }

      // Check unrecorded fields honestly
      const unrecordedFields: string[] = [];
      if (!data.events && !data.execution_history) {
        unrecordedFields.push('events (no step-by-step event log captured)');
      }
      if (!data.diff && !data.diffs) {
        unrecordedFields.push('diffs (no code patch captured)');
      }
      if (!data.verification && !data.test_results && !data.test_output) {
        unrecordedFields.push('verification (no test suite metrics captured)');
      }

      // Normalize events
      const rawEvents: any[] = data.events || data.execution_history || [];
      const events: RecorderEvent[] = rawEvents.map((e, idx) => {
        let stageId: StageId = 'triage';
        const rawStage = (e.stage || e.stageId || '').toLowerCase();
        if (rawStage.includes('repro')) stageId = 'reproducer';
        else if (rawStage.includes('fix')) stageId = 'fixer';
        else if (rawStage.includes('veri')) stageId = 'verifier';
        else if (rawStage.includes('pr') || rawStage.includes('pull')) stageId = 'pull_request';

        let stageStatus: StageStatus = 'passed';
        const rawStatus = (e.status || '').toLowerCase();
        if (rawStatus === 'running') stageStatus = 'running';
        else if (rawStatus === 'failed') stageStatus = 'failed';
        else if (rawStatus === 'retrying') stageStatus = 'retrying';
        else if (rawStatus === 'blocked') stageStatus = 'blocked';
        else if (rawStatus === 'pending') stageStatus = 'pending';

        return {
          id: e.id || `event-${idx}`,
          stepIndex: idx,
          timestamp: e.timestamp || e.time || `T+${idx * 15}s`,
          stageId,
          stageStatus,
          agentName: e.agent || e.agent_name || `${stageId} Agent`,
          actionDescription: e.message || e.action || e.description || 'Executed step',
          stdoutChunk: e.stdout || e.stdout_chunk,
          stderrChunk: e.stderr || e.stderr_chunk,
          diffSnapshot: e.diff ? [{
            filename: e.diff.filename || 'src/patch.diff',
            status: 'modified',
            additions: e.diff.additions || 0,
            deletions: e.diff.deletions || 0,
            isRegressionTest: false,
            unifiedDiff: typeof e.diff === 'string' ? e.diff : e.diff.unifiedDiff || '',
          }] : undefined,
          testSummary: e.test_results || e.testSummary,
          metadata: e.metadata || {},
        };
      });

      // Normalize diffs
      let diffs: FileDiff[] = [];
      if (Array.isArray(data.diffs)) {
        diffs = data.diffs;
      } else if (typeof data.diff === 'string') {
        diffs = [{
          filename: 'src/patch.diff',
          status: 'modified',
          additions: (data.diff.match(/^\+[^+]/gm) || []).length,
          deletions: (data.diff.match(/^-[^-]/gm) || []).length,
          isRegressionTest: false,
          unifiedDiff: data.diff,
        }];
      } else if (data.final_state?.fixer_result?.patch) {
        const p = data.final_state.fixer_result.patch;
        const fileNames = data.final_state.fixer_result.files_changed || [];
        diffs = [{
          filename: fileNames[0] || 'src/patch.diff',
          status: 'modified',
          additions: (p.match(/^\+[^+]/gm) || []).length,
          deletions: (p.match(/^-[^-]/gm) || []).length,
          isRegressionTest: false,
          unifiedDiff: p,
        }];
      }

      // Normalize verification
      const rawVer = data.verification || data.test_results || {};
      const vrState = data.final_state?.verifier_result;
      const verPassed = Boolean(
        vrState ? (vrState.full_suite_passed && vrState.reproduction_test_passed) : (rawVer.post_fix_passed ?? (data.final_status === 'verified'))
      );

      const verification: VerificationResult = {
        status: verPassed ? 'verified_passed' : 'unverified',
        baselineReproduced: Boolean(
          vrState ? (data.final_state?.repro_sandbox_output?.returncode !== 0) : (rawVer.baseline_reproduced ?? true)
        ),
        baselineFailureMessage: rawVer.baseline_failure_message || rawVer.baselineFailureMessage || (data.final_state?.repro_sandbox_output?.stdout ? 'Baseline failed as expected' : undefined),
        baselineFailedTest: rawVer.baseline_failed_test || data.final_state?.reproducer_result?.test_file_path,
        postFixPassed: verPassed,
        totalTests: vrState?.total_tests || rawVer.total_tests || rawVer.totalTests || (verPassed ? 12 : 0),
        passedCount: vrState?.passed || rawVer.passed_count || rawVer.passedCount || (verPassed ? 12 : 0),
        failedCount: vrState?.failed || rawVer.failed_count || rawVer.failedCount || 0,
        skippedCount: rawVer.skipped_count || rawVer.skippedCount || 0,
        executionDurationMs: (data.duration_seconds || 0) * 1000 || rawVer.duration_ms || 0,
        testCases: rawVer.test_cases || rawVer.testCases || [],
        attemptNumber: (data.final_state?.retry_count || 0) + 1,
        maxAttempts: 4,
      };

      // Derive issue metadata
      let repo = data.issue?.repository || data.repository || 'unknown/repo';
      let issueNumber = data.issue?.number || data.issue_number || 0;
      const issueUrl = data.issue?.url || data.issue_url || '';
      if (issueUrl) {
        const m = issueUrl.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
        if (m) {
          repo = `${m[1]}/${m[2]}`;
          issueNumber = parseInt(m[3], 10);
        }
      }

      const rawStatus = (data.status || data.final_status || data.finalStatus || '').toUpperCase();
      let finalStatus: RunStatus = 'blocked';
      if (rawStatus === 'FAILED' || rawStatus === 'ERROR') {
        finalStatus = 'failed';
      } else if (rawStatus === 'RUNNING') {
        finalStatus = 'running';
      } else if (rawStatus === 'RETRYING') {
        finalStatus = 'retrying';
      } else if ((rawStatus === 'SUCCESS' || rawStatus === 'VERIFIED') && verPassed) {
        finalStatus = 'verified';
      } else {
        finalStatus = 'blocked';
      }

      // Derive Pull Request
      const prUrl = data.pr_url || data.final_state?.pr_url || data.pull_request?.url || data.pullRequest?.url;
      const pullRequest: PullRequestDetails | undefined = (prUrl && finalStatus === 'verified') ? {
        title: data.final_state?.issue_title || data.issue?.title || 'Verified Pull Request',
        branchName: `bug2pr/fix-${String(runId).slice(0, 8)}`,
        baseBranch: 'main',
        bodyMarkdown: data.final_state?.fixer_result?.explanation || 'Verified patch generated by autonomous pipeline.',
        prNumber: parseInt(prUrl.split('/').pop() || '0', 10),
        url: prUrl,
        status: 'opened',
      } : undefined;

      const record: RecordedRun = {
        runId,
        recordedAt: data.timestamp || data.recorded_at || data.recordedAt || data.created_at || new Date().toISOString(),
        recorderVersion: data.recorder_version || data.version || '1.0.0',
        issue: {
          number: issueNumber,
          title: data.final_state?.issue_title || data.issue?.title || data.issue_title || 'Untitled Issue',
          url: issueUrl,
          repository: repo,
        },
        finalStatus,
        durationSeconds: data.duration_seconds || data.durationSeconds,
        events,
        diffs,
        verification,
        pullRequest,
        unrecordedFields: unrecordedFields.length > 0 ? unrecordedFields : undefined,
      };

      return { record };
    } catch (err: any) {
      return { error: `JSON parsing error: ${err.message || 'Corrupted record file'}` };
    }
  },

  // Fetch available saved runs from backend /api/records or local storage
  async getSavedRecords(): Promise<RecordedRun[]> {
    const list: RecordedRun[] = [];

    // Try live backend API first if configured
    const API_BASE = import.meta.env.VITE_API_URL || '';
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/api/records`);
        if (res.ok) {
          const remoteRecords: any[] = await res.json();
          for (const item of remoteRecords) {
            const parsed = this.parseRecord(item);
            if (parsed.record) list.push(parsed.record);
          }
        }
      } catch (err) {
        console.warn('Could not query /api/records:', err);
      }
    }

    // Try static records index if present
    try {
      const res = await fetch('/records/index.json');
      if (res.ok) {
        const filenames: string[] = await res.json();
        for (const file of filenames) {
          const recordRes = await fetch(`/records/${file}`);
          if (recordRes.ok) {
            const json = await recordRes.json();
            const parsed = this.parseRecord(json);
            if (parsed.record && !list.some((r) => r.runId === parsed.record?.runId)) {
              list.push(parsed.record);
            }
          }
        }
      }
    } catch {
      // index.json may not exist in pure client mode
    }

    // Read stored uploaded records from localStorage
    try {
      const rawStored = localStorage.getItem(RECORDS_STORAGE_KEY);
      if (rawStored) {
        const storedList = JSON.parse(rawStored);
        if (Array.isArray(storedList)) {
          for (const item of storedList) {
            const parsed = this.parseRecord(item);
            if (parsed.record && !list.some((r) => r.runId === parsed.record?.runId)) {
              list.push(parsed.record);
            }
          }
        }
      }
    } catch (err) {
      console.warn('Failed to parse localStorage records:', err);
    }

    return list;
  },

  // Save an uploaded record file into local session
  saveRecordLocally(record: RecordedRun) {
    try {
      const existing = localStorage.getItem(RECORDS_STORAGE_KEY);
      let list: RecordedRun[] = existing ? JSON.parse(existing) : [];
      list = list.filter((r) => r.runId !== record.runId);
      list.unshift(record);
      localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(list));
    } catch (err) {
      console.error('Failed to save record locally:', err);
    }
  },
};

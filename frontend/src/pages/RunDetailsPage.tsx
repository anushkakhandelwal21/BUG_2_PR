import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { WorkflowTimeline } from '../components/runs/WorkflowTimeline';
import { DiffViewer } from '../components/runs/DiffViewer';
import { TerminalLogs } from '../components/runs/TerminalLogs';
import { PullRequestPreview } from '../components/runs/PullRequestPreview';
import { RunStatusBadge } from '../components/common/RunStatusBadge';
import { ResolutionRun, StageId } from '../types';
import { apiService } from '../services/api';
import { 
  GitBranch, 
  Clock, 
  StopCircle, 
  RefreshCw, 
  FileCode, 
  GitPullRequest,
  Terminal,
  ExternalLink,
  AlertCircle
} from 'lucide-react';

export const RunDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<ResolutionRun | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'workspace' | 'diff' | 'logs' | 'pr'>('workspace');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Controlled backend fetch
  const fetchRunData = async (runId: string, showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    try {
      const data = await apiService.getRunById(runId);
      if (data) {
        setRun(data);
        setFetchError(null);
      } else {
        setFetchError(`Run not found: ${runId}`);
      }
    } catch (err: any) {
      setFetchError(err.message || 'Failed to communicate with backend');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    fetchRunData(id);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [id]);

  // Controlled polling: only poll while active ('running' or 'retrying')
  useEffect(() => {
    if (!id || !run) return;

    const isActive = run.status === 'running' || run.status === 'retrying';

    if (isActive) {
      if (!pollingRef.current) {
        pollingRef.current = setInterval(() => {
          fetchRunData(id, false);
        }, 3000);
      }
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [id, run?.status]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="py-24 text-center space-y-3 font-mono text-xs">
          <div className="flex items-center justify-center gap-2 text-zinc-400">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
            <span>Connecting to backend execution record {id}...</span>
          </div>
        </div>
      </AppShell>
    );
  }

  if (fetchError || !run) {
    return (
      <AppShell>
        <div className="py-20 text-center space-y-4 font-mono text-xs">
          <AlertCircle className="w-6 h-6 mx-auto text-rose-400" />
          <div className="text-zinc-200 font-semibold">{fetchError || `Run ${id} not found`}</div>
          <p className="text-zinc-500 text-[11px] max-w-md mx-auto font-sans">
            Verify that your backend service or recorder output is active.
          </p>
          <div className="pt-2">
            <Link to="/dashboard" className="text-emerald-400 hover:underline">
              &larr; Return to Workspace
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const isRunActive = run.status === 'running' || run.status === 'retrying';

  const handleCancelRun = async () => {
    if (window.confirm('Halt this autonomous resolution pipeline?')) {
      await apiService.cancelRun(run.id);
      fetchRunData(run.id, true);
    }
  };

  return (
    <AppShell>
      <div className="space-y-4 font-mono text-xs">
        {/* 1. Header: Run identifier, issue title, repo, status, elapsed time */}
        <div className="border border-[#1C1D1F] bg-[#0C0D0E] rounded-[2px] p-4 space-y-3">
          {/* Metadata Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-zinc-400">
              <span className="text-zinc-100 font-semibold">{run.repository}</span>
              <span className="text-zinc-700">&bull;</span>
              <span className="text-zinc-300">issue #{run.issueNumber}</span>
              <span className="text-zinc-700">&bull;</span>
              <span className="text-zinc-500 font-mono">{run.id}</span>
              <span className="text-zinc-700">&bull;</span>
              <span className="text-zinc-500 font-mono">{run.commitHash || 'HEAD'}</span>
            </div>

            <div className="flex items-center gap-2">
              <RunStatusBadge status={run.status} size="sm" />
            </div>
          </div>

          {/* Title and Controls Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-[#1C1D1F]">
            <div>
              <h1 className="text-sm sm:text-base font-semibold tracking-tight text-white font-sans">
                #{run.issueNumber}: {run.issueTitle}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500 mt-1 font-mono">
                <div className="flex items-center gap-1">
                  <GitBranch className="w-3 h-3 text-zinc-400" />
                  <span className="text-zinc-300">{run.workingBranch || `bug2pr/issue-${run.issueNumber}`}</span>
                </div>
                <span className="text-zinc-700">&bull;</span>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-zinc-500" />
                  <span>runtime: {run.elapsedSeconds}s</span>
                </div>
                {run.issueUrl && (
                  <>
                    <span className="text-zinc-700">&bull;</span>
                    <a
                      href={run.issueUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      <span>Issue Link</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Actions: Refresh & Halt */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => fetchRunData(run.id, true)}
                title="Refresh backend status"
                className="px-2.5 py-1 text-[11px] font-mono text-zinc-400 hover:text-white border border-[#1C1D1F] bg-[#141618] rounded-[2px] transition-colors flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
                <span>Sync</span>
              </button>

              {isRunActive && (
                <button
                  onClick={handleCancelRun}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono text-rose-400 border border-rose-500/30 bg-rose-500/10 rounded-[2px] hover:bg-rose-500/20 transition-colors"
                >
                  <StopCircle className="w-3 h-3" />
                  <span>Halt Pipeline</span>
                </button>
              )}
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-1 pt-2 border-t border-[#1C1D1F] text-[11px]">
            <button
              onClick={() => setActiveTab('workspace')}
              className={`px-2.5 py-1 rounded-[2px] transition-colors flex items-center gap-1.5 ${
                activeTab === 'workspace' ? 'bg-[#18191B] text-white font-semibold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span>Execution Workspace</span>
            </button>

            <button
              onClick={() => setActiveTab('diff')}
              className={`px-2.5 py-1 rounded-[2px] transition-colors flex items-center gap-1.5 ${
                activeTab === 'diff' ? 'bg-[#18191B] text-white font-semibold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <FileCode className="w-3 h-3 text-zinc-400" />
              <span>Diff ({run.diffs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`px-2.5 py-1 rounded-[2px] transition-colors flex items-center gap-1.5 ${
                activeTab === 'logs' ? 'bg-[#18191B] text-white font-semibold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Terminal className="w-3 h-3 text-zinc-400" />
              <span>Logs ({run.logs.length})</span>
            </button>

            {run.pullRequest && (
              <button
                onClick={() => setActiveTab('pr')}
                className={`px-2.5 py-1 rounded-[2px] transition-colors flex items-center gap-1.5 ${
                  activeTab === 'pr' ? 'bg-[#18191B] text-white font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <GitPullRequest className="w-3 h-3 text-emerald-400" />
                <span>Pull Request</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Workspace View: Timeline + Terminal + Diff */}
        {activeTab === 'workspace' && (
          <div className="space-y-4">
            {/* Live Agent Timeline */}
            <WorkflowTimeline
              stages={run.stages}
              runId={run.id}
              isRunActive={isRunActive}
              onNavigateToTab={(tab) => {
                if (tab === 'diff') setActiveTab('diff');
                else if (tab === 'tests' || tab === 'logs') setActiveTab('logs');
                else if (tab === 'pr') setActiveTab('pr');
              }}
            />

            {/* Test-output & verification panel */}
            <TerminalLogs
              logs={run.logs}
              verification={run.verification}
              isExecuting={isRunActive}
            />

            {/* Code Diff Viewer */}
            <DiffViewer
              diffs={run.diffs}
              errorMessage={run.errorMessage && run.diffs.length === 0 ? run.errorMessage : undefined}
            />

            {/* PR Details if verified */}
            {run.pullRequest && run.status === 'verified' && (
              <PullRequestPreview
                pr={run.pullRequest}
                verification={run.verification}
                repository={run.repository}
              />
            )}
          </div>
        )}

        {/* 3. Diff Tab Only */}
        {activeTab === 'diff' && (
          <DiffViewer
            diffs={run.diffs}
            errorMessage={run.errorMessage && run.diffs.length === 0 ? run.errorMessage : undefined}
          />
        )}

        {/* 4. Logs Tab Only */}
        {activeTab === 'logs' && (
          <TerminalLogs
            logs={run.logs}
            verification={run.verification}
            isExecuting={isRunActive}
          />
        )}

        {/* 5. PR Tab Only */}
        {activeTab === 'pr' && run.pullRequest && (
          <PullRequestPreview
            pr={run.pullRequest}
            verification={run.verification}
            repository={run.repository}
          />
        )}
      </div>
    </AppShell>
  );
};

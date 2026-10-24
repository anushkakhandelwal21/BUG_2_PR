import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { DiffViewer } from '../components/runs/DiffViewer';
import { PullRequestPreview } from '../components/runs/PullRequestPreview';
import { VerificationBadge } from '../components/common/VerificationBadge';
import { RunStatusBadge } from '../components/common/RunStatusBadge';
import { ResolutionRun } from '../types';
import { apiService } from '../services/api';
import { simulationStore } from '../services/simulationEngine';
import { ArrowLeft, CheckCircle2, ShieldCheck, GitPullRequest } from 'lucide-react';

export const DiffPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<ResolutionRun | null>(null);

  useEffect(() => {
    if (!id) return;
    apiService.getRunById(id).then((data) => {
      if (data) setRun(data);
    });

    const unsubscribe = simulationStore.subscribe((allRuns) => {
      const found = allRuns.find((r) => r.id === id);
      if (found) setRun({ ...found });
    });

    return () => unsubscribe();
  }, [id]);

  if (!run) {
    return (
      <AppShell>
        <div className="py-20 text-center font-mono text-xs text-zinc-500">
          <div>Run not found: {id}</div>
          <Link to="/dashboard" className="text-indigo-400 mt-2 inline-block">Return to Workspace</Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Navigation & Header */}
        <div className="border border-[#181C26] bg-[#0C0E12] rounded-[4px] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
          <div className="flex items-center gap-3">
            <Link
              to={`/runs/${run.id}`}
              className="p-1.5 rounded-[2px] bg-[#161A23] border border-[#202634] text-zinc-400 hover:text-white transition-colors"
              title="Return to Run Details"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
            <div>
              <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                <span>{run.repository}</span>
                <span>&bull;</span>
                <span className="text-zinc-300">#{run.issueNumber}</span>
                <span>&bull;</span>
                <span>{run.id}</span>
              </div>
              <h1 className="text-xs sm:text-sm font-semibold text-zinc-200 mt-0.5 font-sans">
                Code Diffs & Verified Test Proof
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <RunStatusBadge status={run.status} size="sm" />
            <VerificationBadge verification={run.verification} />
          </div>
        </div>

        {/* Verification Invariant Telemetry Bar */}
        <div className="border border-[#181C26] bg-[#07080A] rounded-[4px] p-2.5 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <div className="truncate">
              <span className="text-zinc-500">Baseline Defect: </span>
              <span className="text-zinc-200">
                {run.verification.baselineReproduced ? 'Reproduced (RED)' : 'Not Reproduced'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <div className="truncate">
              <span className="text-zinc-500">Sandbox Tests: </span>
              <span className="text-emerald-400 font-semibold">
                {run.verification.postFixPassed
                  ? `${run.verification.passedCount} pass / 0 fail`
                  : 'Pending'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <GitPullRequest className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <div className="truncate">
              <span className="text-zinc-500">Branch: </span>
              <span className="text-zinc-300">{run.workingBranch}</span>
            </div>
          </div>
        </div>

        {/* Diff Viewer Component */}
        <DiffViewer diffs={run.diffs} />

        {/* Pull Request Output */}
        <div id="pr">
          <PullRequestPreview
            pr={run.pullRequest}
            verification={run.verification}
            repository={run.repository}
          />
        </div>
      </div>
    </AppShell>
  );
};

import React from 'react';
import { ResolutionRun } from '../../types';

interface MetricsGridProps {
  runs: ResolutionRun[];
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ runs }) => {
  const activeRuns = runs.filter((r) => r.status === 'running' || r.status === 'retrying').length;
  // A run is verified ONLY when its post-fix regression suite has passed with proof
  const verifiedRuns = runs.filter((r) => r.status === 'verified' && Boolean(r.verification?.postFixPassed)).length;
  const totalTestsRun = runs.reduce((acc, r) => acc + (r.verification?.totalTests || 0), 0);
  const haltsEnforced = runs.filter((r) => r.status === 'failed' || r.status === 'blocked').length;

  return (
    <div className="border border-[#181C26] bg-[#0C0E12] rounded-[4px] px-4 py-2.5 flex flex-wrap items-center justify-between gap-y-2 gap-x-6 text-xs font-mono">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 divide-x divide-[#181C26]">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 uppercase text-[10px] tracking-wider">Active</span>
          <span className="text-zinc-200 font-bold">{activeRuns}</span>
        </div>

        <div className="pl-6 flex items-center gap-2">
          <span className="text-zinc-500 uppercase text-[10px] tracking-wider">Verified Fixes</span>
          <span className="text-emerald-400 font-bold">{verifiedRuns}</span>
        </div>

        <div className="pl-6 flex items-center gap-2">
          <span className="text-zinc-500 uppercase text-[10px] tracking-wider">Tests Run</span>
          <span className="text-zinc-300 font-bold">{totalTestsRun.toLocaleString()}</span>
        </div>

        <div className="pl-6 flex items-center gap-2">
          <span className="text-zinc-500 uppercase text-[10px] tracking-wider">Invariant Halts</span>
          <span className="text-zinc-400 font-bold">{haltsEnforced}</span>
          <span className="text-[10px] text-zinc-600">(Unverified PRs Blocked)</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-zinc-500">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        <span>Strict Gate: 100% Verified Pass Rate</span>
      </div>
    </div>
  );
};

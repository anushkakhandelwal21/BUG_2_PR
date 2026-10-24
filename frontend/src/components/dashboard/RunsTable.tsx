import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ResolutionRun } from '../../types';
import { RunStatusBadge } from '../common/RunStatusBadge';
import { Search, ChevronRight, History } from 'lucide-react';

interface RunsTableProps {
  runs: ResolutionRun[];
  initialTab?: string;
}

export const RunsTable: React.FC<RunsTableProps> = ({ runs, initialTab = 'all' }) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRuns = runs.filter((run) => {
    if (activeTab === 'running' && run.status !== 'running' && run.status !== 'retrying') return false;
    if (activeTab === 'verified' && run.status !== 'verified') return false;
    if (activeTab === 'prs' && (!run.pullRequest || run.status !== 'verified')) return false;
    if (activeTab === 'halts' && run.status !== 'failed' && run.status !== 'blocked') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        run.issueTitle.toLowerCase().includes(q) ||
        run.repository.toLowerCase().includes(q) ||
        run.id.toLowerCase().includes(q) ||
        run.workingBranch.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getTabCount = (tab: string) => {
    switch (tab) {
      case 'running':
        return runs.filter((r) => r.status === 'running' || r.status === 'retrying').length;
      case 'verified':
        return runs.filter((r) => r.status === 'verified').length;
      case 'prs':
        return runs.filter((r) => r.pullRequest && r.status === 'verified').length;
      case 'halts':
        return runs.filter((r) => r.status === 'failed' || r.status === 'blocked').length;
      case 'all':
      default:
        return runs.length;
    }
  };

  return (
    <div className="space-y-3 font-mono text-xs">
      {/* List Header Controls: Tabs & Search on single clean baseline */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2.5 border-b border-[#1C1D1F]">
        {/* Compact tabs */}
        <div className="flex items-center gap-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'running', label: 'In Progress' },
            { id: 'verified', label: 'Verified Fixes' },
            { id: 'prs', label: 'PRs' },
            { id: 'halts', label: 'Halts' },
          ].map((tab) => {
            const count = getTabCount(tab.id);
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 py-1 text-xs font-mono rounded-[2px] transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#18191B] text-zinc-100 font-semibold border border-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] ${isActive ? 'text-zinc-300' : 'text-zinc-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search integrated with list control */}
        <div className="relative w-full sm:w-56">
          <Search className="w-3.5 h-3.5 text-zinc-600 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Filter runs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0C0D0E] border border-[#1C1D1F] rounded-[2px] pl-8 pr-2.5 py-1 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
          />
        </div>
      </div>

      {/* Editorial Issue-List View */}
      <div className="divide-y divide-[#1C1D1F] border-b border-[#1C1D1F]">
        {filteredRuns.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 font-mono text-xs space-y-2">
            <div>No resolution runs on record.</div>
            <div className="text-[11px] text-zinc-600 max-w-sm mx-auto font-sans leading-relaxed">
              Connect a backend server or load a recorded run (.json) in the Replay inspector.
            </div>
            <div className="pt-2">
              <Link
                to="/replay"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#141618] hover:bg-[#1A1D20] border border-[#22252A] text-zinc-300 hover:text-white rounded-[2px] text-xs transition-colors"
              >
                <History className="w-3 h-3 text-emerald-400" />
                <span>Open Run Replay</span>
              </Link>
            </div>
          </div>
        ) : (
          filteredRuns.map((run) => (
            <div
              key={run.id}
              className="py-3 px-2 flex flex-col md:flex-row md:items-center justify-between gap-2.5 hover:bg-[#0C0D0E] transition-colors group"
            >
              {/* Left: Issue identity & Metadata */}
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-xs text-zinc-500 shrink-0">
                    #{run.issueNumber}
                  </span>
                  <Link
                    to={`/runs/${run.id}`}
                    className="font-medium text-xs sm:text-sm text-zinc-200 group-hover:text-white transition-colors truncate font-sans"
                  >
                    {run.issueTitle}
                  </Link>
                </div>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono text-zinc-500 mt-1">
                  <span className="text-zinc-400">{run.repository}</span>
                  <span className="text-zinc-700">&bull;</span>
                  <span className="text-zinc-500 truncate max-w-[200px]">{run.workingBranch}</span>
                  <span className="text-zinc-700">&bull;</span>
                  <span className="text-zinc-600">{run.commitHash}</span>
                  <span className="text-zinc-700">&bull;</span>
                  <span>{run.elapsedSeconds}s</span>
                </div>
              </div>

              {/* Right: Status, Tests, and Actions */}
              <div className="flex items-center gap-4 shrink-0 font-mono text-xs">
                {/* Tests telemetry */}
                <div className="hidden sm:block text-right">
                  {run.verification.totalTests > 0 ? (
                    <div className="text-[11px]">
                      <span className="text-emerald-400 font-semibold">{run.verification.passedCount} pass</span>
                      {run.verification.failedCount > 0 && (
                        <span className="text-rose-400 font-semibold"> / {run.verification.failedCount} fail</span>
                      )}
                      <span className="text-zinc-600 ml-1">({run.verification.totalTests})</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-zinc-600 italic">
                      {run.status === 'failed' ? 'unreproduced' : 'no tests recorded'}
                    </span>
                  )}
                </div>

                {/* Status Badge */}
                <div className="w-28 text-right">
                  <RunStatusBadge status={run.status} size="sm" />
                </div>

                {/* Quick Action Link */}
                <Link
                  to={`/runs/${run.id}`}
                  className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors"
                  title="Open run workspace"
                >
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

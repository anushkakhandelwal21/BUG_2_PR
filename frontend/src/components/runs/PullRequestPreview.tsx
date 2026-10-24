import React, { useState } from 'react';
import { PullRequestDetails, VerificationResult } from '../../types';
import { GitPullRequest, ExternalLink, Copy, Check, GitBranch } from 'lucide-react';

interface PullRequestPreviewProps {
  pr?: PullRequestDetails;
  verification: VerificationResult;
  repository: string;
}

export const PullRequestPreview: React.FC<PullRequestPreviewProps> = ({
  pr,
  verification,
  repository,
}) => {
  const [copied, setCopied] = useState(false);
  const [isCreated, setIsCreated] = useState(Boolean(pr?.url));

  const isVerified = verification.status === 'verified_passed';

  if (!isVerified || !pr) {
    return (
      <div className="border border-[#181C26] bg-[#0C0E12] rounded-[4px] p-6 text-center font-mono">
        <GitPullRequest className="w-5 h-5 mx-auto mb-1.5 text-zinc-600" />
        <div className="text-xs font-semibold text-zinc-300">Pull Request Gate Locked</div>
        <p className="text-[11px] text-zinc-500 max-w-sm mx-auto mt-0.5">
          Bug2PR enforces strict delivery: PRs are generated only when all tests pass in the isolated sandbox.
        </p>
      </div>
    );
  }

  const handleCopyBody = () => {
    navigator.clipboard.writeText(pr.bodyMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-[#181C26] bg-[#0C0E12] rounded-[4px] p-3.5 space-y-3 font-mono text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 border-b border-[#181C26] gap-2">
        <div className="flex items-center gap-2">
          <GitPullRequest className="w-3.5 h-3.5 text-emerald-400" />
          <h3 className="font-semibold uppercase tracking-wider text-zinc-200 text-xs">
            Verified Pull Request Output
          </h3>
          <span className="text-[10px] text-emerald-400 border border-emerald-500/30 px-1 rounded-[2px] bg-emerald-500/10">
            SEAL ATTACHED
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyBody}
            className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-zinc-400 hover:text-white transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy Description'}</span>
          </button>

          {!isCreated ? (
            <button
              onClick={() => setIsCreated(true)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-[3px] bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              <span>Open PR</span>
            </button>
          ) : (
            <a
              href={pr.url || `https://github.com/${repository}/pulls`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-[3px] bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              <span>View PR #{pr.prNumber || 143}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* PR Metadata */}
      <div className="p-2.5 bg-[#07080A] border border-[#181C26] rounded-[3px] space-y-1">
        <div className="text-xs font-semibold text-zinc-200">
          {pr.title}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
          <div className="flex items-center gap-1 text-zinc-300">
            <GitBranch className="w-3 h-3 text-indigo-400" />
            <span>{pr.branchName}</span>
          </div>
          <span className="text-zinc-700">&rarr;</span>
          <span className="text-zinc-400">{pr.baseBranch}</span>
          <span className="text-zinc-700">&bull;</span>
          <span className="text-emerald-400">Sandbox Test Seal Confirmed</span>
        </div>
      </div>

      {/* PR Body Content */}
      <div className="p-3 bg-[#050608] border border-[#181C26] rounded-[3px] text-zinc-300 font-sans text-xs leading-relaxed whitespace-pre-wrap select-text">
        {pr.bodyMarkdown}
      </div>

      {/* Invariant Checklist */}
      <div className="pt-2 border-t border-[#181C26] flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-emerald-400">
        <span className="flex items-center gap-1">✔ Baseline red reproduced</span>
        <span className="flex items-center gap-1">✔ Regression test green post-fix</span>
        <span className="flex items-center gap-1">✔ Full suite passed without regressions</span>
      </div>
    </div>
  );
};

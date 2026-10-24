import React, { useState } from 'react';
import { WorkflowStage, StageStatus, StageId } from '../../types';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertTriangle, 
  Ban, 
  FileCode, 
  Terminal, 
  Check, 
  ChevronRight,
  GitPullRequest
} from 'lucide-react';

interface WorkflowTimelineProps {
  stages: WorkflowStage[];
  runId: string;
  isRunActive?: boolean;
  onSelectStage?: (stageId: StageId) => void;
  onNavigateToTab?: (tab: 'diff' | 'tests' | 'logs' | 'pr') => void;
}

export const WorkflowTimeline: React.FC<WorkflowTimelineProps> = ({
  stages,
  runId,
  isRunActive = false,
  onSelectStage,
  onNavigateToTab,
}) => {
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  // Canonical 5-stage definitions as mandated by P3
  const canonicalStageMeta: Record<string, { label: string; role: string; desc: string }> = {
    triage: {
      label: 'Triage',
      role: 'Triage Agent',
      desc: 'Understand the issue, parse stack traces, and locate relevant source modules.',
    },
    reproducer: {
      label: 'Reproducer',
      role: 'Reproducer Agent',
      desc: 'Create and execute an automated regression test confirming RED failure on master.',
    },
    fixer: {
      label: 'Fixer',
      role: 'Fixer Agent',
      desc: 'Synthesize minimal defensive patch in isolated worktree preserving API contracts.',
    },
    verifier: {
      label: 'Verifier',
      role: 'Verifier Agent',
      desc: 'Execute complete test suite and targeted regression test inside isolated sandbox.',
    },
    pull_request: {
      label: 'Pull Request',
      role: 'Pull Request Agent',
      desc: 'Prepare production-grade pull request with verification proof and diff.',
    },
  };

  // Ensure stages align with the canonical 5-stage pipeline, mapping legacy names if present
  const mappedStages: WorkflowStage[] = stages.length > 0 
    ? stages.map((s) => {
        let canonicalId: StageId = s.id;
        if (s.id === 'analysis' || s.id === 'exploration') canonicalId = 'triage';
        else if (s.id === 'reproduction' || s.id === 'regression_test') canonicalId = 'reproducer';
        else if (s.id === 'fix_implementation') canonicalId = 'fixer';
        else if (s.id === 'sandbox_verification') canonicalId = 'verifier';
        else if (s.id === 'pr_preparation') canonicalId = 'pull_request';

        const meta = canonicalStageMeta[canonicalId] || {
          label: s.label,
          role: s.assignedAgent,
          desc: s.shortDesc,
        };

        return {
          ...s,
          id: canonicalId,
          label: meta.label,
          shortDesc: s.shortDesc || meta.desc,
          assignedAgent: s.assignedAgent || meta.role,
        };
      })
    : [
        { id: 'triage', label: 'Triage', shortDesc: canonicalStageMeta.triage.desc, status: 'pending', assignedAgent: 'Triage Agent' },
        { id: 'reproducer', label: 'Reproducer', shortDesc: canonicalStageMeta.reproducer.desc, status: 'pending', assignedAgent: 'Reproducer Agent' },
        { id: 'fixer', label: 'Fixer', shortDesc: canonicalStageMeta.fixer.desc, status: 'pending', assignedAgent: 'Fixer Agent' },
        { id: 'verifier', label: 'Verifier', shortDesc: canonicalStageMeta.verifier.desc, status: 'pending', assignedAgent: 'Verifier Agent' },
        { id: 'pull_request', label: 'Pull Request', shortDesc: canonicalStageMeta.pull_request.desc, status: 'pending', assignedAgent: 'Pull Request Agent' },
      ];

  // Deduplicate by stage id if mapped from 7 to 5
  const deduplicatedStages: WorkflowStage[] = [];
  mappedStages.forEach((stage) => {
    const existing = deduplicatedStages.find((d) => d.id === stage.id);
    if (!existing) {
      deduplicatedStages.push(stage);
    } else {
      // Prioritize active or failed status over pending
      if (['running', 'failed', 'retrying', 'blocked'].includes(stage.status)) {
        const index = deduplicatedStages.indexOf(existing);
        deduplicatedStages[index] = stage;
      }
    }
  });

  const getStatusBadge = (status: StageStatus) => {
    switch (status) {
      case 'passed':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-[2px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-mono font-medium">
            <Check className="w-2.5 h-2.5" />
            PASSED
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-[2px] bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono font-medium animate-pulse">
            <Clock className="w-2.5 h-2.5" />
            RUNNING
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-[2px] bg-rose-500/10 text-rose-400 border border-rose-500/30 font-mono font-medium">
            <XCircle className="w-2.5 h-2.5" />
            FAILED
          </span>
        );
      case 'retrying':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-[2px] bg-amber-500/15 text-amber-400 border border-amber-500/40 font-mono font-medium">
            <AlertTriangle className="w-2.5 h-2.5" />
            RETRYING
          </span>
        );
      case 'blocked':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-[2px] bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono font-medium">
            <Ban className="w-2.5 h-2.5 text-rose-400" />
            BLOCKED
          </span>
        );
      case 'skipped':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-[2px] bg-zinc-900 text-zinc-500 border border-zinc-800 font-mono">
            SKIPPED
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-[2px] bg-[#111316] text-zinc-500 border border-[#20232A] font-mono">
            PENDING
          </span>
        );
    }
  };

  const selectedStage = deduplicatedStages.find((s) => s.id === selectedStageId) 
    || deduplicatedStages.find((s) => s.status === 'running') 
    || deduplicatedStages.find((s) => s.status === 'failed' || s.status === 'blocked')
    || deduplicatedStages[0];

  return (
    <div className="border border-[#1C1D1F] bg-[#0C0D0E] rounded-[2px] p-4 space-y-3 font-mono text-xs">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between pb-2.5 border-b border-[#1C1D1F] gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[#EDEFEF] font-semibold uppercase tracking-wider text-[11px]">
            Resolution Pipeline
          </span>
          <span className="text-zinc-600">&bull;</span>
          <span className="text-zinc-500 text-[10px]">5 Canonical Stages</span>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
          {isRunActive ? (
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>Live Backend Polling Active</span>
            </span>
          ) : (
            <span className="text-zinc-500">Execution Settled</span>
          )}
        </div>
      </div>

      {/* 5-Column Connected Pipeline Rail */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {deduplicatedStages.map((stage, idx) => {
          const isSelected = selectedStage?.id === stage.id;
          const stageNumber = `0${idx + 1}`;

          return (
            <button
              key={stage.id}
              onClick={() => {
                setSelectedStageId(stage.id);
                if (onSelectStage) onSelectStage(stage.id);
              }}
              className={`text-left p-3 rounded-[2px] border transition-all flex flex-col justify-between min-h-[96px] ${
                isSelected
                  ? 'border-zinc-500 bg-[#16181B]'
                  : stage.status === 'running'
                  ? 'border-amber-500/40 bg-[#121417]'
                  : stage.status === 'failed' || stage.status === 'blocked'
                  ? 'border-rose-500/30 bg-[#140F11]'
                  : 'border-[#1C1D1F] bg-[#070809] hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-zinc-500 font-mono">
                  {stageNumber}
                </span>
                {getStatusBadge(stage.status)}
              </div>

              <div className="mt-2 space-y-0.5">
                <div className="text-xs font-semibold text-zinc-100 font-sans tracking-tight">
                  {stage.label}
                </div>
                <div className="text-[10px] text-zinc-500 truncate font-mono">
                  {stage.assignedAgent}
                </div>
              </div>

              <div className="mt-2 pt-1.5 border-t border-[#1C1D1F] flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                <span>
                  {stage.durationSeconds !== undefined 
                    ? `${stage.durationSeconds}s` 
                    : stage.status === 'passed' ? 'Done' : '—'}
                </span>
                {stage.retryCount !== undefined && stage.retryCount > 0 && (
                  <span className="text-amber-400">retries: {stage.retryCount}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Stage Detail Inspector */}
      {selectedStage && (
        <div className="p-3 bg-[#070809] border border-[#1C1D1F] rounded-[2px] space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-[#18191B]">
            <div className="flex items-center gap-2">
              <span className="text-zinc-200 font-semibold text-xs">
                {selectedStage.label}
              </span>
              <span className="text-zinc-600">&bull;</span>
              <span className="text-zinc-400 text-[11px]">{selectedStage.assignedAgent}</span>
            </div>

            <div className="flex items-center gap-3 text-[10px] text-zinc-500">
              {selectedStage.startedAt && (
                <span>Started: <span className="text-zinc-400">{selectedStage.startedAt}</span></span>
              )}
              {selectedStage.completedAt && (
                <span>Completed: <span className="text-zinc-400">{selectedStage.completedAt}</span></span>
              )}
              {selectedStage.durationSeconds !== undefined && (
                <span>Duration: <span className="text-zinc-300 font-semibold">{selectedStage.durationSeconds}s</span></span>
              )}
            </div>
          </div>

          <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
            {selectedStage.shortDesc}
          </p>

          {/* Output summary or error message */}
          {selectedStage.outputSummary && (
            <div className="text-[11px] text-zinc-300 font-mono bg-[#0C0D0E] p-2 rounded-[2px] border border-[#18191B]">
              <span className="text-zinc-500 mr-2">$ Output:</span>
              <span>{selectedStage.outputSummary}</span>
            </div>
          )}

          {selectedStage.errorMessage && (
            <div className="text-[11px] text-rose-300 font-mono bg-rose-950/20 p-2 rounded-[2px] border border-rose-900/30">
              <span className="text-rose-400 font-semibold mr-2">Error / Blocked:</span>
              <span>{selectedStage.errorMessage}</span>
            </div>
          )}

          {/* Quick link shortcuts to Diff, Tests, Logs */}
          <div className="pt-1 flex flex-wrap items-center gap-2 text-[10px]">
            {selectedStage.relatedFiles && selectedStage.relatedFiles.length > 0 && (
              <div className="flex items-center gap-1 text-zinc-400">
                <FileCode className="w-3 h-3 text-zinc-500" />
                <span>Files: {selectedStage.relatedFiles.join(', ')}</span>
              </div>
            )}

            {selectedStage.relatedTestNames && selectedStage.relatedTestNames.length > 0 && (
              <div className="flex items-center gap-1 text-zinc-400">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Tests: {selectedStage.relatedTestNames.join(', ')}</span>
              </div>
            )}

            {onNavigateToTab && (
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => onNavigateToTab('diff')}
                  className="text-zinc-400 hover:text-white transition-colors flex items-center gap-0.5"
                >
                  <span>Inspect Diff</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onNavigateToTab('tests')}
                  className="text-zinc-400 hover:text-white transition-colors flex items-center gap-0.5"
                >
                  <span>Test Output</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

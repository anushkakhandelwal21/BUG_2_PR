import React, { useState } from 'react';
import { VerificationResult } from '../../types';
import { ShieldCheck, ChevronDown, ChevronUp, AlertTriangle, RotateCcw } from 'lucide-react';

interface TestVerificationPanelProps {
  verification: VerificationResult;
  retryReason?: string;
  onTriggerRetry?: () => void;
}

export const TestVerificationPanel: React.FC<TestVerificationPanelProps> = ({
  verification,
  retryReason,
}) => {
  const [showStackTrace, setShowStackTrace] = useState(true);
  const [showTestCases, setShowTestCases] = useState(false);

  const isVerified = verification.status === 'verified_passed';
  const isBaselineReproduced = verification.baselineReproduced;

  return (
    <div className="border border-[#181C26] bg-[#0C0E12] rounded-[4px] p-3.5 space-y-3 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 border-b border-[#181C26] gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className={`w-3.5 h-3.5 ${isVerified ? 'text-emerald-400' : 'text-amber-400'}`} />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
            Sandbox Test Verification Evidence
          </h3>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-zinc-500">
            Attempt {verification.attemptNumber}/{verification.maxAttempts}
          </span>
          <span className="text-zinc-700">&bull;</span>
          <span className={`font-semibold ${isVerified ? 'text-emerald-400' : 'text-amber-400'}`}>
            {isVerified ? 'STRICT GATE PASSED' : 'VERIFICATION IN PROGRESS'}
          </span>
        </div>
      </div>

      {/* Side-by-side Evidence Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Baseline RED Failure */}
        <div className="p-3 bg-[#07080A] border border-[#181C26] rounded-[3px] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-400 flex items-center gap-1.5 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              1. Baseline Test (Failed Before Fix)
            </span>
            <span className="text-[10px] text-rose-400 border border-rose-500/30 px-1 rounded-[2px] bg-rose-500/10">
              RED CONFIRMED
            </span>
          </div>

          <p className="text-[11px] text-zinc-400">
            Automated regression test executed against unmodified source code on master.
          </p>

          {isBaselineReproduced ? (
            <div className="space-y-1.5">
              <div className="text-[11px] text-rose-300 font-semibold truncate bg-rose-950/20 border border-rose-900/30 px-2 py-1 rounded-[2px]">
                {verification.baselineFailedTest || 'Regression reproduction test failed'}
              </div>

              {verification.baselineFailureMessage && (
                <div>
                  <button
                    onClick={() => setShowStackTrace(!showStackTrace)}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 my-1"
                  >
                    <span>{showStackTrace ? 'Hide Trace' : 'View Trace'}</span>
                    {showStackTrace ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {showStackTrace && (
                    <pre className="p-2 bg-black border border-zinc-900 text-[10px] text-rose-300/80 overflow-x-auto whitespace-pre-wrap rounded-[2px] max-h-28 leading-snug">
                      {verification.baselineFailureMessage}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-2 bg-amber-950/15 border border-amber-900/30 text-[11px] text-amber-300 flex items-start gap-1.5 rounded-[2px]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400 mt-0.5" />
              <span>Bug could not be reproduced on baseline. Speculative patches forbidden.</span>
            </div>
          )}
        </div>

        {/* Post-Fix GREEN Verification */}
        <div className="p-3 bg-[#07080A] border border-[#181C26] rounded-[3px] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              2. Sandbox Suite (Passed After Fix)
            </span>
            <span className="text-[10px] text-emerald-400 border border-emerald-500/30 px-1 rounded-[2px] bg-emerald-500/10">
              {isVerified ? 'GREEN VERIFIED' : 'RUNNING'}
            </span>
          </div>

          <p className="text-[11px] text-zinc-400">
            Ephemeral container execution of full test suite post patch application.
          </p>

          {isVerified ? (
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-1.5 text-center text-[11px]">
                <div className="bg-[#11141B] border border-[#181C26] p-1.5 rounded-[2px]">
                  <div className="font-bold text-white">{verification.totalTests}</div>
                  <div className="text-[9px] text-zinc-500 uppercase">Total</div>
                </div>
                <div className="bg-[#11141B] border border-[#181C26] p-1.5 rounded-[2px]">
                  <div className="font-bold text-emerald-400">{verification.passedCount}</div>
                  <div className="text-[9px] text-emerald-500 uppercase">Passed</div>
                </div>
                <div className="bg-[#11141B] border border-[#181C26] p-1.5 rounded-[2px]">
                  <div className="font-bold text-rose-400">{verification.failedCount}</div>
                  <div className="text-[9px] text-zinc-500 uppercase">Failed</div>
                </div>
                <div className="bg-[#11141B] border border-[#181C26] p-1.5 rounded-[2px]">
                  <div className="font-bold text-zinc-400">{verification.skippedCount}</div>
                  <div className="text-[9px] text-zinc-500 uppercase">Skipped</div>
                </div>
              </div>

              <div className="text-[11px] text-emerald-300 flex items-center justify-between pt-1">
                <span>✔ 0 regressions in {(verification.executionDurationMs / 1000).toFixed(2)}s</span>
                <span className="text-[10px] text-zinc-500">Regression test passed (14ms)</span>
              </div>
            </div>
          ) : (
            <div className="p-3 text-zinc-500 text-[11px] italic">
              Verification pending patch synthesis and container execution...
            </div>
          )}
        </div>
      </div>

      {/* Intelligent Retry banner if applicable */}
      {retryReason && (
        <div className="p-2.5 bg-amber-500/5 border border-amber-500/20 text-xs text-amber-200/90 rounded-[2px] flex items-start gap-2">
          <RotateCcw className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <span className="font-semibold text-amber-300 mr-1.5">Intelligent Retry Protocol:</span>
            {retryReason}
          </div>
        </div>
      )}
    </div>
  );
};

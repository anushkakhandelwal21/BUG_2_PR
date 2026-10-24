import React from 'react';
import { VerificationResult } from '../../types';
import { ShieldCheck, ShieldAlert, ShieldX, Clock } from 'lucide-react';

interface VerificationBadgeProps {
  verification: VerificationResult;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({ verification }) => {
  if (verification.status === 'verified_passed') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono tracking-tight">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>VERIFIED FIX (GREEN TESTS)</span>
      </div>
    );
  }

  if (verification.status === 'baseline_reproduced') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono tracking-tight">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>BASELINE REPRODUCED (RED) &bull; FIXING</span>
      </div>
    );
  }

  if (verification.status === 'verification_failed') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-mono tracking-tight">
        <ShieldX className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        <span>INVARIANT HALT: PR BLOCKED</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] bg-zinc-800/60 border border-zinc-700/40 text-zinc-400 text-[11px] font-mono tracking-tight">
      <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
      <span>AWAITING SANDBOX RUN</span>
    </div>
  );
};

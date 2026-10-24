import React from 'react';
import { RunStatus } from '../../types';

interface RunStatusBadgeProps {
  status: RunStatus;
  size?: 'sm' | 'md';
}

export const RunStatusBadge: React.FC<RunStatusBadgeProps> = ({ status, size = 'sm' }) => {
  const isSm = size === 'sm';

  switch (status) {
    case 'verified':
      return (
        <span className={`inline-flex items-center gap-1.5 font-mono ${isSm ? 'text-[11px]' : 'text-xs'} text-emerald-400 font-medium`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
          <span>Verified Fix</span>
        </span>
      );
    case 'running':
      return (
        <span className={`inline-flex items-center gap-1.5 font-mono ${isSm ? 'text-[11px]' : 'text-xs'} text-indigo-300 font-medium`}>
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 animate-quiet-pulse"></span>
          <span>Executing</span>
        </span>
      );
    case 'retrying':
      return (
        <span className={`inline-flex items-center gap-1.5 font-mono ${isSm ? 'text-[11px]' : 'text-xs'} text-amber-300 font-medium`}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 animate-quiet-pulse"></span>
          <span>Retrying Fix</span>
        </span>
      );
    case 'failed':
      return (
        <span className={`inline-flex items-center gap-1.5 font-mono ${isSm ? 'text-[11px]' : 'text-xs'} text-rose-400 font-medium`}>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0"></span>
          <span>Invariant Halt</span>
        </span>
      );
    case 'pending':
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 font-mono ${isSm ? 'text-[11px]' : 'text-xs'} text-zinc-500 font-medium`}>
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0"></span>
          <span>Queued</span>
        </span>
      );
  }
};

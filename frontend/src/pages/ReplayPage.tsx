import React from 'react';
import { AppShell } from '../components/layout/AppShell';
import { RunReplayView } from '../components/replay/RunReplayView';

export const ReplayPage: React.FC = () => {
  return (
    <AppShell>
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-base font-semibold tracking-tight text-white font-mono uppercase">
            Run Replay & Historical Trace
          </h1>
          <p className="text-xs text-zinc-400 font-sans">
            Reconstruct and scrub through saved JSON run records from <code className="text-zinc-300 font-mono">recorder.py</code> without re-executing agents.
          </p>
        </div>

        <RunReplayView />
      </div>
    </AppShell>
  );
};

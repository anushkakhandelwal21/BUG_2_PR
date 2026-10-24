import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { MetricsGrid } from '../components/dashboard/MetricsGrid';
import { QuickLauncher } from '../components/dashboard/QuickLauncher';
import { RunsTable } from '../components/dashboard/RunsTable';
import { ResolutionRun } from '../types';
import { apiService } from '../services/api';
import { simulationStore } from '../services/simulationEngine';

export const DashboardPage: React.FC = () => {
  const [runs, setRuns] = useState<ResolutionRun[]>([]);
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'all';

  useEffect(() => {
    apiService.getRuns().then((data) => {
      setRuns(data);
    });

    const unsubscribe = simulationStore.subscribe((updatedRuns) => {
      setRuns(updatedRuns);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Workspace Header: Compact & Deliberate */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-semibold tracking-tight text-white font-mono uppercase">
              Resolution Pipeline
            </h1>
            <div className="flex items-center gap-3">
              <a
                href="http://localhost:8501"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono bg-[#111315] hover:bg-[#181B1F] border border-[#23262B] text-zinc-300 hover:text-white rounded-[2px] transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Bug2PR Streamlit (Port 8501) ↗</span>
              </a>
              <span className="text-[11px] font-mono text-zinc-500">
                {runs.length} runs on record
              </span>
            </div>
          </div>
          <p className="text-xs text-zinc-400">
            Every fix leaves a trail of proof. Strict verification gate enforced.
          </p>
        </div>

        {/* Integrated Command Area */}
        <QuickLauncher />

        {/* Inline Telemetry Strip */}
        <MetricsGrid runs={runs} />

        {/* The Central Content: Resolution Runs List */}
        <div className="pt-2">
          <RunsTable runs={runs} initialTab={currentTab} />
        </div>
      </div>
    </AppShell>
  );
};

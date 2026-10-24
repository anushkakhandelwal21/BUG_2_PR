import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { ArrowRight, ShieldCheck, CheckCircle2, Terminal } from 'lucide-react';
import { apiService } from '../services/api';

export const NewRunPage: React.FC = () => {
  const navigate = useNavigate();

  const [issueUrl, setIssueUrl] = useState('');
  const [targetBranch, setTargetBranch] = useState('main');
  const [maxRetries, setMaxRetries] = useState(3);
  const [sandboxIsolation, setSandboxIsolation] = useState<'docker' | 'microvm'>('docker');
  const [testScope, setTestScope] = useState<'regression_only' | 'affected_subsystem' | 'full_suite'>('full_suite');
  const [autoOpenPr, setAutoOpenPr] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parseIssue = (url: string) => {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
    if (match) {
      return {
        owner: match[1],
        repo: match[2],
        issueNum: match[3],
        valid: true,
      };
    }
    return { valid: false };
  };

  const parsed = parseIssue(issueUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueUrl.trim()) {
      setError('Please provide a valid GitHub issue URL');
      return;
    }

    if (!issueUrl.includes('github.com') || !issueUrl.includes('/issues/')) {
      setError('Format required: https://github.com/owner/repository/issues/123');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const newRun = await apiService.submitRun({
        issueUrl: issueUrl.trim(),
        targetBranch,
        maxRetries,
        sandboxIsolation,
        testScope,
        autoOpenPr,
      });

      navigate(`/runs/${newRun.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch resolution run.');
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-base font-semibold tracking-tight text-white font-mono uppercase">
            Configure Resolution Run
          </h1>
          <p className="text-xs text-zinc-400 font-sans">
            Dispatch autonomous agents to reproduce, patch, and verify an issue before generating a pull request.
          </p>
        </div>

        {/* Verification Invariant Banner */}
        <div className="border border-[#1C1D1F] bg-[#0C0D0E] rounded-[2px] p-2.5 flex items-center justify-between text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-zinc-200">Strict Invariant Gate Enforced:</span>
            <span>No green tests &rarr; No PR</span>
          </div>
          <span className="text-[10px] text-zinc-500 hidden sm:inline">Isolated Docker Sandbox</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Section 1: URL Input */}
          <div className="border border-[#1C1D1F] bg-[#0C0D0E] rounded-[2px] p-4 space-y-3 font-mono">
            <div className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
              1. Target GitHub Issue
            </div>

            <div className="flex items-center bg-[#070809] border border-[#1C1D1F] focus-within:border-zinc-500 rounded-[2px] overflow-hidden">
              <div className="pl-3 pr-2 text-zinc-500 text-xs">
                <Terminal className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                placeholder="https://github.com/owner/repository/issues/123"
                value={issueUrl}
                onChange={(e) => {
                  setIssueUrl(e.target.value);
                  if (error) setError('');
                }}
                className="w-full bg-transparent py-2.5 px-1 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none font-mono"
              />
            </div>
            {error && <p className="text-[11px] text-rose-400">{error}</p>}

            {/* Parsed Preview */}
            {parsed.valid && (
              <div className="p-2.5 bg-[#070809] border border-[#1C1D1F] rounded-[2px] flex items-center justify-between text-[11px] text-zinc-300">
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-zinc-500">Target:</span>
                  <span className="text-zinc-200 font-semibold">{parsed.owner}/{parsed.repo}</span>
                  <span className="text-zinc-700">&bull;</span>
                  <span>Issue #{parsed.issueNum}</span>
                </div>
                <span className="text-emerald-400 flex items-center gap-1 font-mono text-[10px]">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Valid GitHub URI</span>
                </span>
              </div>
            )}
          </div>

          {/* Section 2: Execution Settings */}
          <div className="border border-[#1C1D1F] bg-[#0C0D0E] rounded-[2px] p-4 space-y-3 font-mono text-xs">
            <div className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
              2. Sandbox Execution Parameters
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Target Branch</label>
                <select
                  value={targetBranch}
                  onChange={(e) => setTargetBranch(e.target.value)}
                  className="w-full bg-[#070809] border border-[#1C1D1F] rounded-[2px] px-2 py-1.5 text-xs text-zinc-200 focus:outline-none"
                >
                  <option value="main">main</option>
                  <option value="master">master</option>
                  <option value="develop">develop</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Max Intelligent Retries</label>
                <select
                  value={maxRetries}
                  onChange={(e) => setMaxRetries(Number(e.target.value))}
                  className="w-full bg-[#070809] border border-[#1C1D1F] rounded-[2px] px-2 py-1.5 text-xs text-zinc-200 focus:outline-none"
                >
                  <option value={1}>1 Attempt (No Retries)</option>
                  <option value={2}>2 Attempts</option>
                  <option value={3}>3 Attempts (Standard Policy)</option>
                  <option value={5}>5 Attempts</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Sandbox Environment</label>
                <select
                  value={sandboxIsolation}
                  onChange={(e) => setSandboxIsolation(e.target.value as any)}
                  className="w-full bg-[#070809] border border-[#1C1D1F] rounded-[2px] px-2 py-1.5 text-xs text-zinc-200 focus:outline-none"
                >
                  <option value="docker">Docker Ephemeral Container (Isolated)</option>
                  <option value="microvm">Firecracker MicroVM (Hardware Virtualization)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Test Verification Scope</label>
                <select
                  value={testScope}
                  onChange={(e) => setTestScope(e.target.value as any)}
                  className="w-full bg-[#070809] border border-[#1C1D1F] rounded-[2px] px-2 py-1.5 text-xs text-zinc-200 focus:outline-none"
                >
                  <option value="full_suite">Full Regression Matrix (Strict Invariant)</option>
                  <option value="affected_subsystem">Affected Subsystem Tests</option>
                  <option value="regression_only">Isolated Regression Test Only</option>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-[#1C1D1F] flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-sans">
                Automate Pull Request preparation upon 100% test pass
              </span>
              <input
                type="checkbox"
                checked={autoOpenPr}
                onChange={(e) => setAutoOpenPr(e.target.checked)}
                className="rounded-[2px] border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-1 font-mono text-xs">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-3 py-1.5 text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#EDEFEF] hover:bg-white text-[#080909] font-sans font-semibold rounded-[2px] flex items-center gap-1.5 transition-colors"
            >
              <span>{isSubmitting ? 'Starting...' : 'Start Resolution Pipeline'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#080909]" />
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
};

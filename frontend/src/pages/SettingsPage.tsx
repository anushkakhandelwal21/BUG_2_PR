import React, { useState, useEffect } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { ShieldCheck, Check, Save, RotateCcw, Lock } from 'lucide-react';
import { GithubIcon } from '../components/common/Icons';
import { apiService } from '../services/api';
import { repoContextStore, RepositoryContext, GitHubAccount } from '../services/repoContext';

export const SettingsPage: React.FC = () => {
  const [saved, setSaved] = useState(false);
  const [retries, setRetries] = useState('3');
  const [timeoutSecs, setTimeoutSecs] = useState('300');
  const [plannerModel, setPlannerModel] = useState('claude-3-5-sonnet');
  const [codeModel, setCodeModel] = useState('claude-3-5-sonnet');

  const [activeRepo, setActiveRepo] = useState<RepositoryContext>(repoContextStore.getActiveRepository());
  const [githubAccount, setGithubAccount] = useState<GitHubAccount | null>(repoContextStore.getConnectedAccount());

  useEffect(() => {
    const unsub = repoContextStore.subscribe(() => {
      setActiveRepo(repoContextStore.getActiveRepository());
      setGithubAccount(repoContextStore.getConnectedAccount());
    });
    return () => unsub();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    if (window.confirm('Reset all demo resolution runs and workspace configuration?')) {
      apiService.resetRuns();
      window.location.reload();
    }
  };

  const toggleGitHubConnection = () => {
    if (githubAccount) {
      repoContextStore.disconnectGitHub();
    } else {
      repoContextStore.connectGitHub('dev-preview', 'Developer Preview');
    }
  };

  const availableRepos = repoContextStore.getAvailableRepositories();

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#181C26]">
          <div className="space-y-0.5">
            <h1 className="text-base font-semibold tracking-tight text-white font-mono uppercase">
              Bug2PR Platform Settings
            </h1>
            <p className="text-xs text-zinc-400">
              Configure repository connections, verification gate thresholds, and agent synthesis models.
            </p>
          </div>

          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-2.5 py-1 rounded-[2px] border border-[#202634] bg-[#0C0E12] text-xs font-mono text-zinc-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Demo</span>
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 font-mono text-xs">
          {/* Section 1: Honest GitHub Connection */}
          <div className="border border-[#181C26] bg-[#0C0E12] rounded-[4px] p-3.5 space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#181C26]">
              <div className="flex items-center gap-2">
                <GithubIcon className="w-3.5 h-3.5 text-zinc-400" />
                <span className="font-semibold text-zinc-200 uppercase text-[11px]">
                  GitHub Repository Connection
                </span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-[2px] border ${
                githubAccount 
                  ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                  : 'text-zinc-500 border-zinc-700 bg-zinc-800'
              }`}>
                {githubAccount ? 'CONNECTED' : 'DEMO MODE (NOT CONNECTED)'}
              </span>
            </div>

            {githubAccount ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-zinc-400 gap-2 p-2 bg-[#07080A] border border-[#181C26] rounded-[2px]">
                <div>
                  <span className="text-zinc-200 font-semibold">{githubAccount.displayName}</span> (@{githubAccount.username})
                  <div className="text-[10px] text-zinc-500">Scopes: repo, workflow, issues:write</div>
                </div>
                <button
                  type="button"
                  onClick={toggleGitHubConnection}
                  className="px-2 py-1 text-[10px] font-mono border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-[2px] transition-colors self-start sm:self-auto"
                >
                  Disconnect Account
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-zinc-400 gap-2 p-2 bg-[#07080A] border border-[#181C26] rounded-[2px]">
                <div className="text-zinc-400 leading-relaxed font-sans text-xs">
                  No personal GitHub account is connected. Running against explicitly labeled demo fixtures.
                </div>
                <button
                  type="button"
                  onClick={toggleGitHubConnection}
                  className="px-2.5 py-1 text-xs font-mono bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2px] transition-colors shrink-0"
                >
                  Connect GitHub Account
                </button>
              </div>
            )}

            {/* Active Repository Selection */}
            <div className="pt-2 border-t border-[#181C26] space-y-1.5">
              <label className="text-[11px] text-zinc-400 uppercase tracking-wider">
                Active Repository Context
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {availableRepos.map((repo) => (
                  <button
                    key={repo.id}
                    type="button"
                    onClick={() => repoContextStore.setActiveRepository(repo.id)}
                    className={`p-2 rounded-[2px] border text-left transition-colors ${
                      repo.id === activeRepo.id
                        ? 'bg-[#161A23] border-emerald-500/50 text-white'
                        : 'bg-[#07080A] border-[#181C26] text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-semibold text-xs truncate">
                      {repo.owner}/{repo.name}
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                      {repo.isDemo ? '[DEMO REPOSITORY]' : '[CONNECTED]'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Strict Invariant Gate Policy */}
          <div className="border border-[#181C26] bg-[#0C0E12] rounded-[4px] p-3.5 space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#181C26]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-zinc-200 uppercase text-[11px]">
                  Strict Invariant Gate Policy
                </span>
              </div>
              <span className="text-[10px] text-emerald-400">NON-NEGOTIABLE</span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
              "No demonstrated failure &rarr; No verified fix &rarr; No automatic pull request."
              Bug2PR prohibits pushing patches if baseline reproduction fails or full-suite tests do not pass.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Max Intelligent Retries</label>
                <select
                  value={retries}
                  onChange={(e) => setRetries(e.target.value)}
                  className="w-full bg-[#07080A] border border-[#202634] rounded-[2px] px-2 py-1.5 text-xs text-zinc-200 focus:outline-none"
                >
                  <option value="1">1 Attempt (Strict)</option>
                  <option value="2">2 Attempts</option>
                  <option value="3">3 Attempts (Standard Policy)</option>
                  <option value="5">5 Attempts</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Sandbox Timeout Limit</label>
                <select
                  value={timeoutSecs}
                  onChange={(e) => setTimeoutSecs(e.target.value)}
                  className="w-full bg-[#07080A] border border-[#202634] rounded-[2px] px-2 py-1.5 text-xs text-zinc-200 focus:outline-none"
                >
                  <option value="120">120 Seconds</option>
                  <option value="300">300 Seconds (5 Minutes)</option>
                  <option value="600">600 Seconds (10 Minutes)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-[#181C26] flex items-center justify-between text-[11px]">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-zinc-500" />
                Block Unverified Pull Requests
              </span>
              <span className="text-emerald-400 font-semibold">ALWAYS ENFORCED</span>
            </div>
          </div>

          {/* Section 3: Model Orchestration */}
          <div className="border border-[#181C26] bg-[#0C0E12] rounded-[4px] p-3.5 space-y-3">
            <div className="pb-1.5 border-b border-[#181C26]">
              <span className="font-semibold text-zinc-200 uppercase text-[11px]">
                Agent Synthesis Models
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Analysis & Reproduction Agent</label>
                <select
                  value={plannerModel}
                  onChange={(e) => setPlannerModel(e.target.value)}
                  className="w-full bg-[#07080A] border border-[#202634] rounded-[2px] px-2 py-1.5 text-xs text-zinc-200 focus:outline-none"
                >
                  <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gemini-1-5-pro">Gemini 1.5 Pro</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Patch Synthesis Engine</label>
                <select
                  value={codeModel}
                  onChange={(e) => setCodeModel(e.target.value)}
                  className="w-full bg-[#07080A] border border-[#202634] rounded-[2px] px-2 py-1.5 text-xs text-zinc-200 focus:outline-none"
                >
                  <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                  <option value="gpt-4o">GPT-4o</option>
                </select>
              </div>
            </div>
          </div>

          {/* Save Action */}
          <div className="flex items-center justify-end gap-3 pt-1">
            {saved && (
              <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                <Check className="w-3 h-3" />
                Settings saved
              </span>
            )}
            <button
              type="submit"
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-[3px] flex items-center gap-1.5 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Preferences</span>
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
};

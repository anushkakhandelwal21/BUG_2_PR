import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Terminal } from 'lucide-react';
import { apiService } from '../../services/api';

export const QuickLauncher: React.FC = () => {
  const [issueUrl, setIssueUrl] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueUrl.trim()) {
      setError('Please provide a GitHub issue URL to resolve.');
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
        targetBranch: 'main',
        maxRetries: 3,
        autoOpenPr: true,
      });
      navigate(`/runs/${newRun.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch resolution pipeline to backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Integrated Horizontal Command Area */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center bg-[#0C0D0E] border border-[#1C1D1F] focus-within:border-zinc-500 rounded-[2px] transition-colors overflow-hidden">
          <div className="pl-3.5 pr-2 text-zinc-500 font-mono text-xs flex items-center gap-1.5 select-none">
            <Terminal className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-500">bug2pr resolve</span>
          </div>

          <input
            type="text"
            placeholder="Paste GitHub issue URL (e.g. https://github.com/owner/repo/issues/123)..."
            value={issueUrl}
            onChange={(e) => {
              setIssueUrl(e.target.value);
              if (error) setError('');
            }}
            className="flex-1 bg-transparent py-2.5 px-1 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none font-mono"
          />

          <div className="pr-1.5">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3.5 py-1.5 bg-[#EDEFEF] hover:bg-white text-[#080909] disabled:opacity-50 text-xs font-semibold rounded-[2px] flex items-center gap-1.5 transition-colors font-mono"
            >
              <span>{isSubmitting ? 'Dispatching...' : 'Resolve'}</span>
              <ArrowRight className="w-3 h-3 text-[#080909]" />
            </button>
          </div>
        </div>

        {error && (
          <p className="text-[11px] font-mono text-rose-400 mt-1 pl-1">{error}</p>
        )}
      </form>

      {/* Honest Operational Notice */}
      <div className="text-[10px] font-mono text-zinc-500 pl-1 flex items-center gap-2">
        <span>Autonomous pipeline dispatches through Triage &rarr; Reproducer &rarr; Fixer &rarr; Verifier &rarr; PR.</span>
      </div>
    </div>
  );
};

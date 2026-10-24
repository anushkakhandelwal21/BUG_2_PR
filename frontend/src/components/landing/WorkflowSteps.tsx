import React from 'react';
import { Terminal, FlaskConical, Code2, ShieldCheck, GitPullRequest } from 'lucide-react';

export const WorkflowSteps: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Issue Ingestion',
      subtitle: 'Defect specification & call graph',
      icon: Terminal,
      desc: 'Ingests GitHub issue descriptions, stack traces, and logs. Maps AST symbol references and identifies suspect modules.',
      metric: 'AST mapped',
    },
    {
      num: '02',
      title: 'Failure Reproduction',
      subtitle: 'Baseline test confirms RED',
      icon: FlaskConical,
      desc: 'Synthesizes an isolated regression test that fails reliably on unmodified master code. Proves the bug exists before touching code.',
      metric: '1 failed (RED)',
    },
    {
      num: '03',
      title: 'Patch Synthesis',
      subtitle: 'Defensive code edits in worktree',
      icon: Code2,
      desc: 'Applies minimal defensive modifications to the isolated worktree, preserving all existing API signatures and behavior.',
      metric: '+14 / -3 lines',
    },
    {
      num: '04',
      title: 'Sandbox Verification',
      subtitle: 'Full test matrix execution',
      icon: ShieldCheck,
      desc: 'Executes the targeted regression test and the full repository test suite inside an ephemeral container sandbox with zero host leakage.',
      metric: '86/86 clean (GREEN)',
    },
    {
      num: '05',
      title: 'Pull Request Preparation',
      subtitle: 'Verifiable trace ready for human review',
      icon: GitPullRequest,
      desc: 'Composes a production-ready PR with failing test proof, passing test logs, unified diff, and reasoning trail.',
      metric: 'PR #143 ready',
    },
  ];

  return (
    <section className="py-20 border-t border-[#1C1D1F] bg-[#080909]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
        {/* Section Header */}
        <div className="space-y-3 max-w-2xl">
          <div className="flex items-center gap-2 font-mono text-xs text-zinc-500 uppercase tracking-widest">
            <span className="text-emerald-400 font-semibold">02</span>
            <span>&mdash;</span>
            <span>Follow the Trail</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#EDEFEF] font-sans">
            Every step is traceable. <br />
            From failing test to verified patch.
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed font-sans">
            Bug2PR operates as a sequence of verifiable checkpoints. Each stage produces an inspection artifact that must be satisfied before the next stage begins.
          </p>
        </div>

        {/* Connected Step Pipeline with Thin Hairline Trail */}
        <div className="relative border-l border-[#222428] ml-3 sm:ml-4 pl-6 sm:pl-8 space-y-8 font-mono text-xs">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isLast = idx === steps.length - 1;
            return (
              <div key={s.num} className="relative group">
                {/* Node on the trail line */}
                <div className={`absolute -left-[31px] sm:-left-[39px] top-1 w-4 h-4 rounded-full bg-[#080909] border flex items-center justify-center transition-colors ${
                  isLast
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-zinc-700 text-zinc-400 group-hover:border-zinc-500'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${isLast ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                </div>

                {/* Step Content */}
                <div className="border border-[#1E2024] bg-[#0C0D0E] rounded-[2px] p-4 sm:p-5 hover:border-zinc-700/80 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#1C1D1F]">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[11px] font-bold text-zinc-500">{s.num}</span>
                      <Icon className="w-3.5 h-3.5 text-zinc-400" />
                      <h3 className="font-semibold text-zinc-100 font-sans text-sm tracking-tight">
                        {s.title}
                      </h3>
                      <span className="hidden md:inline text-zinc-600">&bull;</span>
                      <span className="hidden md:inline text-[11px] text-zinc-400 font-sans">{s.subtitle}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-[2px] ${
                        isLast
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
                          : 'bg-[#141618] text-zinc-400 border border-[#22252A]'
                      }`}>
                        {s.metric}
                      </span>
                    </div>
                  </div>

                  <p className="pt-2.5 text-xs text-zinc-400 font-sans leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

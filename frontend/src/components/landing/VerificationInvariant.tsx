import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export const VerificationInvariant: React.FC = () => {
  const gates = [
    {
      condition: 'Failure to Reproduce',
      outcome: 'Execution Halted',
      status: 'BLOCKED',
      icon: XCircle,
      statusColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      desc: 'If no failing test can be synthesized to reproduce the reported issue on unmodified code, Bug2PR halts. We never write code against an unconfirmed defect.',
    },
    {
      condition: 'Incomplete Test Matrix',
      outcome: 'PR Blocked',
      status: 'BLOCKED',
      icon: AlertTriangle,
      statusColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      desc: 'If the patch passes the isolated regression test but breaks unrelated existing suites or fails code coverage thresholds, delivery is rejected.',
    },
    {
      condition: 'Verified Green Suite',
      outcome: 'PR Prepared',
      status: 'PROCEEDS',
      icon: CheckCircle2,
      statusColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      desc: 'Only when baseline test fails (RED) and post-patch full suite runs 100% clean (GREEN) in the sandbox does Bug2PR prepare a pull request.',
    },
  ];

  return (
    <section className="py-20 border-t border-[#1C1D1F] bg-[#070808]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
        {/* Section Header */}
        <div className="space-y-4 max-w-2xl">
          <div className="flex items-center gap-2 font-mono text-xs text-zinc-500 uppercase tracking-widest">
            <span className="text-emerald-400 font-semibold">03</span>
            <span>&mdash;</span>
            <span>Verification Invariant</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#EDEFEF] font-sans">
            The Invariant Rule
          </h2>

          <div className="border-l-2 border-emerald-500 pl-4 py-1">
            <blockquote className="text-lg sm:text-xl font-semibold text-white font-sans tracking-tight">
              &ldquo;No demonstrated failure. No verified fix. No automatic pull request.&rdquo;
            </blockquote>
          </div>

          <p className="text-sm text-zinc-400 leading-relaxed font-sans">
            Most developer tools rush to generate code and ship speculative patches. Bug2PR enforces strict verification invariants. If the system cannot isolate the failure or guarantee clean verification, it refuses to claim a fix.
          </p>
        </div>

        {/* Invariant Failure & Pass Gates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          {gates.map((g) => {
            const Icon = g.icon;
            return (
              <div
                key={g.condition}
                className="border border-[#1E2024] bg-[#0C0D0E] rounded-[2px] p-4 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-[#1C1D1F]">
                    <span className="font-semibold text-zinc-200 text-xs font-sans">
                      {g.condition}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-[2px] border font-mono font-medium ${g.statusColor}`}>
                      {g.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                    {g.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#1C1D1F] flex items-center justify-between text-[10px] text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Icon className="w-3 h-3 text-zinc-400" />
                    <span>Resolution Policy</span>
                  </span>
                  <span className="font-medium text-zinc-300">{g.outcome}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

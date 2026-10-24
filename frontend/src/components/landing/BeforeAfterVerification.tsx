import React from 'react';
import { XCircle, CheckCircle2 } from 'lucide-react';
import { FixtrailMark } from '../common/FixtrailLogo';

export const BeforeAfterVerification: React.FC = () => {
  return (
    <section className="py-20 border-t border-[#1C1D1F] bg-[#080909]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
        {/* Section Header */}
        <div className="space-y-3 max-w-2xl">
          <div className="flex items-center gap-2 font-mono text-xs text-zinc-500 uppercase tracking-widest">
            <span className="text-emerald-400 font-semibold">01</span>
            <span>&mdash;</span>
            <span>The Missing Proof</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#EDEFEF] font-sans">
            AI can suggest code. <br />
            Only tests can prove it works.
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed font-sans">
            Standard code-generation models produce plausible-looking hallucinations without running a single line of code. Bug2PR treats bug resolution as an empirical software engineering discipline: reproduce the defect with a failing test first, apply the surgical patch, and prove the entire test matrix passes in an isolated container sandbox before opening a PR.
          </p>
        </div>

        {/* 3-Column Comparative Evidence Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          {/* Card 1: Before - Baseline Fails */}
          <div className="border border-[#1E2024] bg-[#0C0D0E] rounded-[2px] p-4 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-[#1C1D1F]">
                <span className="text-[11px] font-medium text-rose-400 uppercase tracking-wide flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  Before: Baseline Fails
                </span>
                <span className="px-1.5 py-0.5 rounded-[2px] text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  RED PROVED
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                A newly synthesized regression test reproduces the reported defect against unmodified master code.
              </p>
            </div>

            <div className="bg-[#050606] border border-[#18191B] rounded-[2px] p-2.5 text-[11px] space-y-1 text-zinc-300">
              <div className="text-zinc-600">$ npm test tests/auth/role.test.ts</div>
              <div className="text-rose-400 font-semibold">FAIL tests/auth/role.test.ts</div>
              <div className="text-zinc-400 text-[10px] pl-2">
                TypeError: Cannot read properties of undefined (reading 'role')
              </div>
            </div>

            <div className="pt-2 border-t border-[#1C1D1F] flex items-center justify-between text-[10px] text-zinc-500">
              <span>Unmodified Source</span>
              <span className="text-rose-400">Failure Reproduced</span>
            </div>
          </div>

          {/* Card 2: After - Regression Passes */}
          <div className="border border-[#1E2024] bg-[#0C0D0E] rounded-[2px] p-4 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-[#1C1D1F]">
                <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  After: Regression Passes
                </span>
                <span className="px-1.5 py-0.5 rounded-[2px] text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  GREEN TARGET
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                The identical regression harness runs against the applied patch. The previously failing assertion succeeds.
              </p>
            </div>

            <div className="bg-[#050606] border border-[#18191B] rounded-[2px] p-2.5 text-[11px] space-y-1 text-zinc-300">
              <div className="text-zinc-600">$ npm test -- -t "role claims"</div>
              <div className="text-emerald-400 font-semibold">PASS tests/auth/role.test.ts</div>
              <div className="text-zinc-400 text-[10px] pl-2">
                ✔ role resolution with fallback (12ms)
              </div>
            </div>

            <div className="pt-2 border-t border-[#1C1D1F] flex items-center justify-between text-[10px] text-zinc-500">
              <span>Surgical Patch</span>
              <span className="text-emerald-400">Target Satisfied</span>
            </div>
          </div>

          {/* Card 3: Full Suite - Zero Regressions */}
          <div className="border border-emerald-500/30 bg-[#0C0D0E] rounded-[2px] p-4 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-[#1C1D1F]">
                <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                  <FixtrailMark className="w-3.5 h-3.5 text-emerald-400" />
                  Full Suite: Clean Matrix
                </span>
                <span className="px-1.5 py-0.5 rounded-[2px] text-[10px] bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30">
                  86 / 86 PASSED
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                The entire repository test matrix runs in an isolated ephemeral Docker container. No downstream side effects.
              </p>
            </div>

            <div className="bg-[#050606] border border-[#18191B] rounded-[2px] p-2.5 text-[11px] space-y-1 text-zinc-300">
              <div className="text-zinc-600">$ docker exec sandbox npm test</div>
              <div className="text-emerald-400 font-semibold">Test Suites: 8 passed, 8 total</div>
              <div className="text-zinc-400 text-[10px] pl-2">
                86 passed, 0 failed, 2 skipped (3.42s)
              </div>
            </div>

            <div className="pt-2 border-t border-[#1C1D1F] flex items-center justify-between text-[10px] text-zinc-500">
              <span>Sandbox Isolation</span>
              <span className="text-emerald-400 font-semibold">Ready for Review</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const InteractiveHeroWorkflow: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const steps = [
    {
      num: '01',
      label: 'ISSUE IDENTIFIED',
      subtitle: 'Defect Specification Parsed',
      desc: 'Ingested issue #142 from demo-org/sample-service. Issue Analyst isolates null pointer dereference in auth_middleware.ts:48.',
      snippetLabel: 'issue_spec.json',
      code: `{
  "issue": 142,
  "repository": "demo-org/sample-service",
  "error": "TypeError: Cannot read properties of undefined (reading 'role')",
  "target_file": "src/middleware/auth.ts:48",
  "reproduction_hypothesis": "OAuth token lacks nested claims dictionary"
}`,
      state: 'Spec Extracted',
      stateColor: 'text-zinc-400',
    },
    {
      num: '02',
      label: 'BASELINE TEST FAILED',
      subtitle: 'Reproduction Harness Confirmed RED',
      desc: 'Reproduction Engineer synthesizes isolated test verifying the bug fails on master before touching any application code.',
      snippetLabel: 'tests/auth/middleware.test.ts [BASELINE]',
      code: `$ npm test tests/auth/middleware.test.ts
FAIL tests/auth/middleware.test.ts
  ● Regression #142 › extractUserRole with undefined claims
    TypeError: Cannot read properties of undefined (reading 'role')
      at extractUserRole (src/middleware/auth.ts:48:28)
      at router.use (src/routes/api.ts:18:12)

Tests: 1 failed, 85 passed, 86 total`,
      state: 'RED Baseline Proved',
      stateColor: 'text-rose-400 font-semibold',
    },
    {
      num: '03',
      label: 'PATCH APPLIED',
      subtitle: 'Defensive Synthesis in Sandbox Worktree',
      desc: 'Fix Engineer drafts defensive patch with safe optional chaining and fallback role resolver.',
      snippetLabel: 'patch_auth_role.diff',
      code: `@@ -44,6 +44,13 @@ export function extractUserRole(token: TokenPayload | null) {
-  return token.claims.role;
+  if (!token) return null;
+  if (token.claims && typeof token.claims.role === 'string') {
+    return token.claims.role;
+  }
+  return token.role ?? null;
 }`,
      state: 'Patch Applied Cleanly',
      stateColor: 'text-zinc-300',
    },
    {
      num: '04',
      label: 'REGRESSION TEST PASSED',
      subtitle: 'Targeted Test Verified GREEN',
      desc: 'The identical regression test that failed in step 02 now passes cleanly with 14ms execution time.',
      snippetLabel: 'sandbox execution output',
      code: `$ npm test -- -t "Regression #142"
PASS tests/auth/middleware.test.ts
  ✔ Regression #142 › extractUserRole with undefined claims (14ms)
  ✔ extractUserRole with null token returns null (4ms)
  ✔ extractUserRole with root-level role fallback (6ms)

Tests: 3 passed, 3 total`,
      state: 'GREEN Test Confirmed',
      stateColor: 'text-emerald-400 font-semibold',
    },
    {
      num: '05',
      label: 'FULL SUITE VERIFIED',
      subtitle: 'Zero Regressions in Ephemeral Sandbox',
      desc: 'Complete project test matrix executed in clean Docker sandbox (Node 22 + Alpine). Zero regressions detected.',
      snippetLabel: 'sandbox_verification_report.json',
      code: `$ docker exec sandbox-8f9e21 npm test -- --coverage
Test Suites: 8 passed, 8 total
Tests:       86 passed, 0 failed, 2 skipped
Snapshots:   0 total
Time:        3.42s
Coverage:    94.2% lines, 91.8% branches
Status:      STRICT INVARIANT VERIFIED`,
      state: 'Suite Green (86/86)',
      stateColor: 'text-emerald-400 font-semibold',
    },
    {
      num: '06',
      label: 'PR READY FOR REVIEW',
      subtitle: 'Verified PR with Audit Trail',
      desc: 'PR Composer prepares ready-to-merge pull request with root-cause analysis, unified diff, and reproducible evidence.',
      snippetLabel: 'pull_request_payload.md',
      code: `## PR #143: fix(auth): safely extract role without claims object (#142)
- Baseline Failure (RED): tests/auth/middleware.test.ts failed as expected
- Post-Patch Verification (GREEN): 86/86 tests clean in 3.42s
- Proof Seal: Ephemeral container sandbox verified
- Direct diff: +14 lines, -3 lines across 2 files`,
      state: 'Ready for Review',
      stateColor: 'text-emerald-400 font-semibold',
    },
  ];

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [isPlaying, steps.length]);

  const active = steps[currentStep];

  return (
    <div className="border border-[#181C26] bg-[#0C0E12] rounded-[3px] overflow-hidden font-mono text-xs shadow-xl">
      {/* Top Header: Step Rail and Controls */}
      <div className="border-b border-[#181C26] bg-[#07080A] px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto text-[10px]">
          <span className="text-zinc-600 mr-1 uppercase tracking-wider text-[9px] select-none">Trace:</span>
          {steps.map((s, idx) => {
            const isCurrent = currentStep === idx;
            const isPassed = currentStep > idx;
            return (
              <button
                key={s.num}
                onClick={() => {
                  setCurrentStep(idx);
                  setIsPlaying(false);
                }}
                className={`px-1.5 py-0.5 rounded-[2px] transition-colors flex items-center gap-1 ${
                  isCurrent
                    ? 'bg-[#161A23] text-zinc-100 font-bold border border-zinc-700/60'
                    : isPassed
                    ? 'text-emerald-400 hover:text-emerald-300'
                    : 'text-zinc-600 hover:text-zinc-400'
                }`}
              >
                <span>{s.num}</span>
                <span className="hidden sm:inline">{s.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Stepper Controls & Simulation Badge */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 font-mono hidden md:inline">
            [Simulated Verification Trace]
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-2 py-0.5 rounded-[2px] bg-[#11141B] border border-[#202634] text-[10px] text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
            >
              {isPlaying ? <Pause className="w-2.5 h-2.5 text-amber-400" /> : <Play className="w-2.5 h-2.5 text-emerald-400" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
            <button
              onClick={() => {
                setCurrentStep(0);
                setIsPlaying(true);
              }}
              title="Replay sequence"
              className="p-1 rounded-[2px] bg-[#11141B] border border-[#202634] text-zinc-500 hover:text-white"
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Two-Column Editorial Product Trace */}
      <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Stage Explanation & Trace Milestones */}
        <div className="lg:col-span-5 space-y-3 font-sans">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-emerald-400 font-bold">{active.num}</span>
            <span className="text-zinc-600">&bull;</span>
            <span className="text-zinc-300 uppercase tracking-wider font-semibold">{active.label}</span>
          </div>

          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
            {active.subtitle}
          </h3>

          <p className="text-xs text-zinc-400 leading-relaxed">
            {active.desc}
          </p>

          <div className="pt-1 flex items-center gap-2 font-mono text-xs">
            <span className="text-zinc-500">Status:</span>
            <span className={active.stateColor}>{active.state}</span>
          </div>

          <div className="pt-3 border-t border-[#181C26] flex items-center justify-between text-xs font-mono">
            <Link
              to="/runs/run_8f9e21"
              className="text-zinc-300 hover:text-white transition-colors flex items-center gap-1 text-[11px]"
            >
              <span>Inspect full live execution</span>
              <ArrowRight className="w-3 h-3 text-emerald-400" />
            </Link>
            <span className="text-zinc-600 text-[10px]">Step {currentStep + 1}/6</span>
          </div>
        </div>

        {/* Right Column: Code & Evidence Artifact */}
        <div className="lg:col-span-7 bg-[#050608] border border-[#181C26] rounded-[2px] overflow-hidden">
          <div className="px-3 py-1.5 border-b border-[#181C26] bg-[#07080A] flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span className="text-zinc-400">{active.snippetLabel}</span>
            <span className="text-emerald-400">verification-sandbox</span>
          </div>
          <pre className="p-3 text-xs font-mono text-zinc-200 overflow-x-auto whitespace-pre leading-relaxed select-text min-h-[190px]">
            {active.code}
          </pre>
        </div>
      </div>
    </div>
  );
};

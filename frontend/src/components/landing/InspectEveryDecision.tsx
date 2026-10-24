import React, { useState } from 'react';
import { GitCompare, Terminal, History, GitPullRequest } from 'lucide-react';

export const InspectEveryDecision: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'diff' | 'tests' | 'trace' | 'pr'>('diff');

  return (
    <section className="py-20 border-t border-[#1C1D1F] bg-[#080909]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
        {/* Section Header */}
        <div className="space-y-3 max-w-2xl">
          <div className="flex items-center gap-2 font-mono text-xs text-zinc-500 uppercase tracking-widest">
            <span className="text-emerald-400 font-semibold">04</span>
            <span>&mdash;</span>
            <span>Inspect Every Decision</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#EDEFEF] font-sans">
            Transparent execution. <br />
            Human engineers remain in full control.
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed font-sans">
            Bug2PR produces a completely inspectable audit trail. Before any change is merged, developers can review the surgical diff, raw container execution logs, intermediate agent decisions, and pull request artifacts.
          </p>
        </div>

        {/* Tabbed Evidence Inspector */}
        <div className="border border-[#1E2024] bg-[#0C0D0E] rounded-[2px] overflow-hidden font-mono text-xs">
          {/* Tab Rail */}
          <div className="border-b border-[#1C1D1F] bg-[#070808] px-3 py-2 flex items-center justify-between overflow-x-auto gap-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('diff')}
                className={`px-2.5 py-1 rounded-[2px] text-[11px] transition-colors flex items-center gap-1.5 ${
                  activeTab === 'diff'
                    ? 'bg-[#15171A] text-white border border-[#2B2F36] font-medium'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <GitCompare className="w-3 h-3 text-zinc-400" />
                <span>Unified Diff</span>
              </button>

              <button
                onClick={() => setActiveTab('tests')}
                className={`px-2.5 py-1 rounded-[2px] text-[11px] transition-colors flex items-center gap-1.5 ${
                  activeTab === 'tests'
                    ? 'bg-[#15171A] text-white border border-[#2B2F36] font-medium'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Terminal className="w-3 h-3 text-zinc-400" />
                <span>Test Output</span>
              </button>

              <button
                onClick={() => setActiveTab('trace')}
                className={`px-2.5 py-1 rounded-[2px] text-[11px] transition-colors flex items-center gap-1.5 ${
                  activeTab === 'trace'
                    ? 'bg-[#15171A] text-white border border-[#2B2F36] font-medium'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <History className="w-3 h-3 text-zinc-400" />
                <span>Execution Trace</span>
              </button>

              <button
                onClick={() => setActiveTab('pr')}
                className={`px-2.5 py-1 rounded-[2px] text-[11px] transition-colors flex items-center gap-1.5 ${
                  activeTab === 'pr'
                    ? 'bg-[#15171A] text-white border border-[#2B2F36] font-medium'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <GitPullRequest className="w-3 h-3 text-zinc-400" />
                <span>PR Preview</span>
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-[10px] text-zinc-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Audit Trail Validated</span>
            </div>
          </div>

          {/* Tab Content Display */}
          <div className="p-4 sm:p-5 bg-[#050606] text-xs">
            {activeTab === 'diff' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-zinc-500 pb-2 border-b border-[#18191B]">
                  <span>src/middleware/auth.ts</span>
                  <span className="text-zinc-400 font-mono">+14 / -3 lines</span>
                </div>
                <pre className="font-mono text-zinc-300 overflow-x-auto whitespace-pre leading-relaxed select-text">
{`@@ -44,9 +44,14 @@ export function extractUserRole(token: TokenPayload | null): UserRole | null {
-  // Assume claims is always an object
-  return token.claims.role;
+  if (!token) {
+    return null;
+  }
+  if (token.claims && typeof token.claims.role === 'string') {
+    return token.claims.role as UserRole;
+  }
+  return token.role ?? null;
 }`}
                </pre>
              </div>
            )}

            {activeTab === 'tests' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-zinc-500 pb-2 border-b border-[#18191B]">
                  <span>Isolated Container: sandbox-8f9e21</span>
                  <span className="text-emerald-400 font-mono">Exit Code: 0</span>
                </div>
                <pre className="font-mono text-zinc-300 overflow-x-auto whitespace-pre leading-relaxed select-text">
{`$ docker exec sandbox-8f9e21 vitest run --coverage
 ✓ tests/auth/middleware.test.ts (2 tests) 14ms
   ✓ extractUserRole with undefined claims returns fallback (8ms)
   ✓ extractUserRole with valid token returns user role (6ms)
 ✓ tests/api/routes.test.ts (18 tests) 42ms
 ✓ tests/services/session.test.ts (34 tests) 88ms
 ✓ tests/utils/crypto.test.ts (32 tests) 24ms

Test Files  8 passed (8)
     Tests  86 passed, 0 failed, 2 skipped (88)
  Duration  3.42s`}
                </pre>
              </div>
            )}

            {activeTab === 'trace' && (
              <div className="space-y-3 font-mono text-[11px]">
                <div className="flex items-center justify-between text-zinc-500 pb-2 border-b border-[#18191B]">
                  <span>Deterministic Agent Lifecycle</span>
                  <span className="text-zinc-400">Total Duration: 4m 12s</span>
                </div>
                <div className="space-y-2 text-zinc-300">
                  <div className="flex items-start gap-2">
                    <span className="text-zinc-600">14:02:11</span>
                    <span className="text-emerald-400">[ANALYST]</span>
                    <span>Parsed issue #142: identified TypeError in extractUserRole</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-zinc-600">14:03:04</span>
                    <span className="text-rose-400">[REPRODUCE]</span>
                    <span>Generated tests/auth/middleware.test.ts; verified failing RED on master</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-zinc-600">14:04:19</span>
                    <span className="text-zinc-400">[PATCH]</span>
                    <span>Synthesized safe claims accessor with fallback in isolated worktree</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-zinc-600">14:05:40</span>
                    <span className="text-emerald-400">[VERIFY]</span>
                    <span>Full test matrix passed (86 passed, 0 failed) in ephemeral container</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-zinc-600">14:06:23</span>
                    <span className="text-emerald-400">[DELIVERY]</span>
                    <span>Prepared PR #143 with unified diff, reproduction logs, and audit seal</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'pr' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-zinc-500 pb-2 border-b border-[#18191B]">
                  <span>Branch: bug2pr/fix-issue-142</span>
                  <span className="text-emerald-400 font-mono">Ready for Review</span>
                </div>
                <pre className="font-mono text-zinc-300 overflow-x-auto whitespace-pre leading-relaxed select-text">
{`## Summary
Resolves TypeError: Cannot read properties of undefined (reading 'role') when extracting role from OAuth tokens missing explicit claims.

### Verification Evidence
- [x] Baseline failure reproduced on unmodified master (tests/auth/middleware.test.ts)
- [x] Targeted regression test verified green (14ms)
- [x] Complete test suite clean: 86 passed, 0 failed in Docker sandbox
- [x] Zero API breaking changes`}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

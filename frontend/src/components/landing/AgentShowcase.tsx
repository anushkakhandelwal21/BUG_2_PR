import React from 'react';
import { Search, GitFork, FlaskConical, Wrench, ShieldCheck, GitPullRequest } from 'lucide-react';

export const AgentShowcase: React.FC = () => {
  const agents = [
    {
      role: 'Issue Analyst',
      icon: Search,
      desc: 'Parses issue descriptions, stack traces, and environment preconditions into a structured defect spec.',
      artifact: 'issue_spec.json',
      command: 'ast_grep --pattern "function extractUserRole($$$)"',
    },
    {
      role: 'Repository Explorer',
      icon: GitFork,
      desc: 'Maps repository AST, module dependency graphs, and downstream call sites in an isolated worktree.',
      artifact: 'call_graph.json',
      command: 'find_references --symbol "extractUserRole"',
    },
    {
      role: 'Reproduction Engineer',
      icon: FlaskConical,
      desc: 'Synthesizes an automated regression test that strictly fails on unmodified master code (RED).',
      artifact: 'tests/reproduction/baseline.test.ts',
      command: 'npm test -- -t "undefined claims"',
    },
    {
      role: 'Fix Engineer',
      icon: Wrench,
      desc: 'Synthesizes minimal defensive code changes addressing the defect without breaking API contracts.',
      artifact: 'patch_auth_role.diff',
      command: 'git apply --check /tmp/patch.diff',
    },
    {
      role: 'Verification Agent',
      icon: ShieldCheck,
      desc: 'Spins up an ephemeral container sandbox to execute full test suites and ensure zero regressions.',
      artifact: 'verification_report.json',
      command: 'docker exec sandbox npm test',
    },
    {
      role: 'PR Composer',
      icon: GitPullRequest,
      desc: 'Composes production pull request with root-cause analysis, unified diff, and verified test seal.',
      artifact: 'pull_request_spec.md',
      command: 'gh pr create --body-file /tmp/pr.md',
    },
  ];

  return (
    <section className="py-14 border-t border-[#181C26]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center space-y-2 mb-10 font-sans">
          <div className="text-xs font-mono text-indigo-400 font-medium">
            COOPERATING AGENT ROLES
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Specialized Engineering Agents
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Rather than a single speculative prompt, Bug2PR coordinates discrete agents with explicit contracts and verifiable artifacts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
          {agents.map((agent) => {
            const Icon = agent.icon;
            return (
              <div
                key={agent.role}
                className="p-3.5 rounded-[3px] border border-[#181C26] bg-[#0C0E12] flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-zinc-200 text-xs">
                      {agent.role}
                    </span>
                    <Icon className="w-3.5 h-3.5 text-zinc-500" />
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                    {agent.desc}
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-[#181C26] text-[10px]">
                  <div className="text-indigo-300 truncate">
                    $ {agent.command}
                  </div>
                  <div className="text-zinc-500">
                    Artifact: <span className="text-zinc-400">{agent.artifact}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

import React, { useState } from 'react';
import { AgentActivity, AgentRole } from '../../types';
import { Terminal, FileCode, ChevronDown, ChevronUp, Cpu } from 'lucide-react';

interface AgentActivityPanelProps {
  agents: AgentActivity[];
}

export const AgentActivityPanel: React.FC<AgentActivityPanelProps> = ({ agents }) => {
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  const getStatusDot = (status: AgentActivity['status']) => {
    switch (status) {
      case 'active':
        return <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-quiet-pulse"></span>;
      case 'completed':
        return <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>;
      case 'failed':
        return <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>;
      case 'idle':
      default:
        return <span className="w-1.5 h-1.5 rounded-full bg-zinc-600"></span>;
    }
  };

  return (
    <div className="border border-[#181C26] bg-[#0C0E12] rounded-[4px] p-3.5 space-y-3 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#181C26] text-xs">
        <div className="flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-zinc-400" />
          <h3 className="font-semibold uppercase tracking-wider text-zinc-200 text-xs">
            Multi-Agent Execution Stream
          </h3>
        </div>
        <span className="text-[11px] text-zinc-500">6 Specialized Roles</span>
      </div>

      {/* Dense Grid of Agent Roles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
        {agents.map((agent) => {
          const isExpanded = expandedRole === agent.role || agent.status === 'active';

          return (
            <div
              key={agent.role}
              className={`p-2.5 rounded-[3px] border transition-colors flex flex-col justify-between ${
                agent.status === 'active'
                  ? 'bg-[#11141B] border-indigo-500/40'
                  : 'bg-[#07080A] border-[#181C26]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-zinc-300 text-[11px]">
                    {agent.role}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                    {getStatusDot(agent.status)}
                    <span className="uppercase">{agent.status}</span>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-400 font-sans leading-relaxed line-clamp-2">
                  {agent.currentAction}
                </p>

                {/* Command & Reasoning excerpt when expanded */}
                {agent.lastCommand && isExpanded && (
                  <div className="mt-2 p-1.5 bg-black border border-zinc-900 rounded-[2px] text-[10px] text-zinc-400 space-y-1">
                    <div className="text-indigo-300 flex items-center gap-1 truncate">
                      <Terminal className="w-2.5 h-2.5 text-zinc-500 shrink-0" />
                      <span className="truncate">{agent.lastCommand}</span>
                    </div>
                    {agent.lastOutput && (
                      <div className="text-zinc-500 text-[9px] truncate pl-3.5">
                        {agent.lastOutput}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Artifacts tag */}
              <div className="mt-2 pt-1.5 border-t border-[#181C26] flex items-center justify-between text-[10px] text-zinc-500">
                <div className="flex items-center gap-1 truncate max-w-[140px]">
                  {agent.artifactsCreated && agent.artifactsCreated[0] ? (
                    <>
                      <FileCode className="w-3 h-3 text-indigo-400 shrink-0" />
                      <span className="text-zinc-400 truncate">{agent.artifactsCreated[0]}</span>
                    </>
                  ) : (
                    <span className="text-zinc-600">No artifact</span>
                  )}
                </div>

                {agent.lastCommand && (
                  <button
                    onClick={() => setExpandedRole(expandedRole === agent.role ? null : agent.role)}
                    className="text-zinc-500 hover:text-zinc-300"
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  GitPullRequest, 
  Plus, 
  Layers, 
  Settings, 
  Activity,
  ChevronDown,
  ExternalLink,
  Check,
  History
} from 'lucide-react';
import { FixtrailLogo, FixtrailMark } from '../common/FixtrailLogo';
import { GithubIcon } from '../common/Icons';
import { repoContextStore, RepositoryContext } from '../../services/repoContext';

interface SidebarProps {
  collapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed = false }) => {
  const location = useLocation();
  const [activeRepo, setActiveRepo] = useState<RepositoryContext>(repoContextStore.getActiveRepository());
  const [isGitHubConnected, setIsGitHubConnected] = useState(repoContextStore.isGitHubConnected());
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = repoContextStore.subscribe(() => {
      setActiveRepo(repoContextStore.getActiveRepository());
      setIsGitHubConnected(repoContextStore.isGitHubConnected());
    });
    return () => unsubscribe();
  }, []);

  const navItems = [
    { label: 'Overview', path: '/dashboard', icon: Layers },
    { label: 'New Run', path: '/runs/new', icon: Plus },
    { label: 'Run Replay', path: '/replay', icon: History },
    { label: 'Active Pipeline', path: '/dashboard?tab=running', icon: Activity },
    { label: 'Verified PRs', path: '/dashboard?tab=prs', icon: GitPullRequest },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path.includes('?')) {
      return location.pathname + location.search === path;
    }
    return location.pathname === path;
  };

  const availableRepos = repoContextStore.getAvailableRepositories();

  return (
    <aside
      className={`h-screen sticky top-0 flex flex-col bg-[#07080A] border-r border-[#181C26] transition-all duration-150 z-30 select-none ${
        collapsed ? 'w-14' : 'w-56'
      }`}
    >
      {/* Brand Header */}
      <div className="h-12 flex items-center px-3.5 border-b border-[#181C26] justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          {collapsed ? (
            <FixtrailMark size={20} />
          ) : (
            <FixtrailLogo size={18} showWordmark={true} />
          )}
        </Link>
      </div>

      {/* Honest Repository Context Switcher */}
      {!collapsed && (
        <div className="relative px-2.5 py-2 border-b border-[#181C26]">
          <button
            onClick={() => setRepoDropdownOpen(!repoDropdownOpen)}
            className="w-full flex items-center justify-between text-[11px] text-zinc-400 hover:text-zinc-200 font-mono py-1 px-1.5 rounded-[3px] hover:bg-[#11141B] transition-colors"
          >
            <div className="flex items-center gap-1.5 truncate">
              <span className={`w-1.5 h-1.5 rounded-full ${activeRepo.isDemo ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
              <span className="truncate text-zinc-300">
                {activeRepo.owner}/{activeRepo.name}
              </span>
              {activeRepo.isDemo && (
                <span className="text-[9px] uppercase px-1 py-0.2 bg-zinc-800 text-zinc-400 rounded">
                  DEMO
                </span>
              )}
            </div>
            <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
          </button>

          {/* Repository Selector Dropdown */}
          {repoDropdownOpen && (
            <div className="absolute top-full left-2 right-2 mt-1 bg-[#0E1015] border border-[#202634] rounded-[3px] shadow-2xl py-1 z-50 text-[11px] font-mono">
              <div className="px-2 py-1 text-[9px] uppercase tracking-wider text-zinc-500">
                Active Repository
              </div>
              {availableRepos.map((repo) => (
                <button
                  key={repo.id}
                  onClick={() => {
                    repoContextStore.setActiveRepository(repo.id);
                    setRepoDropdownOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-[#161A23] flex items-center justify-between transition-colors"
                >
                  <div className="truncate pr-1">
                    <span className="text-zinc-300">{repo.owner}/{repo.name}</span>
                    {repo.isDemo && <span className="text-[9px] text-amber-400 ml-1.5">[DEMO]</span>}
                  </div>
                  {repo.id === activeRepo.id && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                </button>
              ))}

              <div className="pt-1 mt-1 border-t border-[#181C26]">
                <Link
                  to="/settings"
                  onClick={() => setRepoDropdownOpen(false)}
                  className="block px-2.5 py-1 text-indigo-400 hover:text-indigo-300 text-[10px]"
                >
                  + Connect GitHub Account...
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-[3px] text-xs transition-colors font-medium ${
                active
                  ? 'bg-[#141720] text-white border-l-2 border-emerald-500 pl-[8px]'
                  : 'text-zinc-400 hover:bg-[#0E1015] hover:text-zinc-200'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-emerald-400' : 'text-zinc-500'}`} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        <div className="pt-3 mt-3 border-t border-[#181C26]">
          {!collapsed && (
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 mb-1 px-2.5">
              Documentation
            </div>
          )}
          <Link
            to="/"
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[3px] text-xs font-medium text-zinc-400 hover:bg-[#0E1015] hover:text-zinc-200 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
            {!collapsed && <span>Product Spec</span>}
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[3px] text-xs font-medium text-zinc-400 hover:bg-[#0E1015] hover:text-zinc-200 transition-colors"
          >
            <GithubIcon className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
            {!collapsed && <span>GitHub App</span>}
          </a>
        </div>
      </nav>

      {/* Bottom Area: Verification Invariant Indicator */}
      {!collapsed && (
        <div className="px-3 py-2 border-t border-[#181C26] text-[10px] font-mono text-zinc-500 space-y-0.5">
          <div className="flex items-center gap-1.5 text-zinc-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Verification Invariant</span>
          </div>
          <div className="text-[9px] text-zinc-500 leading-tight">
            No failing test &rarr; No PR
          </div>
        </div>
      )}

      {/* Honest Account / GitHub Connection State */}
      <div className="h-11 px-3 border-t border-[#181C26] flex items-center justify-between bg-[#07080A]">
        {isGitHubConnected ? (
          <div className="flex items-center gap-2 overflow-hidden text-[11px] font-mono text-zinc-300">
            <div className="w-5 h-5 rounded-[2px] bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 flex items-center justify-center text-[10px] font-bold shrink-0">
              GH
            </div>
            {!collapsed && (
              <div className="truncate">
                <span className="truncate">Connected</span>
              </div>
            )}
          </div>
        ) : (
          <Link
            to="/settings"
            className="flex items-center gap-2 overflow-hidden text-[11px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <GithubIcon className="w-4 h-4 shrink-0 text-zinc-600" />
            {!collapsed && (
              <span className="truncate">Connect GitHub</span>
            )}
          </Link>
        )}
      </div>
    </aside>
  );
};

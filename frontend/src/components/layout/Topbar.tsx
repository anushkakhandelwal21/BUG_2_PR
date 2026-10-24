import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, Menu, RotateCcw } from 'lucide-react';
import { apiService } from '../../services/api';

interface TopbarProps {
  onMobileMenuToggle?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onMobileMenuToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleResetDemo = () => {
    if (window.confirm('Reset all demo resolution runs to default baseline?')) {
      apiService.resetRuns();
      navigate('/dashboard');
      window.location.reload();
    }
  };

  const getBreadcrumbs = () => {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts.length === 0) return [{ label: 'bug2pr', path: '/' }];
    
    const crumbs = [{ label: 'workspace', path: '/dashboard' }];
    if (parts[0] === 'dashboard') {
      crumbs.push({ label: 'runs', path: '/dashboard' });
    } else if (parts[0] === 'runs') {
      if (parts[1] === 'new') {
        crumbs.push({ label: 'new-run', path: '/runs/new' });
      } else if (parts[1]) {
        crumbs.push({ label: parts[1], path: `/runs/${parts[1]}` });
        if (parts[2] === 'diff') {
          crumbs.push({ label: 'diff', path: `/runs/${parts[1]}/diff` });
        }
      }
    } else if (parts[0] === 'settings') {
      crumbs.push({ label: 'settings', path: '/settings' });
    }
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="h-11 border-b border-[#181C26] bg-[#07080A] sticky top-0 z-20 px-3 md:px-5 flex items-center justify-between">
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-2">
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden p-1 rounded text-zinc-400 hover:text-white"
          aria-label="Open menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <nav className="flex items-center gap-1.5 text-xs font-mono text-zinc-500" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.path + idx}>
              {idx > 0 && <ChevronRight className="w-3 h-3 text-zinc-600" />}
              <Link
                to={crumb.path}
                className={`transition-colors hover:text-zinc-200 ${
                  idx === breadcrumbs.length - 1 ? 'font-medium text-zinc-200' : 'text-zinc-500'
                }`}
              >
                {crumb.label}
              </Link>
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleResetDemo}
          title="Reset demonstration state"
          className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <RotateCcw className="w-3 h-3 text-zinc-500" />
          <span className="hidden sm:inline">Reset Demo</span>
        </button>

        <Link
          to="/runs/new"
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-[3px] bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Run</span>
        </Link>
      </div>
    </header>
  );
};

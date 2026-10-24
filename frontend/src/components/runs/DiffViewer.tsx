import React, { useState, useMemo } from 'react';
import { FileDiff } from '../../types';
import { Copy, Check, Plus, Minus, FileCode, Columns2, AlignLeft, AlertCircle, Search } from 'lucide-react';

interface DiffViewerProps {
  diffs: FileDiff[];
  title?: string;
  errorMessage?: string;
}

interface ParsedDiffLine {
  type: 'context' | 'add' | 'delete' | 'header';
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

interface SideBySideRow {
  left?: ParsedDiffLine;
  right?: ParsedDiffLine;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ 
  diffs = [], 
  title = 'Code Changes & Regression Test',
  errorMessage,
}) => {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
  const [copied, setCopied] = useState(false);
  const [lineFilter, setLineFilter] = useState('');

  const currentDiff = diffs[selectedFileIndex] || diffs[0] || null;
  const totalAdditions = diffs.reduce((sum, d) => sum + (d.additions || 0), 0);
  const totalDeletions = diffs.reduce((sum, d) => sum + (d.deletions || 0), 0);

  // Parser to convert standard unified diff string into line-numbered structures safely
  const parsedLines: ParsedDiffLine[] = useMemo(() => {
    if (!currentDiff || !currentDiff.unifiedDiff) return [];
    const lines = currentDiff.unifiedDiff.split('\n');
    let oldNum = 0;
    let newNum = 0;
    const result: ParsedDiffLine[] = [];

    for (const rawLine of lines) {
      if (rawLine.startsWith('@@')) {
        const match = rawLine.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (match) {
          oldNum = parseInt(match[1], 10);
          newNum = parseInt(match[2], 10);
        }
        result.push({ type: 'header', content: rawLine });
      } else if (rawLine.startsWith('+') && !rawLine.startsWith('+++')) {
        result.push({
          type: 'add',
          newLineNumber: newNum++,
          content: rawLine.substring(1),
        });
      } else if (rawLine.startsWith('-') && !rawLine.startsWith('---')) {
        result.push({
          type: 'delete',
          oldLineNumber: oldNum++,
          content: rawLine.substring(1),
        });
      } else {
        result.push({
          type: 'context',
          oldLineNumber: oldNum > 0 ? oldNum++ : undefined,
          newLineNumber: newNum > 0 ? newNum++ : undefined,
          content: rawLine.startsWith(' ') ? rawLine.substring(1) : rawLine,
        });
      }
    }
    return result;
  }, [currentDiff]);

  // Pair lines for Side-by-Side (Split) view
  const sideBySideRows: SideBySideRow[] = useMemo(() => {
    const rows: SideBySideRow[] = [];
    let i = 0;
    while (i < parsedLines.length) {
      const line = parsedLines[i];
      if (line.type === 'header' || line.type === 'context') {
        rows.push({ left: line, right: line });
        i++;
      } else if (line.type === 'delete') {
        const next = parsedLines[i + 1];
        if (next && next.type === 'add') {
          rows.push({ left: line, right: next });
          i += 2;
        } else {
          rows.push({ left: line, right: undefined });
          i++;
        }
      } else if (line.type === 'add') {
        rows.push({ left: undefined, right: line });
        i++;
      }
    }
    return rows;
  }, [parsedLines]);

  // Filter lines if search string is entered
  const filteredUnifiedLines = useMemo(() => {
    if (!lineFilter.trim()) return parsedLines;
    const q = lineFilter.toLowerCase();
    return parsedLines.filter((l) => l.content.toLowerCase().includes(q) || l.type === 'header');
  }, [parsedLines, lineFilter]);

  const handleCopyDiff = () => {
    if (!currentDiff?.unifiedDiff) return;
    navigator.clipboard.writeText(currentDiff.unifiedDiff);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. Error state when backend cannot provide diff
  if (errorMessage) {
    return (
      <div className="border border-rose-500/30 bg-[#0C0D0E] rounded-[2px] p-8 text-center text-rose-300 font-mono text-xs space-y-2">
        <AlertCircle className="w-6 h-6 mx-auto text-rose-400" />
        <div className="font-semibold text-sm">Failed to Load Code Diff</div>
        <p className="text-zinc-400 max-w-md mx-auto text-[11px] leading-relaxed">
          {errorMessage}
        </p>
      </div>
    );
  }

  // 2. Honest empty state when no diff is available
  if (!diffs || diffs.length === 0 || !currentDiff) {
    return (
      <div className="border border-[#1C1D1F] bg-[#0C0D0E] rounded-[2px] p-8 text-center text-zinc-500 font-mono text-xs space-y-2">
        <FileCode className="w-6 h-6 mx-auto text-zinc-600" />
        <div className="font-semibold text-zinc-300 text-sm">No Diff Available</div>
        <p className="text-zinc-500 max-w-md mx-auto text-[11px] leading-relaxed">
          The Fixer stage has not produced or applied a patch yet, or the run was halted before patch synthesis.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-[#1C1D1F] bg-[#0C0D0E] rounded-[2px] overflow-hidden flex flex-col font-mono text-xs">
      {/* Top Header Bar */}
      <div className="px-3 py-2 border-b border-[#1C1D1F] flex flex-wrap items-center justify-between gap-2 bg-[#080909]">
        <div className="flex items-center gap-2.5">
          <FileCode className="w-3.5 h-3.5 text-zinc-400" />
          <span className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px]">{title}</span>
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <span className="text-emerald-400 flex items-center">
              <Plus className="w-2.5 h-2.5" />{totalAdditions}
            </span>
            <span className="text-rose-400 flex items-center">
              <Minus className="w-2.5 h-2.5" />{totalDeletions}
            </span>
            <span className="text-zinc-600">({diffs.length} {diffs.length === 1 ? 'file' : 'files'})</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search in diff */}
          <div className="relative hidden sm:block">
            <Search className="w-3 h-3 text-zinc-600 absolute left-2 top-1.5" />
            <input
              type="text"
              placeholder="Search diff..."
              value={lineFilter}
              onChange={(e) => setLineFilter(e.target.value)}
              className="bg-[#050607] border border-[#1C1D1F] rounded-[2px] text-[10px] pl-6 pr-1.5 py-0.5 text-zinc-200 placeholder-zinc-600 focus:outline-none w-28"
            />
          </div>

          {/* Unified vs Side-by-Side View Toggle */}
          <div className="flex items-center border border-[#1C1D1F] rounded-[2px] bg-[#050607] p-0.5 text-[10px]">
            <button
              onClick={() => setViewMode('unified')}
              className={`px-2 py-0.5 rounded-[2px] flex items-center gap-1 transition-colors ${
                viewMode === 'unified' ? 'bg-[#18191B] text-white font-medium' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <AlignLeft className="w-3 h-3" />
              <span>Unified</span>
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-2 py-0.5 rounded-[2px] flex items-center gap-1 transition-colors ${
                viewMode === 'split' ? 'bg-[#18191B] text-white font-medium' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Columns2 className="w-3 h-3" />
              <span>Side-by-Side</span>
            </button>
          </div>

          {/* Copy Patch */}
          <button
            onClick={handleCopyDiff}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono text-zinc-400 hover:text-white border border-[#1C1D1F] rounded-[2px] bg-[#050607] transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 min-h-[380px]">
        {/* Changed Files Sidebar */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[#1C1D1F] bg-[#070809] p-2 space-y-1 shrink-0">
          <div className="px-2 py-1 text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
            Modified Files ({diffs.length})
          </div>
          {diffs.map((diff, index) => {
            const isSelected = selectedFileIndex === index;
            const filenameParts = diff.filename.split('/');
            const basename = filenameParts.pop();
            const dirname = filenameParts.join('/');

            return (
              <button
                key={diff.filename}
                onClick={() => setSelectedFileIndex(index)}
                className={`w-full text-left px-2.5 py-2 rounded-[2px] transition-colors flex flex-col gap-1 border ${
                  isSelected
                    ? 'bg-[#141618] border-zinc-700 text-zinc-100 font-semibold'
                    : 'border-transparent text-zinc-400 hover:bg-[#0E1012] hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-xs text-zinc-200">{basename}</span>
                  <div className="flex items-center gap-1.5 text-[10px] shrink-0 font-mono">
                    <span className="text-emerald-400">+{diff.additions}</span>
                    <span className="text-rose-400">-{diff.deletions}</span>
                  </div>
                </div>
                {dirname && (
                  <div className="text-[10px] text-zinc-500 truncate font-mono">{dirname}/</div>
                )}
                {diff.isRegressionTest && (
                  <span className="self-start text-[9px] uppercase px-1.5 py-0.2 rounded-[2px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    Regression Test Spec
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Diff Output Area */}
        <div className="flex-1 bg-[#050607] flex flex-col min-w-0 overflow-hidden">
          {/* Active file metadata header */}
          <div className="px-3 py-1.5 border-b border-[#1C1D1F] bg-[#090A0B] flex items-center justify-between text-[11px] text-zinc-400">
            <span className="truncate font-mono">{currentDiff.filename}</span>
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="text-emerald-400 font-semibold">+{currentDiff.additions}</span>
              <span className="text-rose-400 font-semibold">-{currentDiff.deletions}</span>
            </div>
          </div>

          {/* Unified View */}
          {viewMode === 'unified' && (
            <div className="overflow-x-auto flex-1 text-xs select-text">
              {filteredUnifiedLines.map((line, idx) => {
                let rowBg = 'hover:bg-zinc-900/30 text-zinc-300';
                let symbol = ' ';

                if (line.type === 'header') {
                  return (
                    <div
                      key={idx}
                      className="px-3 py-1 bg-[#0E1013] text-zinc-400 font-mono text-[11px] border-y border-[#18191B] select-none"
                    >
                      {line.content}
                    </div>
                  );
                } else if (line.type === 'add') {
                  rowBg = 'bg-emerald-950/20 text-emerald-300';
                  symbol = '+';
                } else if (line.type === 'delete') {
                  rowBg = 'bg-rose-950/20 text-rose-300';
                  symbol = '-';
                }

                return (
                  <div
                    key={idx}
                    className={`flex items-start font-mono text-xs px-2 py-0.5 leading-snug border-b border-transparent ${rowBg}`}
                  >
                    <span className="w-9 text-zinc-600 select-none text-right pr-2 shrink-0 text-[10px]">
                      {line.oldLineNumber || ''}
                    </span>
                    <span className="w-9 text-zinc-600 select-none text-right pr-2 shrink-0 text-[10px]">
                      {line.newLineNumber || ''}
                    </span>
                    <span className={`w-3.5 select-none shrink-0 font-bold text-[11px] ${
                      symbol === '+' ? 'text-emerald-400' : symbol === '-' ? 'text-rose-400' : 'text-zinc-600'
                    }`}>
                      {symbol}
                    </span>
                    {/* Render untrusted text securely as pure text node */}
                    <pre className="whitespace-pre overflow-x-auto flex-1 font-mono text-xs m-0 p-0 break-all">
                      {line.content}
                    </pre>
                  </div>
                );
              })}
            </div>
          )}

          {/* Side-by-Side (Split) View */}
          {viewMode === 'split' && (
            <div className="overflow-x-auto flex-1 text-xs select-text">
              <div className="grid grid-cols-2 divide-x divide-[#1C1D1F] min-w-[700px]">
                {sideBySideRows.map((row, idx) => {
                  const left = row.left;
                  const right = row.right;

                  if (left?.type === 'header' || right?.type === 'header') {
                    return (
                      <div
                        key={idx}
                        className="col-span-2 px-3 py-1 bg-[#0E1013] text-zinc-400 font-mono text-[11px] border-y border-[#18191B] select-none"
                      >
                        {left?.content || right?.content}
                      </div>
                    );
                  }

                  const leftBg = left?.type === 'delete' ? 'bg-rose-950/20 text-rose-300' : 'text-zinc-300';
                  const rightBg = right?.type === 'add' ? 'bg-emerald-950/20 text-emerald-300' : 'text-zinc-300';

                  return (
                    <React.Fragment key={idx}>
                      {/* Left Pane (Old / Deletions) */}
                      <div className={`flex items-start px-2 py-0.5 font-mono text-xs leading-snug overflow-hidden ${leftBg}`}>
                        <span className="w-8 text-zinc-600 select-none text-right pr-2 shrink-0 text-[10px]">
                          {left?.oldLineNumber || ''}
                        </span>
                        <span className="w-3 select-none text-rose-400 font-bold shrink-0 text-[11px]">
                          {left?.type === 'delete' ? '-' : ' '}
                        </span>
                        <pre className="whitespace-pre overflow-x-auto flex-1 font-mono text-xs m-0 p-0 break-all">
                          {left?.content || ''}
                        </pre>
                      </div>

                      {/* Right Pane (New / Additions) */}
                      <div className={`flex items-start px-2 py-0.5 font-mono text-xs leading-snug overflow-hidden ${rightBg}`}>
                        <span className="w-8 text-zinc-600 select-none text-right pr-2 shrink-0 text-[10px]">
                          {right?.newLineNumber || ''}
                        </span>
                        <span className="w-3 select-none text-emerald-400 font-bold shrink-0 text-[11px]">
                          {right?.type === 'add' ? '+' : ' '}
                        </span>
                        <pre className="whitespace-pre overflow-x-auto flex-1 font-mono text-xs m-0 p-0 break-all">
                          {right?.content || ''}
                        </pre>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

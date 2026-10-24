import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LogEntry, VerificationResult } from '../../types';
import { 
  Terminal, 
  Copy, 
  Check, 
  Search, 
  Maximize2, 
  Minimize2, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  XCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface TerminalLogsProps {
  logs: LogEntry[];
  verification?: VerificationResult;
  title?: string;
  isExecuting?: boolean;
}

export const TerminalLogs: React.FC<TerminalLogsProps> = ({ 
  logs, 
  verification,
  title = 'Sandbox Execution Output & Test Verification',
  isExecuting = false,
}) => {
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [filterMode, setFilterMode] = useState<'ALL' | 'STDOUT' | 'STDERR' | 'TESTS' | 'ERRORS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showVerificationSummary, setShowVerificationSummary] = useState(true);
  const [showStackTrace, setShowStackTrace] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleCopy = () => {
    const raw = logs.map((l) => {
      const time = l.timestamp ? `[${l.timestamp}] ` : '';
      const agent = l.agent ? `(${l.agent}) ` : '';
      const stream = l.stream ? `[${l.stream.toUpperCase()}] ` : '';
      return `${time}${stream}${agent}${l.message}${l.details ? `\n${l.details}` : ''}`;
    }).join('\n');

    navigator.clipboard.writeText(raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filterMode === 'STDOUT' && log.stream !== 'stdout' && log.severity !== 'STDOUT') return false;
      if (filterMode === 'STDERR' && log.stream !== 'stderr' && log.severity !== 'STDERR') return false;
      if (filterMode === 'TESTS' && !['TEST_PASS', 'TEST_FAIL'].includes(log.severity)) return false;
      if (filterMode === 'ERRORS' && !['TEST_FAIL', 'STDERR', 'ERROR', 'WARN'].includes(log.severity)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const msgMatch = log.message.toLowerCase().includes(q);
        const detailsMatch = log.details?.toLowerCase().includes(q);
        const agentMatch = log.agent?.toLowerCase().includes(q);
        return msgMatch || detailsMatch || agentMatch;
      }
      return true;
    });
  }, [logs, filterMode, searchQuery]);

  return (
    <div className={`border border-[#1C1D1F] bg-[#070809] rounded-[2px] overflow-hidden flex flex-col font-mono text-xs transition-all ${
      isExpanded ? 'fixed inset-3 z-50 shadow-2xl bg-[#070809]' : 'min-h-[420px]'
    }`}>
      {/* 1. Terminal Top Bar */}
      <div className="bg-[#0C0D0E] border-b border-[#1C1D1F] px-3 py-2 flex flex-wrap items-center justify-between gap-2 select-none">
        <div className="flex items-center gap-2 text-zinc-300">
          <Terminal className="w-3.5 h-3.5 text-zinc-500" />
          <span className="font-semibold text-xs tracking-tight uppercase text-zinc-200">{title}</span>
          <span className="text-zinc-600 text-[10px]">({filteredLogs.length} events)</span>
          {isExecuting && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-[2px] border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>STDOUT STREAMING</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Grep search */}
          <div className="relative hidden sm:block">
            <Search className="w-3 h-3 text-zinc-600 absolute left-2 top-1.5" />
            <input
              type="text"
              placeholder="grep logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#050607] border border-[#1C1D1F] rounded-[2px] text-[10px] pl-6 pr-1.5 py-0.5 text-zinc-200 placeholder-zinc-600 focus:outline-none w-32"
            />
          </div>

          {/* Stream Filter Buttons */}
          <div className="flex items-center gap-1 text-[10px]">
            {(['ALL', 'STDOUT', 'STDERR', 'TESTS', 'ERRORS'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`px-1.5 py-0.5 rounded-[2px] transition-colors ${
                  filterMode === mode 
                    ? 'bg-[#181A1D] text-white font-medium border border-zinc-700' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-1.5 py-0.5 rounded-[2px] text-[10px] transition-colors border ${
              autoScroll 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-medium' 
                : 'bg-[#111316] text-zinc-500 border-[#1C1D1F]'
            }`}
          >
            Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
          </button>

          {/* Copy */}
          <button
            onClick={handleCopy}
            title="Copy logs to clipboard"
            className="p-1 text-zinc-400 hover:text-white transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Expand */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Restore' : 'Expand full screen'}
            className="p-1 text-zinc-400 hover:text-white transition-colors"
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. Structured Sandbox Verification Summary Strip */}
      {verification && (
        <div className="border-b border-[#1C1D1F] bg-[#0A0B0D] p-3 space-y-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <ShieldCheck className={`w-3.5 h-3.5 ${
                verification.status === 'verified_passed' ? 'text-emerald-400' : 'text-amber-400'
              }`} />
              <span className="font-semibold text-zinc-200 uppercase tracking-wide">
                Sandbox Test Verification Audit
              </span>
              <span className="text-zinc-600">&bull;</span>
              <span className="text-zinc-400 text-[10px]">
                Attempt {verification.attemptNumber} of {verification.maxAttempts}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {verification.executionDurationMs > 0 && (
                <span className="text-zinc-500 text-[10px]">
                  Duration: <span className="text-zinc-300 font-semibold">{(verification.executionDurationMs / 1000).toFixed(2)}s</span>
                </span>
              )}
              <button
                onClick={() => setShowVerificationSummary(!showVerificationSummary)}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-0.5"
              >
                <span>{showVerificationSummary ? 'Collapse' : 'Expand'}</span>
                {showVerificationSummary ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {showVerificationSummary && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
              {/* Baseline Result */}
              <div className="p-2.5 bg-[#050607] border border-[#18191B] rounded-[2px] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-semibold text-rose-400 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    Baseline Test (Pre-Fix Failure)
                  </span>
                  <span className={`text-[9px] px-1 rounded-[2px] font-mono ${
                    verification.baselineReproduced
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    {verification.baselineReproduced ? 'RED PROVED' : 'UNCONFIRMED'}
                  </span>
                </div>

                <div className="text-[11px] text-zinc-300 font-mono">
                  {verification.baselineFailedTest || 'Reproduction test'}
                </div>

                {verification.baselineFailureMessage && (
                  <div>
                    <button
                      onClick={() => setShowStackTrace(!showStackTrace)}
                      className="text-[9px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 my-0.5"
                    >
                      <span>{showStackTrace ? 'Hide Traceback' : 'View Traceback'}</span>
                      {showStackTrace ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                    </button>
                    {showStackTrace && (
                      <pre className="p-2 bg-black border border-zinc-900 text-[10px] text-rose-300/80 overflow-x-auto whitespace-pre-wrap rounded-[2px] max-h-24 leading-snug">
                        {verification.baselineFailureMessage}
                      </pre>
                    )}
                  </div>
                )}
              </div>

              {/* Sandbox Suite Result */}
              <div className="p-2.5 bg-[#050607] border border-[#18191B] rounded-[2px] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-semibold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Sandbox Suite (Post-Fix Verification)
                  </span>
                  <span className={`text-[9px] px-1 rounded-[2px] font-mono ${
                    verification.status === 'verified_passed'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
                      : verification.status === 'verification_failed'
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}>
                    {verification.status === 'verified_passed' 
                      ? 'GREEN VERIFIED' 
                      : verification.status === 'verification_failed'
                      ? 'REGRESSION DETECTED'
                      : 'PENDING VERIFICATION'}
                  </span>
                </div>

                {verification.status === 'verified_passed' ? (
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-emerald-400 font-semibold">
                      ✔ {verification.passedCount} passed, {verification.failedCount} failed, {verification.skippedCount} skipped
                    </span>
                    <span className="text-zinc-500 text-[10px]">Zero host leakage</span>
                  </div>
                ) : verification.isPending || isExecuting ? (
                  <div className="text-[11px] text-zinc-500 italic flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>Tests executing in sandbox container... results pending completion.</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-rose-400">
                    ✕ Sandbox verification unsatisfied: {verification.failedCount} failures detected.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Raw Log Output Stream */}
      <div
        ref={scrollRef}
        className="flex-1 p-3 overflow-y-auto space-y-1 bg-[#050607] select-text max-h-[500px]"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-zinc-600 py-12 text-center text-xs space-y-1">
            <div className="italic">No log events match filter &ldquo;{filterMode}&rdquo;</div>
            {logs.length === 0 && (
              <div className="text-[10px] text-zinc-600">
                Log output will appear as sandbox container commands execute.
              </div>
            )}
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isStderr = log.stream === 'stderr' || log.severity === 'STDERR' || log.severity === 'ERROR';
            const isTestFail = log.severity === 'TEST_FAIL';
            const isTestPass = log.severity === 'TEST_PASS' || log.severity === 'SUCCESS';
            const isCommand = log.severity === 'COMMAND';

            let lineStyle = 'text-zinc-300';
            if (isStderr || isTestFail) lineStyle = 'text-rose-400';
            else if (isTestPass) lineStyle = 'text-emerald-400 font-semibold';
            else if (isCommand) lineStyle = 'text-zinc-200';

            return (
              <div
                key={log.id}
                className="flex items-start gap-2 leading-relaxed text-[11px] hover:bg-zinc-900/40 px-1 py-0.5 rounded-[2px]"
              >
                {/* Timestamp */}
                {log.timestamp && (
                  <span className="text-zinc-600 select-none shrink-0 font-mono text-[10px]">
                    {log.timestamp}
                  </span>
                )}

                {/* Stream Badge */}
                {log.stream && (
                  <span className={`px-1 rounded-[2px] text-[9px] uppercase font-mono font-semibold shrink-0 ${
                    log.stream === 'stderr' ? 'bg-rose-950/40 text-rose-400 border border-rose-900/40' : 'bg-zinc-900 text-zinc-500'
                  }`}>
                    {log.stream}
                  </span>
                )}

                {/* Agent Role */}
                {log.agent && (
                  <span className="text-zinc-500 shrink-0 text-[10px]">
                    [{log.agent.split(' ')[0]}]:
                  </span>
                )}

                {/* Log message content */}
                <span className={`break-all font-mono ${lineStyle}`}>
                  {log.message}
                </span>

                {/* Optional details block */}
                {log.details && (
                  <pre className="mt-1 p-2 bg-[#0C0D0E] border border-[#18191B] text-[10px] text-zinc-400 whitespace-pre-wrap rounded-[2px]">
                    {log.details}
                  </pre>
                )}
              </div>
            );
          })
        )}

        {/* Incomplete / In-progress notice */}
        {isExecuting && (
          <div className="pt-2 text-zinc-500 text-[10px] italic flex items-center gap-1.5 border-t border-[#18191B]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Process stream active. Output is pending further container events.</span>
          </div>
        )}
      </div>
    </div>
  );
};

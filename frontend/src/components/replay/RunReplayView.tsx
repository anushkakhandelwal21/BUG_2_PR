import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RecordedRun, LogEntry, WorkflowStage, StageId } from '../../types';
import { recordReader } from '../../services/recordReader';
import { WorkflowTimeline } from '../runs/WorkflowTimeline';
import { DiffViewer } from '../runs/DiffViewer';
import { TerminalLogs } from '../runs/TerminalLogs';
import { RunStatusBadge } from '../common/RunStatusBadge';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipBack, 
  SkipForward, 
  Upload, 
  FileText, 
  AlertTriangle, 
  GitBranch, 
  Clock, 
  History,
  FileCode,
  FolderOpen
} from 'lucide-react';

export const RunReplayView: React.FC = () => {
  const [records, setRecords] = useState<RecordedRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [currentEventIndex, setCurrentEventIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing recorded runs on mount
  useEffect(() => {
    recordReader.getSavedRecords().then((list) => {
      setRecords(list);
      if (list.length > 0) {
        setSelectedRunId(list[0].runId);
        setCurrentEventIndex(0);
      }
    });
  }, []);

  const activeRecord = useMemo(() => {
    return records.find((r) => r.runId === selectedRunId) || null;
  }, [records, selectedRunId]);

  const totalEvents = activeRecord?.events.length || 0;

  // Handle Play/Pause playback timer
  useEffect(() => {
    if (!isPlaying || !activeRecord || totalEvents === 0) return;
    if (currentEventIndex >= totalEvents - 1) return;

    const intervalMs = Math.max(250, 1500 / playbackSpeed);
    const timer = setInterval(() => {
      setCurrentEventIndex((prev) => {
        if (prev >= totalEvents - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, currentEventIndex, totalEvents, playbackSpeed, activeRecord]);

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = recordReader.parseRecord(text);
        if (parsed.error) {
          setUploadError(parsed.error);
          return;
        }
        if (parsed.record) {
          recordReader.saveRecordLocally(parsed.record);
          setRecords((prev) => [parsed.record!, ...prev.filter((r) => r.runId !== parsed.record!.runId)]);
          setSelectedRunId(parsed.record.runId);
          setCurrentEventIndex(0);
          setIsPlaying(false);
        }
      } catch (err: any) {
        setUploadError(`Failed to read record file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Synchronized Event State at current scrubber index
  const currentEvent = activeRecord && totalEvents > 0 
    ? activeRecord.events[Math.min(currentEventIndex, totalEvents - 1)] 
    : null;

  // Reconstruct synchronized workflow stages at this scrubbed event
  const reconstructedStages: WorkflowStage[] = useMemo(() => {
    const canonicalOrder: StageId[] = ['triage', 'reproducer', 'fixer', 'verifier', 'pull_request'];
    const labels: Record<string, string> = {
      triage: 'Triage',
      reproducer: 'Reproducer',
      fixer: 'Fixer',
      verifier: 'Verifier',
      pull_request: 'Pull Request',
    };

    if (!activeRecord || totalEvents === 0) {
      return canonicalOrder.map((id) => ({
        id,
        label: labels[id],
        shortDesc: 'Stage pending execution',
        status: 'pending',
        assignedAgent: `${labels[id]} Agent`,
      }));
    }

    const activeStageId = currentEvent?.stageId || 'triage';
    const activeStageIndex = canonicalOrder.indexOf(activeStageId);

    return canonicalOrder.map((id, idx) => {
      let status: any = 'pending';
      if (idx < activeStageIndex) {
        status = 'passed';
      } else if (idx === activeStageIndex) {
        status = currentEvent?.stageStatus || 'running';
      }

      return {
        id,
        label: labels[id],
        shortDesc: `Deterministic execution stage ${idx + 1}`,
        status,
        assignedAgent: `${labels[id]} Agent`,
      };
    });
  }, [activeRecord, totalEvents, currentEvent]);

  // Reconstruct synchronized logs up to current event
  const reconstructedLogs: LogEntry[] = useMemo(() => {
    if (!activeRecord || totalEvents === 0) return [];

    const visibleEvents = activeRecord.events.slice(0, currentEventIndex + 1);
    const logs: LogEntry[] = [];

    visibleEvents.forEach((ev, idx) => {
      // Main action log
      logs.push({
        id: `replay-ev-${idx}`,
        timestamp: ev.timestamp,
        severity: ev.stageStatus === 'failed' ? 'TEST_FAIL' : ev.stageStatus === 'running' ? 'COMMAND' : 'INFO',
        agent: ev.agentName,
        message: ev.actionDescription,
        stream: 'stdout',
      });

      // stdout chunk if captured
      if (ev.stdoutChunk) {
        logs.push({
          id: `replay-stdout-${idx}`,
          timestamp: ev.timestamp,
          severity: 'STDOUT',
          message: ev.stdoutChunk,
          stream: 'stdout',
        });
      }

      // stderr chunk if captured
      if (ev.stderrChunk) {
        logs.push({
          id: `replay-stderr-${idx}`,
          timestamp: ev.timestamp,
          severity: 'STDERR',
          message: ev.stderrChunk,
          stream: 'stderr',
        });
      }
    });

    return logs;
  }, [activeRecord, totalEvents, currentEventIndex]);

  // Synchronized diff viewer: only show diff once reached fixer or verifier stage
  const visibleDiffs = useMemo(() => {
    if (!activeRecord?.diffs || activeRecord.diffs.length === 0) return [];
    if (!currentEvent) return [];

    const order: StageId[] = ['triage', 'reproducer', 'fixer', 'verifier', 'pull_request'];
    const currentIdx = order.indexOf(currentEvent.stageId);
    const fixerIdx = order.indexOf('fixer');

    if (currentIdx >= fixerIdx) {
      return activeRecord.diffs;
    }
    return [];
  }, [activeRecord?.diffs, currentEvent]);

  // Jump scrubber to specific stage
  const handleJumpToStage = (targetStage: StageId) => {
    if (!activeRecord) return;
    const idx = activeRecord.events.findIndex((e) => e.stageId === targetStage);
    if (idx !== -1) {
      setCurrentEventIndex(idx);
      setIsPlaying(false);
    }
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* 1. Replay Header & File Selector Bar */}
      <div className="border border-[#1C1D1F] bg-[#0C0D0E] rounded-[2px] p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white font-sans">
              Run Replay from Recorded JSON
            </h2>
            <span className="text-zinc-600">&bull;</span>
            <span className="text-[10px] text-zinc-500">
              Deterministic Event Reconstruction
            </span>
          </div>

          {/* Load Run JSON Button */}
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 bg-[#141618] hover:bg-[#1A1D20] border border-[#22252A] text-zinc-300 hover:text-white rounded-[2px] transition-colors flex items-center gap-1.5"
            >
              <Upload className="w-3 h-3 text-zinc-400" />
              <span>Load Run Record (.json)</span>
            </button>
          </div>
        </div>

        {uploadError && (
          <div className="p-2 bg-rose-950/20 border border-rose-900/30 text-rose-300 rounded-[2px] text-[11px] flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Record Selection Dropdown */}
        {records.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1C1D1F]">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 text-[11px]">Select Saved Run:</span>
              <select
                value={selectedRunId}
                onChange={(e) => {
                  setSelectedRunId(e.target.value);
                  setCurrentEventIndex(0);
                  setIsPlaying(false);
                }}
                className="bg-[#070809] border border-[#1C1D1F] text-zinc-200 rounded-[2px] px-2 py-1 text-xs focus:outline-none"
              >
                {records.map((r) => (
                  <option key={r.runId} value={r.runId}>
                    {r.runId} &mdash; #{r.issue.number} ({r.issue.repository}) [{r.finalStatus.toUpperCase()}]
                  </option>
                ))}
              </select>
            </div>

            {activeRecord && (
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
                <div className="flex items-center gap-1">
                  <span className="text-zinc-200 font-semibold">{activeRecord.issue.repository}</span>
                  <span className="text-zinc-600">#{activeRecord.issue.number}</span>
                </div>
                <span className="text-zinc-700">&bull;</span>
                <RunStatusBadge status={activeRecord.finalStatus} size="sm" />
                <span className="text-zinc-700">&bull;</span>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-zinc-500" />
                  <span>{activeRecord.durationSeconds ? `${activeRecord.durationSeconds}s` : 'Settled'}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 bg-[#070809] border border-[#1C1D1F] rounded-[2px] text-center space-y-2">
            <FolderOpen className="w-6 h-6 mx-auto text-zinc-600" />
            <div className="text-zinc-300 font-semibold">No Recorded Runs Available</div>
            <p className="text-zinc-500 max-w-md mx-auto text-[11px] leading-relaxed font-sans">
              Bug2PR expects JSON run records produced by <code className="text-zinc-400">recorder.py</code> stored in the <code className="text-zinc-400">/records</code> directory or uploaded using the button above.
            </p>
          </div>
        )}
      </div>

      {activeRecord && (
        <>
          {/* Missing data notification if any */}
          {activeRecord.unrecordedFields && activeRecord.unrecordedFields.length > 0 && (
            <div className="p-2.5 bg-[#0F1012] border border-[#202227] text-zinc-400 rounded-[2px] text-[11px] flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-zinc-300 font-semibold">Historical Notice: </span>
                Some fields were not captured during recording: {activeRecord.unrecordedFields.join(', ')}.
              </div>
            </div>
          )}

          {/* 2. Scrubber & Playback Controls Bar */}
          <div className="border border-[#1C1D1F] bg-[#0C0D0E] rounded-[2px] p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Playback Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setCurrentEventIndex(0);
                    setIsPlaying(false);
                  }}
                  title="Restart to beginning"
                  className="p-1.5 rounded-[2px] bg-[#141618] border border-[#22252A] text-zinc-400 hover:text-white"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
                <button
                  onClick={() => {
                    setCurrentEventIndex((prev) => Math.max(0, prev - 1));
                    setIsPlaying(false);
                  }}
                  disabled={currentEventIndex <= 0}
                  title="Step backward"
                  className="p-1.5 rounded-[2px] bg-[#141618] border border-[#22252A] text-zinc-400 hover:text-white disabled:opacity-30"
                >
                  <SkipBack className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`px-3 py-1 rounded-[2px] border font-medium flex items-center gap-1.5 transition-colors ${
                    isPlaying 
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' 
                      : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  }`}
                >
                  {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>{isPlaying ? 'Pause' : 'Play Replay'}</span>
                </button>
                <button
                  onClick={() => {
                    setCurrentEventIndex((prev) => Math.min(totalEvents - 1, prev + 1));
                    setIsPlaying(false);
                  }}
                  disabled={currentEventIndex >= totalEvents - 1}
                  title="Step forward"
                  className="p-1.5 rounded-[2px] bg-[#141618] border border-[#22252A] text-zinc-400 hover:text-white disabled:opacity-30"
                >
                  <SkipForward className="w-3 h-3" />
                </button>
              </div>

              {/* Speed & Event Counter */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                  <span>Speed:</span>
                  <select
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                    className="bg-[#070809] border border-[#1C1D1F] text-zinc-300 rounded-[2px] px-1 py-0.5 text-[10px]"
                  >
                    <option value={0.5}>0.5x</option>
                    <option value={1}>1.0x</option>
                    <option value={2}>2.0x</option>
                    <option value={4}>4.0x</option>
                  </select>
                </div>

                <span className="text-zinc-600">&bull;</span>

                <div className="text-[11px] text-zinc-300 font-mono">
                  Event <span className="font-bold text-white">{currentEventIndex + 1}</span> of <span className="text-zinc-400">{totalEvents}</span>
                </div>
              </div>
            </div>

            {/* Scrubber Range Slider */}
            <div className="space-y-1">
              <input
                type="range"
                min={0}
                max={Math.max(0, totalEvents - 1)}
                value={currentEventIndex}
                onChange={(e) => {
                  setCurrentEventIndex(parseInt(e.target.value, 10));
                  setIsPlaying(false);
                }}
                className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
                <span>Start (T+0s)</span>
                <span>{currentEvent?.timestamp || ''}</span>
                <span>Final State ({activeRecord.durationSeconds ? `${activeRecord.durationSeconds}s` : 'End'})</span>
              </div>
            </div>

            {/* Stage Quick Jump Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#1C1D1F] text-[10px]">
              <span className="text-zinc-500 mr-1">Jump to stage:</span>
              {(['triage', 'reproducer', 'fixer', 'verifier', 'pull_request'] as StageId[]).map((stg) => (
                <button
                  key={stg}
                  onClick={() => handleJumpToStage(stg)}
                  className={`px-1.5 py-0.5 rounded-[2px] border transition-colors ${
                    currentEvent?.stageId === stg
                      ? 'bg-zinc-700 text-white border-zinc-500 font-semibold'
                      : 'bg-[#0E1012] text-zinc-400 border-[#1C1D1F] hover:text-zinc-200'
                  }`}
                >
                  {stg.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Synchronized Workflow Timeline */}
          <WorkflowTimeline
            stages={reconstructedStages}
            runId={activeRecord.runId}
            isRunActive={false}
          />

          {/* 4. Synchronized Terminal Output Stream */}
          <TerminalLogs
            logs={reconstructedLogs}
            verification={activeRecord.verification}
            title={`Historical Output Stream (Scrubbed to Event ${currentEventIndex + 1})`}
            isExecuting={isPlaying}
          />

          {/* 5. Synchronized Code Diff Viewer */}
          <DiffViewer
            diffs={visibleDiffs}
            title={`Code Changes at Event ${currentEventIndex + 1}`}
            errorMessage={
              activeRecord.unrecordedFields?.some((f) => f.includes('diffs'))
                ? 'Code diff was not recorded in this historical JSON artifact.'
                : visibleDiffs.length === 0
                ? 'Patch diff is not produced until the Fixer stage is reached.'
                : undefined
            }
          />
        </>
      )}
    </div>
  );
};

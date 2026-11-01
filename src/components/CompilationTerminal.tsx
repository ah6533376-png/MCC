import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Terminal,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Copy,
  Check,
  StopCircle,
  Layers,
  Cpu,
  ChevronDown,
  ArrowDown,
  FileCode,
  FolderOpen,
} from 'lucide-react';
import type { BuildJob, CompilationStage, LogLine, BuildArtifact } from '../types/compiler';

interface CompilationTerminalProps {
  job: BuildJob;
  onCancelBuild: () => void;
  onDownloadLogs: () => void;
  onOpenInstallGuide?: () => void;
}

const STAGES: Array<{ id: CompilationStage; label: string }> = [
  { id: 'uploading', label: '1. Uploading' },
  { id: 'inspecting', label: '2. Inspecting' },
  { id: 'detecting', label: '3. Detecting' },
  { id: 'preparing', label: '4. Preparing' },
  { id: 'resolving', label: '5. Resolving' },
  { id: 'compiling', label: '6. Compiling' },
  { id: 'processing', label: '7. Processing' },
  { id: 'packaging', label: '8. Packaging' },
  { id: 'verification', label: '9. Verification' },
];

export const CompilationTerminal: React.FC<CompilationTerminalProps> = ({
  job,
  onCancelBuild,
  onDownloadLogs,
  onOpenInstallGuide,
}) => {
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [filterLevel, setFilterLevel] = useState<'all' | 'errors' | 'tasks'>('all');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Check if logs already show success
  const hasSuccessLog = useMemo(() => {
    return job.logs.some(
      (l) =>
        l.stage === 'completed' ||
        l.message.includes('Build completed successfully') ||
        l.message.includes('Successfully compiled')
    );
  }, [job.logs]);

  const effectiveStatus = job.status === 'success' || hasSuccessLog ? 'success' : job.status;

  // Resiliently resolve artifacts from job.artifacts or parse from verification logs
  const resolvedArtifacts = useMemo<BuildArtifact[]>(() => {
    if (job.artifacts && job.artifacts.length > 0) {
      return job.artifacts;
    }

    const parsed: BuildArtifact[] = [];
    for (const log of job.logs) {
      const match = log.message.match(/Verified artifact:\s+([^\s]+)\s+\(([^)]+)\)\s+·\s+SHA-256:\s+([a-f0-9]+)/i);
      if (match) {
        const filename = match[1];
        const isSources = filename.includes('-sources.jar');
        const isJavadoc = filename.includes('-javadoc.jar');
        const isMain = !isSources && !isJavadoc;

        if (!parsed.some((a) => a.filename === filename)) {
          parsed.push({
            filename,
            sizeBytes: 0,
            sizeFormatted: match[2],
            sha256: match[3],
            downloadUrl: `/api/builds/${job.id}/artifacts/${encodeURIComponent(filename)}`,
            isMain,
            type: isSources ? 'sources' : isJavadoc ? 'javadoc' : 'jar',
          });
        }
      }
    }

    parsed.sort((a, b) => (b.isMain ? 1 : 0) - (a.isMain ? 1 : 0));
    return parsed;
  }, [job.artifacts, job.logs, job.id]);

  // Live timer while running
  useEffect(() => {
    if (effectiveStatus === 'running' && job.startedAt) {
      const startTime = new Date(job.startedAt).getTime();
      const interval = setInterval(() => {
        setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
      }, 500);
      return () => clearInterval(interval);
    } else if (job.durationMs) {
      setElapsedSeconds(Math.round(job.durationMs / 1000));
    }
  }, [effectiveStatus, job.startedAt, job.durationMs]);

  // Auto scroll
  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [job.logs, autoScroll]);

  const copyAllLogs = () => {
    const text = job.logs.map((l) => `[${l.stage}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStageIndex = (stage: CompilationStage): number => {
    if (stage === 'completed' || effectiveStatus === 'success') return 9;
    const idx = STAGES.findIndex((s) => s.id === stage);
    return idx === -1 ? 0 : idx;
  };

  const currentStageIndex = getStageIndex(job.stage);

  // Filter logs
  const filteredLogs = job.logs.filter((log) => {
    if (filterLevel === 'errors') {
      return log.level === 'error' || log.level === 'stderr' || log.message.toLowerCase().includes('error');
    }
    if (filterLevel === 'tasks') {
      return log.level === 'stage' || log.message.includes('> Task :') || log.level === 'info';
    }
    return true;
  });

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 flex flex-col overflow-hidden shadow-2xl">
      {/* Top Bar with Status and Stage Pipeline */}
      <div className="p-4 sm:p-5 border-b border-neutral-800/80 bg-neutral-900/60 space-y-4">
        {/* Status Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">{job.projectName}</h3>
                <span className="text-xs font-mono text-neutral-400">
                  [{job.metadata.loader.toUpperCase()} · MC {job.metadata.minecraftVersion}]
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono mt-0.5">
                <span>
                  Status:{' '}
                  <strong
                    className={
                      effectiveStatus === 'success'
                        ? 'text-emerald-400'
                        : effectiveStatus === 'failed'
                        ? 'text-rose-400'
                        : effectiveStatus === 'cancelled'
                        ? 'text-neutral-400'
                        : 'text-cyan-400'
                    }
                  >
                    {effectiveStatus.toUpperCase()}
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-neutral-500" />
                  <span className="tabular-nums">{elapsedSeconds}s</span>
                </span>
                <span aria-hidden="true">·</span>
                <span>JDK {job.metadata.javaTarget}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Direct download button right in the header if compiled */}
            {resolvedArtifacts.length > 0 && (
              <a
                href={resolvedArtifacts[0].downloadUrl}
                download={resolvedArtifacts[0].filename}
                className="px-3.5 py-1.5 text-xs font-semibold text-neutral-950 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-all flex items-center gap-1.5 shadow-sm shadow-cyan-500/20 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download {resolvedArtifacts[0].filename}</span>
              </a>
            )}

            {effectiveStatus === 'running' && resolvedArtifacts.length === 0 && (
              <button
                onClick={onCancelBuild}
                className="px-3 py-1.5 text-xs font-medium text-rose-300 hover:text-white bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/60 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>Cancel Build</span>
              </button>
            )}

            <button
              onClick={copyAllLogs}
              className="px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Copy terminal logs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={onDownloadLogs}
              className="px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Download raw build log"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Log File</span>
            </button>
          </div>
        </div>

        {/* 9-Stage Progress Pipeline */}
        <div className="pt-2">
          <div className="grid grid-cols-3 sm:grid-cols-9 gap-1.5 text-[11px] font-mono">
            {STAGES.map((s, idx) => {
              const isPast = idx < currentStageIndex || effectiveStatus === 'success';
              const isCurrent = idx === currentStageIndex && effectiveStatus === 'running';
              const isFailedStage = idx === currentStageIndex && effectiveStatus === 'failed';

              let borderClass = 'border-neutral-800/80 bg-neutral-950 text-neutral-500';
              if (isFailedStage) {
                borderClass = 'border-rose-600 bg-rose-950/40 text-rose-300 font-semibold';
              } else if (isPast) {
                borderClass = 'border-cyan-800/60 bg-cyan-950/20 text-cyan-300';
              } else if (isCurrent) {
                borderClass = 'border-cyan-400 bg-cyan-950/60 text-cyan-200 font-bold';
              }

              return (
                <div
                  key={s.id}
                  className={`px-2 py-1.5 rounded border text-center transition-all truncate ${borderClass}`}
                  title={s.label}
                >
                  {s.label.split('. ')[1]}
                </div>
              );
            })}
          </div>
        </div>

        {/* Prominent Artifact Download Banner if verified artifacts exist */}
        {resolvedArtifacts.length > 0 && (
          <div className="pt-2 p-3.5 rounded-lg border border-cyan-800/80 bg-cyan-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">
                  Build Succeeded — Distributable JAR Artifacts Ready:
                </span>
                <span className="text-xs text-cyan-300 font-mono">
                  {resolvedArtifacts.map((a) => `${a.filename} (${a.sizeFormatted})`).join(' · ')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {resolvedArtifacts.map((art) => (
                <a
                  key={art.filename}
                  href={art.downloadUrl}
                  download={art.filename}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                    art.isMain
                      ? 'bg-cyan-400 text-neutral-950 hover:bg-cyan-300 shadow-sm'
                      : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download {art.isMain ? 'Mod JAR' : 'Sources'}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Terminal Filter Toolbar */}
      <div className="px-4 py-2 border-b border-neutral-800/80 bg-neutral-950 flex items-center justify-between text-xs font-mono text-neutral-400">
        <div className="flex items-center gap-2">
          <span>Filter:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilterLevel('all')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                filterLevel === 'all' ? 'bg-neutral-800 text-white font-medium' : 'hover:text-neutral-200'
              }`}
            >
              All ({job.logs.length})
            </button>
            <button
              onClick={() => setFilterLevel('tasks')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                filterLevel === 'tasks' ? 'bg-neutral-800 text-white font-medium' : 'hover:text-neutral-200'
              }`}
            >
              Tasks Only
            </button>
            <button
              onClick={() => setFilterLevel('errors')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                filterLevel === 'errors' ? 'bg-rose-950 text-rose-300 font-medium' : 'hover:text-neutral-200'
              }`}
            >
              Errors
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer ${
              autoScroll ? 'text-cyan-400 bg-cyan-950/40' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <ArrowDown className="w-3 h-3" />
            <span>Auto-scroll: {autoScroll ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Console Output Area */}
      <div className="p-4 bg-black font-mono text-xs overflow-y-auto h-96 space-y-1 selection:bg-cyan-900 selection:text-cyan-100">
        {filteredLogs.length === 0 ? (
          <div className="text-neutral-600 italic py-6 text-center">
            Waiting for compilation output...
          </div>
        ) : (
          filteredLogs.map((log) => {
            let textColor = 'text-neutral-300';
            if (log.level === 'stage') textColor = 'text-cyan-400 font-semibold';
            else if (log.level === 'success') textColor = 'text-emerald-400 font-semibold';
            else if (log.level === 'error' || log.level === 'stderr') textColor = 'text-rose-400';
            else if (log.level === 'warn') textColor = 'text-amber-400';
            else if (log.message.startsWith('> Task :')) textColor = 'text-sky-300 font-medium';

            const timeStr = log.timestamp ? log.timestamp.split('T')[1].slice(0, 8) : '';

            return (
              <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                <span className="text-neutral-600 select-none shrink-0 tabular-nums">{timeStr}</span>
                <span className="text-neutral-700 select-none shrink-0">[{log.stage}]</span>
                <span className={`break-all ${textColor}`}>{log.message}</span>
              </div>
            );
          })
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};

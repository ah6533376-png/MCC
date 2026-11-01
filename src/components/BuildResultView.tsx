import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Download,
  Copy,
  Check,
  AlertOctagon,
  FileCode,
  ShieldCheck,
  Info,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import type { BuildJob, BuildArtifact, BuildErrorDetail } from '../types/compiler';
import { InstallGuide } from './InstallGuide';

interface BuildResultViewProps {
  job: BuildJob;
  onDownloadLogs: () => void;
  onStartNewBuild: () => void;
}

export const BuildResultView: React.FC<BuildResultViewProps> = ({
  job,
  onDownloadLogs,
  onStartNewBuild,
}) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const isSuccess =
    job.status === 'success' ||
    job.stage === 'completed' ||
    job.logs.some(
      (l) =>
        l.stage === 'completed' ||
        l.message.includes('Build completed successfully') ||
        l.message.includes('Successfully compiled')
    );

  const resolvedArtifacts = React.useMemo<BuildArtifact[]>(() => {
    if (job.artifacts && job.artifacts.length > 0) return job.artifacts;
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

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* SUCCESS STATE */}
      {isSuccess && (
        <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/20 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-emerald-900/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-900/60 border border-emerald-700/80 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Compilation Succeeded</h3>
                <div className="flex items-center gap-3 text-xs text-neutral-300 font-mono mt-0.5">
                  <span>Mod: <strong className="text-white">{job.projectName}</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Minecraft <strong className="text-white">{job.metadata.minecraftVersion}</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Loader: <strong className="text-white uppercase">{job.metadata.loader}</strong></span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">Duration: {((job.durationMs || 0) / 1000).toFixed(1)}s</span>
                </div>
              </div>
            </div>

            <button
              onClick={onStartNewBuild}
              className="px-4 py-2 text-xs font-semibold text-neutral-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
            >
              Compile Another Project
            </button>
          </div>

          {/* Generated Artifacts */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 font-mono">
              Generated Distributable Artifacts ({resolvedArtifacts.length})
            </h4>

            <div className="grid grid-cols-1 gap-3">
              {resolvedArtifacts.map((art) => (
                <div
                  key={art.filename}
                  className={`p-4 rounded-xl border transition-all ${
                    art.isMain
                      ? 'border-cyan-700/80 bg-neutral-900/80'
                      : 'border-neutral-800 bg-neutral-950/60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm font-bold font-mono text-white">
                          {art.filename}
                        </span>
                        {art.isMain ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                            Primary Distributable Mod JAR
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                            {art.type}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono">
                        <span>Size: <strong className="text-neutral-200">{art.sizeFormatted}</strong></span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate max-w-xs sm:max-w-md">
                          SHA-256:{' '}
                          <code className="text-cyan-300 text-[11px] select-all">{art.sha256}</code>
                        </span>
                        <button
                          onClick={() => copyHash(art.sha256)}
                          className="hover:text-white transition-colors cursor-pointer"
                          title="Copy SHA-256 Checksum"
                        >
                          {copiedHash === art.sha256 ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400 inline" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 inline" />
                          )}
                        </button>
                      </div>
                    </div>

                    <a
                      href={art.downloadUrl}
                      download={art.filename}
                      className="px-4 py-2 text-xs font-semibold text-neutral-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download JAR</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Installation Guide */}
          <InstallGuide
            loader={job.metadata.loader}
            minecraftVersion={job.metadata.minecraftVersion}
            jarFilename={resolvedArtifacts.find((a) => a.isMain)?.filename || resolvedArtifacts[0]?.filename}
            defaultExpanded={true}
          />

          {/* Runtime Compatibility Notice (Section 7 requirement) */}
          <div className="p-3.5 rounded-lg bg-neutral-900/60 border border-neutral-800 text-xs text-neutral-400 flex items-start gap-3">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-neutral-300 block">Compilation Verification Notice</strong>
              MCC guarantees that the Java source code compiled cleanly against the target JDK and that the JAR archive was packaged per Minecraft mod specifications. Runtime in-game compatibility, mixin injection, and server/client parity require testing in your Minecraft launcher.
            </div>
          </div>
        </div>
      )}

      {/* FAILURE STATE */}
      {!isSuccess && job.status === 'failed' && (
        <div className="rounded-xl border border-rose-800/60 bg-rose-950/20 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-rose-900/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-900/60 border border-rose-700/80 flex items-center justify-center text-rose-400">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Compilation Failed</h3>
                <div className="flex items-center gap-3 text-xs text-neutral-300 font-mono mt-0.5">
                  <span>Mod: <strong className="text-white">{job.projectName}</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Target: MC {job.metadata.minecraftVersion}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">Duration: {((job.durationMs || 0) / 1000).toFixed(1)}s</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onDownloadLogs}
                className="px-3.5 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-800 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Complete Log</span>
              </button>

              <button
                onClick={onStartNewBuild}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-600 rounded-lg transition-colors cursor-pointer"
              >
                Retry or Reconfigure
              </button>
            </div>
          </div>

          {/* Diagnostic Error Analysis Card */}
          {job.error ? (
            <div className="rounded-xl border border-rose-800/80 bg-neutral-950/90 p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-rose-400 uppercase tracking-wide">
                <AlertOctagon className="w-4 h-4 text-rose-400" />
                <span>Compiler Diagnostic: {job.error.title}</span>
              </div>

              {job.error.file && (
                <div className="p-2.5 rounded bg-neutral-900 border border-neutral-800 text-xs font-mono flex items-center justify-between">
                  <span className="text-neutral-400">Location:</span>
                  <span className="text-cyan-300 font-semibold">
                    {job.error.file}
                    {job.error.line ? ` (Line ${job.error.line}${job.error.column ? `, Col ${job.error.column}` : ''})` : ''}
                  </span>
                </div>
              )}

              <div className="space-y-1">
                <span className="text-xs font-semibold text-neutral-300 block">Explanation</span>
                <p className="text-sm text-neutral-300 leading-relaxed">
                  {job.error.explanation}
                </p>
              </div>

              {job.error.suggestedFix && (
                <div className="p-3.5 rounded-lg bg-neutral-900/90 border border-neutral-800 space-y-1">
                  <span className="text-xs font-semibold text-emerald-400 block">
                    Recommended Solution
                  </span>
                  <p className="text-xs text-neutral-300 leading-relaxed font-mono">
                    {job.error.suggestedFix}
                  </p>
                </div>
              )}

              {/* Raw Error Extract */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-neutral-400 block font-mono">
                  Raw Compiler Message:
                </span>
                <pre className="p-3 rounded bg-black border border-neutral-800 text-xs font-mono text-rose-300 overflow-x-auto whitespace-pre-wrap">
                  {job.error.rawMessage}
                </pre>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-neutral-950 text-xs text-neutral-400 font-mono">
              The build process exited with an error. Review the full console output above for the trace.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

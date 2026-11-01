import React from 'react';
import { History, CheckCircle2, XCircle, Clock, Download, ExternalLink, Box } from 'lucide-react';
import type { BuildJob } from '../types/compiler';

interface BuildHistoryViewProps {
  builds: BuildJob[];
  onSelectBuild: (job: BuildJob) => void;
}

export const BuildHistoryView: React.FC<BuildHistoryViewProps> = ({
  builds,
  onSelectBuild,
}) => {
  if (builds.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-12 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400">
          <History className="w-6 h-6" />
        </div>
        <div className="max-w-sm mx-auto">
          <h3 className="text-base font-bold text-white">No Compilation Runs Yet</h3>
          <p className="text-xs text-neutral-400 mt-1">
            Upload a Minecraft mod ZIP archive or load a starter template to trigger your first isolated build.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 overflow-hidden space-y-0">
      <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">Build History ({builds.length})</h3>
        </div>
        <span className="text-xs text-neutral-500 font-mono">Retained in local worker cache</span>
      </div>

      <div className="divide-y divide-neutral-800/80">
        {builds.map((b) => {
          const isSuccess = b.status === 'success';
          const isFailed = b.status === 'failed';
          const isRunning = b.status === 'running';

          const mainArtifact = b.artifacts.find((a) => a.isMain) || b.artifacts[0];

          return (
            <div
              key={b.id}
              className="p-4 hover:bg-neutral-850/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div
                onClick={() => onSelectBuild(b)}
                className="cursor-pointer space-y-1 flex-1"
              >
                <div className="flex items-center gap-2">
                  {isSuccess ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : isFailed ? (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
                  )}
                  <span className="text-sm font-semibold text-white hover:text-cyan-300 transition-colors">
                    {b.projectName}
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 uppercase">
                    {b.metadata.loader}
                  </span>
                  <span className="text-xs font-mono text-neutral-400">
                    MC {b.metadata.minecraftVersion}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono">
                  <span>
                    Started: {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    Duration: {b.durationMs ? `${(b.durationMs / 1000).toFixed(1)}s` : 'Active'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Logs: {b.logs.length} lines</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {mainArtifact && (
                  <a
                    href={mainArtifact.downloadUrl}
                    download={mainArtifact.filename}
                    className="px-3 py-1.5 text-xs font-medium text-neutral-900 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
                    title={`Download ${mainArtifact.filename} (${mainArtifact.sizeFormatted})`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>JAR ({mainArtifact.sizeFormatted})</span>
                  </a>
                )}

                <button
                  onClick={() => onSelectBuild(b)}
                  className="px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-md transition-colors cursor-pointer"
                >
                  View Details & Logs
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Play,
  Layers,
  Code2,
  FolderTree,
  AlertTriangle,
  FileCode,
  CheckCircle2,
  Package,
  Cpu,
  RotateCcw,
} from 'lucide-react';
import type { ProjectMetadata } from '../types/compiler';

interface ProjectInspectorProps {
  metadata: ProjectMetadata;
  filename: string;
  onStartCompilation: () => void;
  onReset: () => void;
  isStarting: boolean;
}

export const ProjectInspector: React.FC<ProjectInspectorProps> = ({
  metadata,
  filename,
  onStartCompilation,
  onReset,
  isStarting,
}) => {
  const [showAllDeps, setShowAllDeps] = useState(false);

  const loaderBadgeColor =
    metadata.loader === 'fabric'
      ? 'text-sky-400 bg-sky-950/60 border-sky-800'
      : metadata.loader === 'neoforge'
      ? 'text-orange-400 bg-orange-950/60 border-orange-800'
      : metadata.loader === 'forge'
      ? 'text-amber-400 bg-amber-950/60 border-amber-800'
      : 'text-neutral-400 bg-neutral-900 border-neutral-800';

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-neutral-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-neutral-400 uppercase tracking-wide">
              Archive Inspected:
            </span>
            <span className="text-xs font-mono text-cyan-300 font-semibold">{filename}</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            {metadata.name || metadata.modId || 'Minecraft Mod Project'}
          </h2>
          <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1 font-mono">
            <span>ID: <strong className="text-neutral-200">{metadata.modId}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Version: <strong className="text-neutral-200">{metadata.version}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Files: <strong className="text-neutral-200 tabular-nums">{metadata.fileCount}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            disabled={isStarting}
            className="px-3.5 py-2 text-xs font-medium text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-700 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Choose Another</span>
          </button>

          <button
            onClick={onStartCompilation}
            disabled={isStarting}
            className="px-5 py-2 text-xs font-semibold text-neutral-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-sm hover:shadow-cyan-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isStarting ? 'Queuing Build...' : 'Execute Compilation'}</span>
          </button>
        </div>
      </div>

      {/* Warnings / Notices if any */}
      {metadata.warnings && metadata.warnings.length > 0 && (
        <div className="p-3.5 rounded-lg bg-amber-950/30 border border-amber-800/50 space-y-1">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Configuration Warnings</span>
          </div>
          <ul className="text-xs text-amber-200/80 list-disc list-inside space-y-0.5 pl-1">
            {metadata.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Grid of Key Detected Attributes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Mod Loader */}
        <div className="p-4 rounded-lg bg-neutral-950/60 border border-neutral-800/80">
          <div className="flex items-center gap-2 text-neutral-400 text-xs font-medium">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mod Loader</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border uppercase ${loaderBadgeColor}`}>
              {metadata.loader}
            </span>
            {metadata.loaderVersion && (
              <span className="text-xs text-neutral-400 font-mono">v{metadata.loaderVersion}</span>
            )}
          </div>
        </div>

        {/* Minecraft Version */}
        <div className="p-4 rounded-lg bg-neutral-950/60 border border-neutral-800/80">
          <div className="flex items-center gap-2 text-neutral-400 text-xs font-medium">
            <Package className="w-3.5 h-3.5 text-cyan-400" />
            <span>Minecraft Version</span>
          </div>
          <div className="mt-2 text-base font-mono font-bold text-white">
            {metadata.minecraftVersion}
          </div>
        </div>

        {/* Java Target */}
        <div className="p-4 rounded-lg bg-neutral-950/60 border border-neutral-800/80">
          <div className="flex items-center gap-2 text-neutral-400 text-xs font-medium">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Java Runtime Target</span>
          </div>
          <div className="mt-2 text-base font-mono font-bold text-white">
            Java {metadata.javaTarget} (JDK {metadata.javaTarget})
          </div>
        </div>

        {/* Build Tool */}
        <div className="p-4 rounded-lg bg-neutral-950/60 border border-neutral-800/80">
          <div className="flex items-center gap-2 text-neutral-400 text-xs font-medium">
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Build Toolchain</span>
          </div>
          <div className="mt-2 text-sm font-mono text-neutral-200">
            {metadata.hasWrapper ? 'Gradle Wrapper' : 'Gradle 8.8'}
            {metadata.gradleVersion && (
              <span className="text-xs text-neutral-400 block font-normal">v{metadata.gradleVersion}</span>
            )}
          </div>
        </div>
      </div>

      {/* Directory & Layout Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source and Resource Layout */}
        <div className="p-4 rounded-lg bg-neutral-950/60 border border-neutral-800/80 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
            <FolderTree className="w-4 h-4 text-cyan-400" />
            <span>Project Root & Source Sets</span>
          </div>

          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex items-center justify-between text-neutral-400 py-1 border-b border-neutral-900">
              <span>Root Discovery:</span>
              <span className="text-neutral-200">{metadata.rootDir ? `/${metadata.rootDir}` : '/ (root)'}</span>
            </div>
            <div className="flex items-center justify-between text-neutral-400 py-1 border-b border-neutral-900">
              <span>Source Directories:</span>
              <span className="text-neutral-200">
                {metadata.sourceDirs.length > 0 ? metadata.sourceDirs.join(', ') : 'None'}
              </span>
            </div>
            <div className="flex items-center justify-between text-neutral-400 py-1">
              <span>Resource Directories:</span>
              <span className="text-neutral-200">
                {metadata.resourceDirs.length > 0 ? metadata.resourceDirs.join(', ') : 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* Declared Dependencies */}
        <div className="p-4 rounded-lg bg-neutral-950/60 border border-neutral-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
              <FileCode className="w-4 h-4 text-cyan-400" />
              <span>Project Dependencies ({metadata.dependencies.length})</span>
            </div>
            {metadata.dependencies.length > 3 && (
              <button
                onClick={() => setShowAllDeps(!showAllDeps)}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {showAllDeps ? 'Show Less' : 'View All'}
              </button>
            )}
          </div>

          {metadata.dependencies.length === 0 ? (
            <p className="text-xs text-neutral-500 italic">No external mod dependencies declared.</p>
          ) : (
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {(showAllDeps ? metadata.dependencies : metadata.dependencies.slice(0, 3)).map((dep, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs font-mono py-1 px-2 rounded bg-neutral-900/80 border border-neutral-800/60"
                >
                  <span className="text-neutral-300 font-medium">{dep.name}</span>
                  <span className="text-neutral-500 text-[11px]">{dep.version || 'any'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

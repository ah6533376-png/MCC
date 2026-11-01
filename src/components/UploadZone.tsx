import React, { useState, useRef } from 'react';
import { Upload, FileArchive, Sparkles, AlertCircle, ArrowRight, Loader2, FolderSearch } from 'lucide-react';
import type { DemoProjectDef } from '../server/demoProjects';

interface UploadZoneProps {
  onProjectInspected: (uploadId: string, metadata: any, filename: string) => void;
  isUploading: boolean;
  setIsUploading: (val: boolean) => void;
  errorMessage: string | null;
  setErrorMessage: (msg: string | null) => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onProjectInspected,
  isUploading,
  setIsUploading,
  errorMessage,
  setErrorMessage,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [demoProjects, setDemoProjects] = useState<DemoProjectDef[]>([]);
  const [loadingDemoId, setLoadingDemoId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    fetch('/api/demo-projects')
      .then(res => res.json())
      .then(data => setDemoProjects(data))
      .catch(() => {});
  }, []);

  const handleFileSelect = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setErrorMessage('Please upload a valid .zip archive file.');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 100MB upload limit.');
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append('archive', file);

    try {
      const res = await fetch('/api/projects/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to inspect project archive.');
      }

      onProjectInspected(data.uploadId, data.metadata, data.filename);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while uploading.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const loadDemo = async (demoId: string) => {
    setErrorMessage(null);
    setLoadingDemoId(demoId);
    setIsUploading(true);

    try {
      const res = await fetch('/api/projects/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demoId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate demo project.');
      }

      onProjectInspected(data.uploadId, data.metadata, data.filename);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load demo project.');
    } finally {
      setLoadingDemoId(null);
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Drop Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
          isDragOver
            ? 'border-cyan-500 bg-cyan-950/20'
            : 'border-neutral-800 hover:border-neutral-700 bg-neutral-900/40 hover:bg-neutral-900/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFileSelect(e.target.files[0]);
            }
          }}
        />

        <div className="max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 mx-auto rounded-xl bg-neutral-800/80 border border-neutral-700 flex items-center justify-center text-cyan-400">
            {isUploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            ) : (
              <FileArchive className="w-6 h-6 text-cyan-400" />
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white">
              {isUploading ? 'Extracting & Inspecting Mod Project...' : 'Upload Minecraft Mod Project (.zip)'}
            </h3>
            <p className="text-sm text-neutral-400 mt-1">
              Drag and drop your project ZIP or click to browse. Supports Fabric, Forge, and NeoForge repositories.
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs text-neutral-500 font-mono">
            <span>ZIP Archives</span>
            <span aria-hidden="true">·</span>
            <span>Up to 100MB</span>
            <span aria-hidden="true">·</span>
            <span>Nested Roots Detected</span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-950/40 border border-red-800/60 flex items-start gap-3 text-red-300 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block text-red-200">Archive Inspection Error</span>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Pre-Bundled Test Projects */}
      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/30 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold text-neutral-200">
              Quick Test Projects (1-Click Load)
            </span>
          </div>
          <span className="text-xs text-neutral-500">Instant test without uploading your own zip</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {demoProjects.map((demo) => (
            <button
              key={demo.id}
              onClick={() => loadDemo(demo.id)}
              disabled={isUploading}
              className="text-left p-3.5 rounded-lg border border-neutral-800 hover:border-neutral-700 bg-neutral-900/70 hover:bg-neutral-850 transition-all group disabled:opacity-50 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-cyan-400 uppercase">
                  {demo.loader} · {demo.minecraftVersion}
                </span>
                {loadingDemoId === demo.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-cyan-400 transition-colors" />
                )}
              </div>
              <h4 className="text-sm font-medium text-white mt-1 group-hover:text-cyan-200 transition-colors">
                {demo.name}
              </h4>
              <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
                {demo.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

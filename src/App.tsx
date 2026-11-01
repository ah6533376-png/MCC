import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { UploadZone } from './components/UploadZone';
import { ProjectInspector } from './components/ProjectInspector';
import { CompilationTerminal } from './components/CompilationTerminal';
import { BuildResultView } from './components/BuildResultView';
import { BuildHistoryView } from './components/BuildHistoryView';
import { SupportedLoadersView } from './components/SupportedLoadersView';
import { ArchitectureView } from './components/ArchitectureView';
import { SystemStatusModal } from './components/SystemStatusModal';
import { InstallGuide } from './components/InstallGuide';
import type { BuildJob, ProjectMetadata, SystemEnvironmentStatus } from './types/compiler';
import { Sparkles, Terminal, Shield, ArrowRight, Box } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'workspace' | 'history' | 'install-guide' | 'loaders' | 'architecture'>('workspace');
  const [activeJob, setActiveJob] = useState<BuildJob | null>(null);
  const [inspectedProject, setInspectedProject] = useState<{
    uploadId: string;
    metadata: ProjectMetadata;
    filename: string;
  } | null>(null);
  const [builds, setBuilds] = useState<BuildJob[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemEnvironmentStatus | null>(null);
  const [isSystemModalOpen, setIsSystemModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch initial system status and build history
  useEffect(() => {
    fetchSystemStatus();
    fetchBuilds();
  }, []);

  const fetchSystemStatus = () => {
    fetch('/api/system/status')
      .then((res) => res.json())
      .then((data) => setSystemStatus(data))
      .catch(() => {});
  };

  const fetchBuilds = () => {
    fetch('/api/builds')
      .then((res) => res.json())
      .then((data) => setBuilds(data))
      .catch(() => {});
  };

  // Connect to SSE stream when activeJob is running
  useEffect(() => {
    if (!activeJob || activeJob.status !== 'running') return;

    const eventSource = new EventSource(`/api/builds/${activeJob.id}/stream`);

    eventSource.addEventListener('init', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setActiveJob(data);
      } catch {}
    });

    eventSource.addEventListener('log', (e: MessageEvent) => {
      try {
        const logLine = JSON.parse(e.data);
        setActiveJob((prev) => {
          if (!prev) return null;
          const updatedLogs = [...prev.logs, logLine];
          let updatedStatus = prev.status;
          let updatedStage = prev.stage;

          if (
            logLine.stage === 'completed' ||
            logLine.message.includes('Build completed successfully') ||
            logLine.message.includes('Successfully compiled')
          ) {
            updatedStatus = 'success';
            updatedStage = 'completed';
            // Trigger background fetch to update artifacts array
            fetch(`/api/builds/${prev.id}`)
              .then((r) => r.json())
              .then((full) => {
                if (full) setActiveJob(full);
                fetchBuilds();
                fetchSystemStatus();
              })
              .catch(() => {});
          }

          return {
            ...prev,
            status: updatedStatus,
            stage: updatedStage,
            logs: updatedLogs,
          };
        });
      } catch {}
    });

    eventSource.addEventListener('stage', (e: MessageEvent) => {
      try {
        const { stage } = JSON.parse(e.data);
        setActiveJob((prev) => (prev ? { ...prev, stage } : null));
      } catch {}
    });

    eventSource.addEventListener('finished', (e: MessageEvent) => {
      try {
        const { job } = JSON.parse(e.data);
        setActiveJob(job);
        fetchBuilds();
        fetchSystemStatus();
      } catch {}
      eventSource.close();
    });

    eventSource.addEventListener('cancelled', (e: MessageEvent) => {
      try {
        const { job } = JSON.parse(e.data);
        setActiveJob(job);
        fetchBuilds();
      } catch {}
      eventSource.close();
    });

    eventSource.onerror = () => {
      // EventSource network hiccup: fetch latest status directly
      fetch(`/api/builds/${activeJob.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data && data.status !== 'running') {
            setActiveJob(data);
            fetchBuilds();
            fetchSystemStatus();
            eventSource.close();
          }
        })
        .catch(() => {});
    };

    // Heartbeat fallback polling every 2.5s while running
    const pollInterval = setInterval(() => {
      fetch(`/api/builds/${activeJob.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data && (data.status !== 'running' || data.artifacts?.length > 0)) {
            setActiveJob(data);
            fetchBuilds();
            fetchSystemStatus();
          }
        })
        .catch(() => {});
    }, 2500);

    return () => {
      clearInterval(pollInterval);
      eventSource.close();
    };
  }, [activeJob?.id, activeJob?.status]);

  // Handlers
  const handleProjectInspected = (uploadId: string, metadata: ProjectMetadata, filename: string) => {
    setInspectedProject({ uploadId, metadata, filename });
    setActiveJob(null);
  };

  const handleStartCompilation = async () => {
    if (!inspectedProject) return;

    setIsStarting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/builds/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId: inspectedProject.uploadId,
          projectName: inspectedProject.metadata.name || inspectedProject.metadata.modId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start compilation.');
      }

      // Fetch the newly created job
      const jobRes = await fetch(`/api/builds/${data.jobId}`);
      const jobData = await jobRes.json();
      setActiveJob(jobData);
      setInspectedProject(null);
      fetchBuilds();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to queue compilation job.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleCancelBuild = async () => {
    if (!activeJob) return;
    try {
      await fetch(`/api/builds/${activeJob.id}/cancel`, { method: 'POST' });
    } catch {}
  };

  const handleDownloadLogs = () => {
    if (!activeJob) return;
    window.location.href = `/api/builds/${activeJob.id}/logs`;
  };

  const handleSelectBuildFromHistory = (job: BuildJob) => {
    setActiveJob(job);
    setInspectedProject(null);
    setCurrentTab('workspace');
  };

  const handleResetWorkspace = () => {
    setActiveJob(null);
    setInspectedProject(null);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        systemStatus={systemStatus}
        onOpenSystemStatus={() => setIsSystemModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* TAB 1: WORKSPACE */}
        {currentTab === 'workspace' && (
          <div className="space-y-8">
            {/* If no active compilation and no inspected project, show Hero & Upload */}
            {!activeJob && !inspectedProject && (
              <div className="space-y-8">
                {/* Clean Hero Section */}
                <div className="max-w-3xl space-y-3">
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight text-balance">
                    Online Minecraft Mod Compilation Engine
                  </h1>
                  <p className="text-base text-neutral-400 leading-relaxed">
                    Upload your Fabric, Forge, or NeoForge mod repository as a ZIP archive. MCC automatically inspects dependencies, detects the Minecraft version, provisions isolated JDK toolchains, and compiles distributable JAR files in the cloud.
                  </p>
                  <div className="flex items-center gap-4 text-xs font-mono text-neutral-500 pt-2">
                    <span>No Java or IDE Required</span>
                    <span aria-hidden="true">·</span>
                    <span>Fabric, Forge & NeoForge</span>
                    <span aria-hidden="true">·</span>
                    <span>Real OpenJDK 17 & 21 Toolchains</span>
                  </div>
                </div>

                {/* Upload & Starter Projects */}
                <UploadZone
                  onProjectInspected={handleProjectInspected}
                  isUploading={isUploading}
                  setIsUploading={setIsUploading}
                  errorMessage={errorMessage}
                  setErrorMessage={setErrorMessage}
                />
              </div>
            )}

            {/* If project has been uploaded/inspected, show Inspector */}
            {!activeJob && inspectedProject && (
              <ProjectInspector
                metadata={inspectedProject.metadata}
                filename={inspectedProject.filename}
                onStartCompilation={handleStartCompilation}
                onReset={handleResetWorkspace}
                isStarting={isStarting}
              />
            )}

            {/* If compilation is in progress or completed, show Terminal and Results */}
            {activeJob && (
              <div className="space-y-6">
                {/* Result Summary (if finished or artifacts verified) */}
                {(activeJob.status === 'success' ||
                  activeJob.status === 'failed' ||
                  activeJob.stage === 'completed' ||
                  activeJob.artifacts.length > 0 ||
                  activeJob.logs.some(
                    (l) =>
                      l.stage === 'completed' ||
                      l.message.includes('Build completed successfully') ||
                      l.message.includes('Verified artifact:')
                  )) && (
                  <BuildResultView
                    job={activeJob}
                    onDownloadLogs={handleDownloadLogs}
                    onStartNewBuild={handleResetWorkspace}
                  />
                )}

                {/* Terminal Logs */}
                <CompilationTerminal
                  job={activeJob}
                  onCancelBuild={handleCancelBuild}
                  onDownloadLogs={handleDownloadLogs}
                  onOpenInstallGuide={() => setCurrentTab('install-guide')}
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BUILD HISTORY */}
        {currentTab === 'history' && (
          <BuildHistoryView
            builds={builds}
            onSelectBuild={handleSelectBuildFromHistory}
          />
        )}

        {/* TAB 3: INSTALL GUIDE */}
        {currentTab === 'install-guide' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Minecraft Mod Installation Guide</h2>
              <p className="text-sm text-neutral-400 mt-1">
                Learn how to install your compiled JAR artifact into your Minecraft launcher on Windows, macOS, or Linux.
              </p>
            </div>
            <InstallGuide
              loader={activeJob?.metadata.loader || 'fabric'}
              minecraftVersion={activeJob?.metadata.minecraftVersion || '1.20.4'}
              jarFilename={activeJob?.artifacts.find((a) => a.isMain)?.filename || 'mymod.jar'}
              defaultExpanded={true}
            />
          </div>
        )}

        {/* TAB 4: SUPPORTED LOADERS */}
        {currentTab === 'loaders' && <SupportedLoadersView />}

        {/* TAB 4: ARCHITECTURE & SECURITY */}
        {currentTab === 'architecture' && <ArchitectureView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-6 text-xs text-neutral-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold tracking-tight">MCC</span>
            <span>· Isolated Minecraft Mod Compiler</span>
          </div>
          <div>
            <span>Toolchain: OpenJDK 17/21 · Gradle 8.8 · Linux x86_64</span>
          </div>
        </div>
      </footer>

      {/* System Status Modal */}
      <SystemStatusModal
        isOpen={isSystemModalOpen}
        onClose={() => setIsSystemModalOpen(false)}
        status={systemStatus}
      />
    </div>
  );
}

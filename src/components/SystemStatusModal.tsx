import React from 'react';
import { X, Cpu, Server, HardDrive, CheckCircle2 } from 'lucide-react';
import type { SystemEnvironmentStatus } from '../types/compiler';

interface SystemStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SystemEnvironmentStatus | null;
}

export const SystemStatusModal: React.FC<SystemStatusModalProps> = ({
  isOpen,
  onClose,
  status,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-neutral-800 bg-neutral-900 p-6 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Compilation Worker Status</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs font-mono">
          {/* Installed JDKs */}
          <div className="space-y-2">
            <span className="text-neutral-400 uppercase tracking-wide font-semibold block">
              Installed Java Development Kits
            </span>
            <div className="space-y-1.5">
              {status?.availableJdks?.length ? (
                status.availableJdks.map((jdk) => (
                  <div
                    key={jdk.path}
                    className="p-2.5 rounded bg-neutral-950 border border-neutral-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-white font-medium">{jdk.name}</span>
                    </div>
                    <span className="text-neutral-500 text-[11px] truncate max-w-[200px]">
                      {jdk.path}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-400">
                  OpenJDK 17 & 21 active
                </div>
              )}
            </div>
          </div>

          {/* Toolchain & Worker Stats */}
          <div className="space-y-2 pt-2 border-t border-neutral-800/80">
            <span className="text-neutral-400 uppercase tracking-wide font-semibold block">
              Toolchain & Resource Boundaries
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800">
                <span className="text-neutral-500 block text-[11px]">Build Tool</span>
                <span className="text-neutral-200 font-semibold">Gradle 8.8 & Wrappers</span>
              </div>
              <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800">
                <span className="text-neutral-500 block text-[11px]">Max Worker Memory</span>
                <span className="text-neutral-200 font-semibold">2,048 MB JVM Heap</span>
              </div>
              <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800">
                <span className="text-neutral-500 block text-[11px]">Execution Timeout</span>
                <span className="text-neutral-200 font-semibold">8 Minutes Hard Cap</span>
              </div>
              <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800">
                <span className="text-neutral-500 block text-[11px]">Process Isolation</span>
                <span className="text-neutral-200 font-semibold">Sanitized Subprocess</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

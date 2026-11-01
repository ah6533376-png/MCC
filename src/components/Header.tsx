import React from 'react';
import { Terminal, Shield, Cpu, History, Box } from 'lucide-react';
import type { SystemEnvironmentStatus } from '../types/compiler';

interface HeaderProps {
  currentTab: 'workspace' | 'history' | 'install-guide' | 'loaders' | 'architecture';
  onSelectTab: (tab: 'workspace' | 'history' | 'install-guide' | 'loaders' | 'architecture') => void;
  systemStatus: SystemEnvironmentStatus | null;
  onOpenSystemStatus: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  systemStatus,
  onOpenSystemStatus,
}) => {
  return (
    <header className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800/80 flex items-center justify-center text-cyan-400">
            <Box className="w-4 h-4 text-cyan-400" />
          </div>
          <button
            onClick={() => onSelectTab('workspace')}
            className="text-left group cursor-pointer"
          >
            <span className="text-base font-bold tracking-tight text-white group-hover:text-cyan-400 transition-colors whitespace-nowrap">
              MCC
            </span>
            <span className="text-xs text-neutral-400 ml-2 font-medium tracking-normal whitespace-nowrap">
              Minecraft Compiler
            </span>
          </button>
        </div>

        {/* Zone 2: Single-line Text Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <button
            onClick={() => onSelectTab('workspace')}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentTab === 'workspace'
                ? 'text-cyan-400 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Workspace
          </button>
          <button
            onClick={() => onSelectTab('history')}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentTab === 'history'
                ? 'text-cyan-400 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Build History
          </button>
          <button
            onClick={() => onSelectTab('install-guide')}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentTab === 'install-guide'
                ? 'text-cyan-400 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Install Guide
          </button>
          <button
            onClick={() => onSelectTab('loaders')}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentTab === 'loaders'
                ? 'text-cyan-400 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Supported Loaders
          </button>
          <button
            onClick={() => onSelectTab('architecture')}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentTab === 'architecture'
                ? 'text-cyan-400 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Worker Isolation
          </button>
        </nav>

        {/* Zone 3: Primary Action / Environment Status */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenSystemStatus}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-medium rounded-md border border-neutral-800 bg-neutral-900/90 text-neutral-300 hover:border-neutral-700 hover:text-white transition-colors cursor-pointer"
            title="View Worker Toolchain Status"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="tabular-nums">
              {systemStatus?.availableJdks?.length ? `${systemStatus.availableJdks.length} JDKs Online` : 'Worker Ready'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

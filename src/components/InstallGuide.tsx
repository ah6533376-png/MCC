import React, { useState } from 'react';
import {
  FolderOpen,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ExternalLink,
  Laptop,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import type { ModLoader } from '../types/compiler';

interface InstallGuideProps {
  loader?: ModLoader;
  minecraftVersion?: string;
  jarFilename?: string;
  defaultExpanded?: boolean;
}

export const InstallGuide: React.FC<InstallGuideProps> = ({
  loader = 'fabric',
  minecraftVersion = '1.20.4',
  jarFilename,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copiedOs, setCopiedOs] = useState<string | null>(null);
  const [selectedLauncher, setSelectedLauncher] = useState<'vanilla' | 'prism' | 'curseforge' | 'modrinth'>('vanilla');

  const copyPath = (pathText: string, osKey: string) => {
    navigator.clipboard.writeText(pathText);
    setCopiedOs(osKey);
    setTimeout(() => setCopiedOs(null), 2000);
  };

  const isFabric = loader === 'fabric';
  const isNeoForge = loader === 'neoforge';
  const isForge = loader === 'forge';

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 overflow-hidden transition-all">
      {/* Header Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-neutral-850/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/80 flex items-center justify-center text-cyan-400 shrink-0">
            <FolderOpen className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>How to Install Your Mod JAR into Minecraft</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 uppercase">
                {loader} · MC {minecraftVersion}
              </span>
            </h4>
            <p className="text-xs text-neutral-400 mt-0.5">
              Step-by-step instructions for Windows, macOS, Linux, and custom launchers.
            </p>
          </div>
        </div>

        <div className="text-neutral-400 pl-2">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 sm:p-6 pt-0 border-t border-neutral-800/80 space-y-6">
          {/* Launcher Tabs */}
          <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
            <span className="text-xs font-mono text-neutral-400 font-semibold mr-1">Launcher:</span>
            <button
              onClick={() => setSelectedLauncher('vanilla')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                selectedLauncher === 'vanilla'
                  ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-700/60'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Default Minecraft Launcher
            </button>
            <button
              onClick={() => setSelectedLauncher('prism')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                selectedLauncher === 'prism'
                  ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-700/60'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Prism Launcher
            </button>
            <button
              onClick={() => setSelectedLauncher('curseforge')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                selectedLauncher === 'curseforge'
                  ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-700/60'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              CurseForge / Modrinth App
            </button>
          </div>

          {/* Step 1: Mod Loader Requirement */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <span className="w-5 h-5 rounded-full bg-neutral-800 text-cyan-400 flex items-center justify-center text-[11px] font-mono">
                1
              </span>
              <span>Verify that your Minecraft instance has the required Mod Loader</span>
            </div>

            <div className="ml-7 p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 space-y-2">
              {isFabric && (
                <div>
                  <p>
                    This is a <strong>Fabric mod</strong>. To run it, you must have:
                  </p>
                  <ul className="list-disc list-inside mt-1.5 space-y-1 text-neutral-400">
                    <li>
                      <strong className="text-white">Fabric Loader</strong> installed for Minecraft {minecraftVersion} (available at{' '}
                      <a
                        href="https://fabricmc.net/use/installer/"
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:underline"
                      >
                        fabricmc.net
                      </a>
                      ).
                    </li>
                    <li>
                      <strong className="text-white">Fabric API</strong> mod placed in your <code className="text-cyan-300">mods</code> folder (required by almost all Fabric mods).
                    </li>
                  </ul>
                </div>
              )}

              {isNeoForge && (
                <div>
                  <p>
                    This is a <strong>NeoForge mod</strong>. To run it, you must have:
                  </p>
                  <ul className="list-disc list-inside mt-1.5 space-y-1 text-neutral-400">
                    <li>
                      <strong className="text-white">NeoForge</strong> installed for Minecraft {minecraftVersion} (available at{' '}
                      <a
                        href="https://neoforged.net/"
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:underline"
                      >
                        neoforged.net
                      </a>
                      ).
                    </li>
                  </ul>
                </div>
              )}

              {isForge && (
                <div>
                  <p>
                    This is a <strong>Minecraft Forge mod</strong>. To run it, you must have:
                  </p>
                  <ul className="list-disc list-inside mt-1.5 space-y-1 text-neutral-400">
                    <li>
                      <strong className="text-white">Forge</strong> installed for Minecraft {minecraftVersion} (available at{' '}
                      <a
                        href="https://files.minecraftforge.net/"
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:underline"
                      >
                        files.minecraftforge.net
                      </a>
                      ).
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Open the mods folder */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <span className="w-5 h-5 rounded-full bg-neutral-800 text-cyan-400 flex items-center justify-center text-[11px] font-mono">
                2
              </span>
              <span>Locate your Minecraft <code className="text-cyan-300 font-mono">mods</code> folder</span>
            </div>

            {selectedLauncher === 'vanilla' && (
              <div className="ml-7 space-y-2">
                <p className="text-xs text-neutral-400">
                  Open your file explorer and paste the path corresponding to your operating system:
                </p>

                <div className="space-y-2 text-xs font-mono">
                  {/* Windows */}
                  <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-neutral-500 font-semibold w-16 shrink-0">Windows:</span>
                      <code className="text-neutral-200 truncate select-all">%appdata%\.minecraft\mods</code>
                    </div>
                    <button
                      onClick={() => copyPath('%appdata%\\.minecraft\\mods', 'win')}
                      className="text-neutral-400 hover:text-white flex items-center gap-1 shrink-0 px-2 py-1 rounded bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors cursor-pointer"
                      title="Copy Windows Path"
                    >
                      {copiedOs === 'win' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedOs === 'win' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  {/* macOS */}
                  <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-neutral-500 font-semibold w-16 shrink-0">macOS:</span>
                      <code className="text-neutral-200 truncate select-all">~/Library/Application Support/minecraft/mods</code>
                    </div>
                    <button
                      onClick={() => copyPath('~/Library/Application Support/minecraft/mods', 'mac')}
                      className="text-neutral-400 hover:text-white flex items-center gap-1 shrink-0 px-2 py-1 rounded bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors cursor-pointer"
                      title="Copy macOS Path"
                    >
                      {copiedOs === 'mac' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedOs === 'mac' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  {/* Linux */}
                  <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-neutral-500 font-semibold w-16 shrink-0">Linux:</span>
                      <code className="text-neutral-200 truncate select-all">~/.minecraft/mods</code>
                    </div>
                    <button
                      onClick={() => copyPath('~/.minecraft/mods', 'linux')}
                      className="text-neutral-400 hover:text-white flex items-center gap-1 shrink-0 px-2 py-1 rounded bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors cursor-pointer"
                      title="Copy Linux Path"
                    >
                      {copiedOs === 'linux' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedOs === 'linux' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-neutral-900/60 border border-neutral-800/80 text-[11px] text-neutral-400">
                  <span className="text-neutral-300 font-semibold">Tip for Windows:</span> Press <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-white font-mono">Win + R</kbd>, paste <code className="text-cyan-300 font-mono">%appdata%\.minecraft\mods</code>, and hit Enter. If the <code className="text-neutral-300 font-mono">mods</code> folder does not exist yet, simply create a new folder named <code className="text-neutral-300 font-mono">mods</code>!
                </div>
              </div>
            )}

            {selectedLauncher === 'prism' && (
              <div className="ml-7 p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 space-y-1.5">
                <ol className="list-decimal list-inside space-y-1.5 text-neutral-400">
                  <li>In <strong className="text-white">Prism Launcher</strong>, right-click your Minecraft {minecraftVersion} instance.</li>
                  <li>Click <strong className="text-white">Edit Instance</strong> or <strong className="text-white">Open .minecraft</strong>.</li>
                  <li>Click the <strong className="text-white">Mods</strong> tab in the left sidebar.</li>
                  <li>Click <strong className="text-white">Add Mod</strong> (or drag the downloaded JAR straight into the window).</li>
                </ol>
              </div>
            )}

            {selectedLauncher === 'curseforge' && (
              <div className="ml-7 p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 space-y-1.5">
                <ol className="list-decimal list-inside space-y-1.5 text-neutral-400">
                  <li>In <strong className="text-white">CurseForge or Modrinth App</strong>, click into your profile.</li>
                  <li>Click the three dots (<strong className="text-white">...</strong>) menu next to the Play button.</li>
                  <li>Select <strong className="text-white">Open Folder</strong>.</li>
                  <li>Open the <code className="text-cyan-300 font-mono">mods</code> subfolder.</li>
                </ol>
              </div>
            )}
          </div>

          {/* Step 3: Copy JAR */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <span className="w-5 h-5 rounded-full bg-neutral-800 text-cyan-400 flex items-center justify-center text-[11px] font-mono">
                3
              </span>
              <span>Copy the primary mod JAR file into the <code className="text-cyan-300 font-mono">mods</code> folder</span>
            </div>

            <div className="ml-7 p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 space-y-2">
              <p>
                Move or copy your compiled{' '}
                <strong className="text-cyan-300 font-mono">{jarFilename || 'mod.jar'}</strong> directly into the{' '}
                <code className="text-cyan-300 font-mono">mods</code> folder.
              </p>
              <div className="flex items-center gap-2 text-amber-300/90 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  <strong>Important:</strong> Do not unzip the .jar file! Minecraft reads .jar files directly. Also, do not use the <code className="font-mono text-amber-200">-sources.jar</code> file (sources are for developers viewing code, not for the game).
                </span>
              </div>
            </div>
          </div>

          {/* Step 4: Launch */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <span className="w-5 h-5 rounded-full bg-neutral-800 text-cyan-400 flex items-center justify-center text-[11px] font-mono">
                4
              </span>
              <span>Launch Minecraft and enjoy</span>
            </div>

            <div className="ml-7 p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-300">
              <p>
                Open your launcher, select the{' '}
                <strong className="text-white">{loader.toUpperCase()}</strong> installation profile for{' '}
                <strong className="text-white">1.{minecraftVersion}</strong>, and click <strong className="text-emerald-400">Play</strong>! Your mod will automatically be loaded by the mod loader.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { Layers, Box, Cpu, FileCode2, CheckCircle2 } from 'lucide-react';

export const SupportedLoadersView: React.FC = () => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Supported Mod Loaders & Runtimes</h2>
        <p className="text-sm text-neutral-400 mt-1">
          MCC automatically detects project structures, manifests, and build toolchains without requiring manual configuration.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Fabric */}
        <div className="p-5 rounded-xl border border-sky-800/60 bg-sky-950/20 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-sky-400 uppercase tracking-wide px-2 py-0.5 rounded bg-sky-950 border border-sky-800">
              Fabric
            </span>
            <span className="text-xs text-neutral-400">1.14 → 1.21+</span>
          </div>
          <h3 className="text-base font-bold text-white">Fabric Mod Loader</h3>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Automatic detection via <code className="text-sky-300">fabric.mod.json</code> or Fabric Loom plugin in <code className="text-sky-300">build.gradle</code>. Resolves mappings and intermediary remap tasks.
          </p>
          <ul className="text-xs text-neutral-400 space-y-1 list-disc list-inside">
            <li>Yarn mappings & Mojang mappings</li>
            <li>Fabric API dependency detection</li>
            <li>Entrypoints: main, client, server</li>
          </ul>
        </div>

        {/* NeoForge */}
        <div className="p-5 rounded-xl border border-orange-800/60 bg-orange-950/20 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-orange-400 uppercase tracking-wide px-2 py-0.5 rounded bg-orange-950 border border-orange-800">
              NeoForge
            </span>
            <span className="text-xs text-neutral-400">1.20.2 → 1.21+</span>
          </div>
          <h3 className="text-base font-bold text-white">NeoForge Mod Loader</h3>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Automatic detection via <code className="text-orange-300">neoforge.mods.toml</code> and NeoGradle / ModDev Gradle plugins. Configures modern Java 17 and Java 21 toolchains.
          </p>
          <ul className="text-xs text-neutral-400 space-y-1 list-disc list-inside">
            <li>NeoForged maven resolution</li>
            <li>Java 21 runtime for MC 1.20.5+</li>
            <li>Single or multi-project layouts</li>
          </ul>
        </div>

        {/* Forge */}
        <div className="p-5 rounded-xl border border-amber-800/60 bg-amber-950/20 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wide px-2 py-0.5 rounded bg-amber-950 border border-amber-800">
              Forge
            </span>
            <span className="text-xs text-neutral-400">1.16 → 1.20.4</span>
          </div>
          <h3 className="text-base font-bold text-white">Minecraft Forge</h3>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Automatic detection via <code className="text-amber-300">mods.toml</code> and ForgeGradle. Handles standard Java source sets and resources.
          </p>
          <ul className="text-xs text-neutral-400 space-y-1 list-disc list-inside">
            <li>ForgeGradle task pipeline</li>
            <li>Java 8 / 16 / 17 selection</li>
            <li>Standard archives packaging</li>
          </ul>
        </div>
      </div>

      {/* Java & Minecraft Version Matrix */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span>Minecraft & Java Target Version Matrix</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400">
                <th className="py-2.5 px-4 font-semibold">Minecraft Version</th>
                <th className="py-2.5 px-4 font-semibold">Target JDK</th>
                <th className="py-2.5 px-4 font-semibold">MCC Provisioned Runtime</th>
                <th className="py-2.5 px-4 font-semibold">Default Bytecode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
              <tr>
                <td className="py-2.5 px-4 font-semibold text-white">1.20.5 – 1.21.x+</td>
                <td className="py-2.5 px-4 text-cyan-400">Java 21</td>
                <td className="py-2.5 px-4">OpenJDK 21 (LTS)</td>
                <td className="py-2.5 px-4">Classfile 65.0</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-white">1.18 – 1.20.4</td>
                <td className="py-2.5 px-4 text-cyan-400">Java 17</td>
                <td className="py-2.5 px-4">OpenJDK 17 (LTS)</td>
                <td className="py-2.5 px-4">Classfile 61.0</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-white">1.17 – 1.17.1</td>
                <td className="py-2.5 px-4 text-neutral-400">Java 16 / 17</td>
                <td className="py-2.5 px-4">OpenJDK 17 (LTS)</td>
                <td className="py-2.5 px-4">Classfile 60.0</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-white">1.16.5 & below</td>
                <td className="py-2.5 px-4 text-neutral-400">Java 8</td>
                <td className="py-2.5 px-4">Cross-compiled via JDK 17 (-release 8)</td>
                <td className="py-2.5 px-4">Classfile 52.0</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Shield, Lock, Cpu, Server, Terminal, CheckCircle2, HardDrive } from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Compilation Architecture & Worker Sandboxing</h2>
        <p className="text-sm text-neutral-400 mt-1">
          MCC strictly enforces real, isolated toolchain compilation with sandboxing, process boundaries, and secret sanitization.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Real Toolchains */}
        <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/60 space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
            <Cpu className="w-4 h-4" />
            <span>Real Compiler Enforcement</span>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed">
            MCC executes real compiler tasks (<code className="text-cyan-300">javac</code>, <code className="text-cyan-300">gradle build</code>) against official Minecraft development plugins.
          </p>
          <ul className="text-xs text-neutral-400 space-y-1.5 list-disc list-inside">
            <li>Never simulates compilation or invents fake output</li>
            <li>Produces real Java bytecode packaged in valid ZIP/JAR structures</li>
            <li>Fails honestly with compiler diagnostics when code has syntax errors</li>
          </ul>
        </div>

        {/* Worker Sandboxing */}
        <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/60 space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
            <Lock className="w-4 h-4" />
            <span>Process & Environment Sandboxing</span>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Every build is allocated an isolated directory and executed under restricted child process environments.
          </p>
          <ul className="text-xs text-neutral-400 space-y-1.5 list-disc list-inside">
            <li><strong>Environment Sanitization:</strong> Server API keys, secrets, and auth tokens are stripped from child processes</li>
            <li><strong>Zip Slip Protection:</strong> Path traversal checking prevents writing outside extraction roots</li>
            <li><strong>Execution Limits:</strong> Hard 8-minute compilation timeout and 2GB JVM heap ceiling</li>
          </ul>
        </div>

        {/* Streaming Protocol */}
        <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/60 space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
            <Terminal className="w-4 h-4" />
            <span>Live Server-Sent Events (SSE)</span>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Build updates and compiler stdout/stderr lines are broadcast live over persistent HTTP event streams.
          </p>
          <ul className="text-xs text-neutral-400 space-y-1.5 list-disc list-inside">
            <li>Zero polling latency for terminal log streams</li>
            <li>Task-by-task state transitions (:compileJava, :processResources, :jar)</li>
            <li>Immediate disconnect cleanup on worker thread</li>
          </ul>
        </div>

        {/* Artifact Integrity */}
        <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/60 space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
            <HardDrive className="w-4 h-4" />
            <span>Artifact Verification & Checksums</span>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Upon successful task completion, generated JARs in <code className="text-cyan-300">build/libs/</code> are indexed, sized, and hashed.
          </p>
          <ul className="text-xs text-neutral-400 space-y-1.5 list-disc list-inside">
            <li>SHA-256 cryptographic checksum calculation</li>
            <li>Separation of main distributable JAR from sources/javadocs</li>
            <li>Direct binary download with correct MIME headers</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

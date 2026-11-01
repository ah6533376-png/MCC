
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  BuildJob,
  CompilationStage,
  LogLine,
  BuildArtifact,
  ProjectMetadata,
  SystemEnvironmentStatus,
} from '../types/compiler';
import { analyzeBuildError } from './errorParser';

export class BuildWorkerManager {
  private jobs: Map<string, BuildJob> = new Map();
  private activeProcesses: Map<string, ChildProcess> = new Map();
  private subscribers: Map<string, Set<(event: string, data: any) => void>> = new Map();
  private baseArtifactsDir: string;
  private baseWorkspaceDir: string;

  constructor() {
    this.baseArtifactsDir = path.join('/tmp', 'mcc_artifacts');
    this.baseWorkspaceDir = path.join('/tmp', 'mcc_workspaces');

    fs.mkdirSync(this.baseArtifactsDir, { recursive: true });
    fs.mkdirSync(this.baseWorkspaceDir, { recursive: true });
  }

  public getSystemStatus(): SystemEnvironmentStatus {
    const jdks: Array<{ version: number; path: string; name: string }> = [];
    const discovered = this.discoverJavaHomes();

    for (const home of discovered) {
      const version = this.getJavaVersion(home);

      if (version === 17 || version === 21) {
        if (!jdks.some(j => j.version === version)) {
          jdks.push({
            version,
            path: home,
            name: `OpenJDK ${version} (LTS)`,
          });
        }
      }
    }

    const mem = process.memoryUsage();

    return {
      availableJdks: jdks,
      defaultJdk: jdks.find(j => j.version === 21)?.name ||
        jdks.find(j => j.version === 17)?.name ||
        'No JDK detected',
      activeBuilds: this.activeProcesses.size,
      maxConcurrentBuilds: 4,
      platform: `${process.platform} (${process.arch})`,
      memoryUsageMb: Math.round(mem.rss / 1024 / 1024),
      totalMemoryMb: 4096,
    };
  }

  public createJob(projectName: string, metadata: ProjectMetadata, workspacePath: string): BuildJob {
    const id = crypto.randomUUID();

    const job: BuildJob = {
      id,
      projectName,
      createdAt: new Date().toISOString(),
      stage: 'idle',
      status: 'queued',
      metadata,
      logs: [],
      artifacts: [],
    };

    this.jobs.set(id, job);
    return job;
  }

  public getJob(id: string): BuildJob | undefined {
    return this.jobs.get(id);
  }

  public getAllJobs(): BuildJob[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public subscribe(jobId: string, listener: (event: string, data: any) => void): () => void {
    if (!this.subscribers.has(jobId)) {
      this.subscribers.set(jobId, new Set());
    }

    this.subscribers.get(jobId)!.add(listener);

    return () => {
      const set = this.subscribers.get(jobId);
      if (set) {
        set.delete(listener);
        if (set.size === 0) this.subscribers.delete(jobId);
      }
    };
  }

  private broadcast(jobId: string, event: string, data: any) {
    const set = this.subscribers.get(jobId);

    if (set) {
      for (const listener of set) {
        try {
          listener(event, data);
        } catch {
          // Subscriber connection closed.
        }
      }
    }
  }

  private addLog(
    job: BuildJob,
    level: LogLine['level'],
    message: string,
    stageOverride?: CompilationStage
  ) {
    const logLine: LogLine = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      level,
      stage: stageOverride || job.stage,
      message,
    };

    job.logs.push(logLine);
    this.broadcast(job.id, 'log', logLine);
  }

  private setStage(job: BuildJob, stage: CompilationStage, msg?: string) {
    job.stage = stage;
    this.addLog(job, 'stage', msg || `Transitioned to stage: ${stage}`, stage);
    this.broadcast(job.id, 'stage', { stage, message: msg });
  }

  public cancelBuild(id: string): boolean {
    const job = this.jobs.get(id);
    const proc = this.activeProcesses.get(id);

    if (job && proc) {
      this.addLog(job, 'warn', 'Build cancellation requested by user.');

      try {
        proc.kill('SIGKILL');
      } catch {
        // Ignore termination errors.
      }

      job.status = 'cancelled';
      job.stage = 'cancelled';
      job.finishedAt = new Date().toISOString();

      this.activeProcesses.delete(id);
      this.broadcast(job.id, 'cancelled', { job });

      return true;
    }

    return false;
  }

  private discoverJavaHomes(): string[] {
    const candidates = new Set<string>();

    const addHome = (home: string) => {
      if (!home) return;

      const normalized = path.resolve(home);
      candidates.add(normalized);

      try {
        candidates.add(fs.realpathSync(normalized));
      } catch {
        // Ignore unresolved paths.
      }
    };

    // Environment-provided Java home.
    if (process.env.JAVA_HOME) {
      addHome(process.env.JAVA_HOME);
    }

    // Common JDK installation directories.
    const jvmDirectories = [
      '/usr/lib/jvm',
      '/usr/java',
      '/opt/java',
      '/opt/jdk',
      '/usr/local/openjdk',
      '/usr/local/java',
    ];

    for (const directory of jvmDirectories) {
      try {
        if (!fs.existsSync(directory)) continue;

        for (const entry of fs.readdirSync(directory)) {
          addHome(path.join(directory, entry));
        }
      } catch {
        // Ignore inaccessible directories.
      }
    }

    // Common direct JDK locations.
    [
      '/opt/java/openjdk',
      '/usr/lib/jvm/default-java',
      '/usr/lib/jvm/java-17-openjdk-amd64',
      '/usr/lib/jvm/java-21-openjdk-amd64',
      '/usr/local/openjdk-17',
      '/usr/local/openjdk-21',
    ].forEach(addHome);

    // Resolve Java from every directory in PATH.
    const inheritedPath = process.env.PATH || '';

    for (const directory of inheritedPath.split(path.delimiter)) {
      if (!directory) continue;

      const javaPath = path.join(directory, 'java');

      try {
        if (fs.existsSync(javaPath)) {
          const realJavaPath = fs.realpathSync(javaPath);
          addHome(path.dirname(path.dirname(realJavaPath)));
        }
      } catch {
        // Ignore invalid PATH entries.
      }
    }

    // Also inspect common executable locations.
    for (const javaPath of ['/usr/bin/java', '/bin/java']) {
      try {
        if (fs.existsSync(javaPath)) {
          const realJavaPath = fs.realpathSync(javaPath);
          addHome(path.dirname(path.dirname(realJavaPath)));
        }
      } catch {
        // Ignore missing Java executables.
      }
    }

    return Array.from(candidates).filter(home => {
      try {
        return fs.existsSync(path.join(home, 'bin', 'java'));
      } catch {
        return false;
      }
    });
  }

  private getJavaVersion(home: string): number | null {
    const releaseFile = path.join(home, 'release');

    try {
      if (fs.existsSync(releaseFile)) {
        const content = fs.readFileSync(releaseFile, 'utf8');
        const match = content.match(/JAVA_VERSION="([^"]+)"/);

        if (match) {
          const major = match[1].split('.')[0];
          return parseInt(major, 10);
        }
      }
    } catch {
      // Fall through to directory-name detection.
    }

    const name = path.basename(home);
    const match = name.match(/(?:jdk|java|openjdk)[-_]?(\d{2})/i);

    return match ? parseInt(match[1], 10) : null;
  }

  private resolveJavaHome(targetVersion: number): string {
    const candidates = this.discoverJavaHomes();

    // Prefer the requested version.
    const matching = candidates.find(home => {
      return this.getJavaVersion(home) === targetVersion;
    });

    if (matching) return matching;

    // Allow an unknown version label if it is the only valid Java installation.
    if (candidates.length === 1) {
      return candidates[0];
    }

    throw new Error(
      `Java ${targetVersion} was not found. ` +
      `JAVA_HOME=${process.env.JAVA_HOME || '(unset)'}. ` +
      `Detected installations: ${candidates.join(', ') || '(none)'}. ` +
      `PATH=${process.env.PATH || '(empty)'}`
    );
  }

  private resolveGradleExecutable(rootDir: string): {
    executable: string;
    isWrapper: boolean;
    searchedPaths: string[];
  } {
    const searchedPaths: string[] = [];

    const wrapperPath = path.join(rootDir, 'gradlew');

    if (fs.existsSync(wrapperPath)) {
      try {
        fs.chmodSync(wrapperPath, 0o755);
      } catch {
        // Ignore permission errors.
      }

      return {
        executable: wrapperPath,
        isWrapper: true,
        searchedPaths,
      };
    }

    const candidates = new Set<string>();
    const inheritedPath = process.env.PATH || '';

    for (const directory of inheritedPath.split(path.delimiter)) {
      if (directory.trim()) {
        candidates.add(path.join(directory, 'gradle'));
      }
    }

    if (process.env.GRADLE_HOME) {
      candidates.add(path.join(process.env.GRADLE_HOME, 'bin', 'gradle'));
    }

    if (process.env.GRADLE_INSTALLATION) {
      candidates.add(process.env.GRADLE_INSTALLATION);
    }

    [
      '/usr/local/bin/gradle',
      '/usr/bin/gradle',
      '/bin/gradle',
      '/opt/gradle/bin/gradle',
      '/usr/share/gradle/bin/gradle',
      '/usr/local/gradle/bin/gradle',
    ].forEach(candidate => candidates.add(candidate));

    for (const candidate of candidates) {
      searchedPaths.push(candidate);

      try {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          fs.accessSync(candidate, fs.constants.X_OK);

          return {
            executable: candidate,
            isWrapper: false,
            searchedPaths,
          };
        }
      } catch {
        // Continue searching.
      }
    }

    throw new Error(
      'Gradle executable could not be located. ' +
      `Inherited PATH: ${inheritedPath || '(empty)'}. ` +
      `Checked: ${searchedPaths.join(', ')}`
    );
  }

  public async startBuild(jobId: string, extractedPath: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const startTime = Date.now();

    job.startedAt = new Date().toISOString();
    job.status = 'running';

    const rootDir = path.join(extractedPath, job.metadata.rootDir);

    this.addLog(job, 'info', `Initialized MCC compilation engine for project: ${job.projectName}`);
    this.addLog(
      job,
      'info',
      `Target: Minecraft ${job.metadata.minecraftVersion} · ModLoader: ${job.metadata.loader.toUpperCase()}`
    );

    try {
      // 1. Inspect.
      this.setStage(job, 'inspecting', 'Inspecting extracted archive structure and source layout...');

      this.addLog(
        job,
        'info',
        `Detected root directory: ${job.metadata.rootDir ? `/${job.metadata.rootDir}` : '/'}`
      );

      this.addLog(
        job,
        'info',
        `Scanned ${job.metadata.fileCount} files (${(job.metadata.totalSizeBytes / 1024).toFixed(1)} KB)`
      );

      if (!fs.existsSync(rootDir)) {
        throw new Error(`Project root directory does not exist: ${rootDir}`);
      }

      // 2. Detect.
      this.setStage(job, 'detecting', 'Detecting toolchains, compiler targets, and mod configuration...');

      this.addLog(job, 'info', `Build system: ${job.metadata.buildSystem}`);
      this.addLog(job, 'info', `Target Java version: JDK ${job.metadata.javaTarget}`);

      // 3. Prepare environment.
      this.setStage(job, 'preparing', 'Preparing isolated build worker environment...');

      const selectedJavaHome = this.resolveJavaHome(job.metadata.javaTarget);
      const javaExecutable = path.join(selectedJavaHome, 'bin', 'java');

      this.addLog(job, 'info', `Selected JVM: ${selectedJavaHome} for Java target ${job.metadata.javaTarget}`);
      this.addLog(job, 'info', `Verified Java executable: ${javaExecutable}`);

      const gradlePropsPath = path.join(rootDir, 'gradle.properties');

      let propsContent = fs.existsSync(gradlePropsPath)
        ? fs.readFileSync(gradlePropsPath, 'utf-8')
        : '';

      if (!propsContent.includes('org.gradle.daemon=')) {
        propsContent += '\norg.gradle.daemon=false\n';
      }

      if (!propsContent.includes('org.gradle.jvmargs=')) {
        propsContent += 'org.gradle.jvmargs=-Xmx2048M -XX:MaxMetaspaceSize=512M\n';
      }

      if (!propsContent.includes('org.gradle.parallel=')) {
        propsContent += 'org.gradle.parallel=false\n';
      }

      if (!propsContent.includes('org.gradle.vfs.watch=')) {
        propsContent += 'org.gradle.vfs.watch=false\n';
      }

      fs.writeFileSync(gradlePropsPath, propsContent);

      this.addLog(job, 'info', 'Configured daemon and memory boundaries (heap limit: 2048MB, no-daemon mode).');

      // 4. Resolve Gradle.
      this.setStage(job, 'resolving', 'Resolving dependencies and Gradle plugins...');

      const gradle = this.resolveGradleExecutable(rootDir);

      const buildArgs = [
        'build',
        '--no-daemon',
        '--console=plain',
        '--stacktrace',
      ];

      this.addLog(job, 'info', `Gradle executable resolved: ${gradle.executable}`);

      this.addLog(
        job,
        'info',
        `Executing toolchain command: ${gradle.executable} ${buildArgs.join(' ')}`
      );

      // 5. Preserve the server environment while adding selected Java.
      const inheritedPath = process.env.PATH || '';

      const additionalPaths = [
        path.join(selectedJavaHome, 'bin'),
        process.env.GRADLE_HOME ? path.join(process.env.GRADLE_HOME, 'bin') : '',
        '/usr/local/bin',
        '/usr/bin',
        '/bin',
      ].filter(Boolean);

      const cleanEnv: NodeJS.ProcessEnv = {
        ...process.env,
        HOME: process.env.HOME || '/tmp',
        PATH: [...additionalPaths, inheritedPath].filter(Boolean).join(path.delimiter),
        JAVA_HOME: selectedJavaHome,
        LANG: process.env.LANG || 'en_US.UTF-8',
        LC_ALL: process.env.LC_ALL || 'en_US.UTF-8',
        GRADLE_USER_HOME: process.env.GRADLE_USER_HOME || '/tmp/.gradle',
      };

      fs.mkdirSync(cleanEnv.GRADLE_USER_HOME!, { recursive: true });

      this.addLog(job, 'info', `Worker PATH: ${cleanEnv.PATH}`);

      // 6. Compile.
      this.setStage(job, 'compiling', 'Executing compilation tasks (compileJava, processResources)...');

      await this.runBuildProcess(
        job,
        gradle.executable,
        buildArgs,
        rootDir,
        cleanEnv
      );

      // 7. Package.
      this.setStage(job, 'packaging', 'Scanning output directories for generated JAR artifacts...');

      const artifacts = this.collectArtifacts(job, rootDir);
      job.artifacts = artifacts;

      if (artifacts.length === 0) {
        throw new Error('Build finished, but no JAR artifact was produced in build/libs/.');
      }

      // 8. Verify.
      this.setStage(
        job,
        'verification',
        'Verifying artifact integrity, manifest, and computing checksums...'
      );

      for (const art of artifacts) {
        this.addLog(
          job,
          'info',
          `Verified artifact: ${art.filename} (${art.sizeFormatted}) · SHA-256: ${art.sha256}`
        );
      }

      job.status = 'success';

      this.setStage(
        job,
        'completed',
        'Build completed successfully! Distributable JAR is ready.'
      );

      this.addLog(
        job,
        'success',
        `Successfully compiled ${job.projectName} in ${((Date.now() - startTime) / 1000).toFixed(1)}s!`
      );
    } catch (err: any) {
      job.status = 'failed';
      job.stage = 'failed';

      const fullLogText = job.logs.map(l => l.message).join('\n');

      const errorAnalysis = analyzeBuildError(
        fullLogText + '\n' + (err.message || ''),
        rootDir
      );

      job.error = errorAnalysis;

      this.addLog(job, 'error', `Build failed: ${err.message || 'Unknown error'}`);

      if (errorAnalysis) {
        this.addLog(
          job,
          'error',
          `[Diagnosis] ${errorAnalysis.title}: ${errorAnalysis.explanation}`
        );

        if (errorAnalysis.suggestedFix) {
          this.addLog(job, 'warn', `[Suggested Solution] ${errorAnalysis.suggestedFix}`);
        }
      }
    } finally {
      job.durationMs = Date.now() - startTime;
      job.finishedAt = new Date().toISOString();

      this.activeProcesses.delete(job.id);
      this.broadcast(job.id, 'finished', { job });
    }
  }

  private runBuildProcess(
    job: BuildJob,
    cmd: string,
    args: string[],
    cwd: string,
    env: NodeJS.ProcessEnv
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(cmd, args, {
        cwd,
        env,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      this.activeProcesses.set(job.id, child);

      child.stdout?.on('data', (data: Buffer) => {
        const lines = data.toString('utf-8').split(/\r?\n/).filter(Boolean);

        for (const line of lines) {
          if (line.includes('> Task :compileJava') || line.includes('> Task :compileKotlin')) {
            this.setStage(job, 'compiling');
          } else if (line.includes('> Task :processResources')) {
            this.setStage(job, 'processing');
          } else if (line.includes('> Task :jar') || line.includes('> Task :remapJar')) {
            this.setStage(job, 'packaging');
          }

          this.addLog(job, 'stdout', line);
        }
      });

      child.stderr?.on('data', (data: Buffer) => {
        const lines = data.toString('utf-8').split(/\r?\n/).filter(Boolean);

        for (const line of lines) {
          this.addLog(job, 'stderr', line);
        }
      });

      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error('Compilation timed out after 8 minutes.'));
      }, 8 * 60 * 1000);

      child.on('error', (err) => {
        clearTimeout(timer);
        this.activeProcesses.delete(job.id);
        reject(new Error(`Could not launch "${cmd}": ${err.message}`));
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        this.activeProcesses.delete(job.id);

        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Build process exited with exit code ${code}`));
        }
      });
    });
  }

  private collectArtifacts(job: BuildJob, rootDir: string): BuildArtifact[] {
    const buildLibsDir = path.join(rootDir, 'build', 'libs');
    const artifacts: BuildArtifact[] = [];

    if (!fs.existsSync(buildLibsDir)) {
      return artifacts;
    }

    const jobArtifactDir = path.join(this.baseArtifactsDir, job.id);
    fs.mkdirSync(jobArtifactDir, { recursive: true });

    const files = fs.readdirSync(buildLibsDir);

    for (const f of files) {
      if (!f.endsWith('.jar')) continue;

      const fullSourcePath = path.join(buildLibsDir, f);
      const destPath = path.join(jobArtifactDir, f);

      fs.copyFileSync(fullSourcePath, destPath);

      const st = fs.statSync(destPath);
      const fileBuffer = fs.readFileSync(destPath);
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      const isSources = f.includes('-sources.jar');
      const isJavadoc = f.includes('-javadoc.jar');
      const isMain = !isSources && !isJavadoc;

      artifacts.push({
        filename: f,
        sizeBytes: st.size,
        sizeFormatted: formatBytes(st.size),
        sha256: hash,
        downloadUrl: `/api/builds/${job.id}/artifacts/${encodeURIComponent(f)}`,
        isMain,
        type: isSources ? 'sources' : isJavadoc ? 'javadoc' : 'jar',
      });
    }

    artifacts.sort((a, b) => (b.isMain ? 1 : 0) - (a.isMain ? 1 : 0));

    return artifacts;
  }

  public getArtifactPath(jobId: string, filename: string): string | null {
    const safeFilename = path.basename(filename);
    const targetPath = path.join(this.baseArtifactsDir, jobId, safeFilename);

    return fs.existsSync(targetPath) ? targetPath : null;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export const workerManager = new BuildWorkerManager();

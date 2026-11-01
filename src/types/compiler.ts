export type ModLoader = 'fabric' | 'forge' | 'neoforge' | 'quilt' | 'unknown';
export type BuildSystem = 'gradle' | 'gradle-wrapper' | 'maven' | 'unknown';
export type JavaVersion = 8 | 11 | 16 | 17 | 21 | number;

export interface ProjectDependency {
  name: string;
  version?: string;
  required: boolean;
  scope?: string;
}

export interface ProjectMetadata {
  modId: string;
  name: string;
  version: string;
  minecraftVersion: string;
  loader: ModLoader;
  loaderVersion?: string;
  buildSystem: BuildSystem;
  gradleVersion?: string;
  javaTarget: JavaVersion;
  dependencies: ProjectDependency[];
  rootDir: string;
  hasWrapper: boolean;
  sourceDirs: string[];
  resourceDirs: string[];
  entrypoints?: Record<string, string[]>;
  warnings: string[];
  fileCount: number;
  totalSizeBytes: number;
}

export type CompilationStage =
  | 'idle'
  | 'uploading'
  | 'inspecting'
  | 'detecting'
  | 'preparing'
  | 'resolving'
  | 'compiling'
  | 'processing'
  | 'packaging'
  | 'verification'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface LogLine {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'stage' | 'success' | 'stdout' | 'stderr';
  stage: CompilationStage;
  message: string;
}

export interface BuildArtifact {
  filename: string;
  sizeBytes: number;
  sizeFormatted: string;
  sha256: string;
  downloadUrl: string;
  isMain: boolean;
  type: 'jar' | 'sources' | 'javadoc';
}

export interface BuildErrorDetail {
  type: 'java_compilation' | 'dependency_resolution' | 'java_incompatibility' | 'gradle_config' | 'loom_mapping' | 'timeout' | 'unknown';
  title: string;
  file?: string;
  line?: number;
  column?: number;
  rawMessage: string;
  explanation: string;
  suggestedFix: string;
}

export interface BuildJob {
  id: string;
  projectName: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  stage: CompilationStage;
  status: 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
  metadata: ProjectMetadata;
  logs: LogLine[];
  artifacts: BuildArtifact[];
  error?: BuildErrorDetail;
}

export interface SystemEnvironmentStatus {
  availableJdks: Array<{ version: number; path: string; name: string }>;
  defaultJdk: string;
  activeBuilds: number;
  maxConcurrentBuilds: number;
  platform: string;
  memoryUsageMb: number;
  totalMemoryMb: number;
}

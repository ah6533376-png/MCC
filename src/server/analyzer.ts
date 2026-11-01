import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import type { ProjectMetadata, ModLoader, BuildSystem, JavaVersion, ProjectDependency } from '../types/compiler';

export interface ScanResult {
  metadata: ProjectMetadata;
  extractedPath: string;
  relativeRoot: string;
}

export function extractAndAnalyzeArchive(zipFilePath: string, destDir: string): ScanResult {
  const zip = new AdmZip(zipFilePath);
  const zipEntries = zip.getEntries();

  // Security: Check for path traversal attacks (Zip Slip)
  for (const entry of zipEntries) {
    const entryName = entry.entryName;
    const resolvedPath = path.resolve(destDir, entryName);
    if (!resolvedPath.startsWith(path.resolve(destDir))) {
      throw new Error(`Malicious zip entry detected (path traversal): ${entryName}`);
    }
  }

  // Extract all files
  zip.extractAllTo(destDir, true);

  return analyzeProjectDirectory(destDir);
}

export function analyzeProjectDirectory(baseDir: string): ScanResult {
  // Find project root
  const rootRelative = findProjectRoot(baseDir);
  const rootDir = path.join(baseDir, rootRelative);

  const warnings: string[] = [];
  let fileCount = 0;
  let totalSizeBytes = 0;

  function walk(currentDir: string) {
    if (!fs.existsSync(currentDir)) return;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.name === '.git' || ent.name === '.gradle' || ent.name === 'build' || ent.name === 'node_modules') continue;
      const fullPath = path.join(currentDir, ent.name);
      if (ent.isDirectory()) {
        walk(fullPath);
      } else if (ent.isFile()) {
        fileCount++;
        try {
          const st = fs.statSync(fullPath);
          totalSizeBytes += st.size;
        } catch {
          // ignore stat errors
        }
      }
    }
  }
  walk(rootDir);

  // Check build files
  const hasBuildGradle = fs.existsSync(path.join(rootDir, 'build.gradle'));
  const hasBuildGradleKts = fs.existsSync(path.join(rootDir, 'build.gradle.kts'));
  const hasPomXml = fs.existsSync(path.join(rootDir, 'pom.xml'));
  const hasGradlew = fs.existsSync(path.join(rootDir, 'gradlew'));
  const hasGradleWrapperDir = fs.existsSync(path.join(rootDir, 'gradle', 'wrapper', 'gradle-wrapper.properties'));

  let buildSystem: BuildSystem = 'unknown';
  if (hasGradlew || hasGradleWrapperDir) {
    buildSystem = 'gradle-wrapper';
  } else if (hasBuildGradle || hasBuildGradleKts) {
    buildSystem = 'gradle';
  } else if (hasPomXml) {
    buildSystem = 'maven';
  }

  if (buildSystem === 'unknown') {
    warnings.push('No recognized build file found (build.gradle, build.gradle.kts, or pom.xml).');
  }

  // Read build.gradle content
  let buildGradleContent = '';
  if (hasBuildGradle) {
    try {
      buildGradleContent = fs.readFileSync(path.join(rootDir, 'build.gradle'), 'utf-8');
    } catch (e) {
      warnings.push(`Could not read build.gradle: ${(e as Error).message}`);
    }
  } else if (hasBuildGradleKts) {
    try {
      buildGradleContent = fs.readFileSync(path.join(rootDir, 'build.gradle.kts'), 'utf-8');
    } catch (e) {
      warnings.push(`Could not read build.gradle.kts: ${(e as Error).message}`);
    }
  }

  // Read gradle.properties
  let gradleProperties: Record<string, string> = {};
  const gradlePropertiesPath = path.join(rootDir, 'gradle.properties');
  if (fs.existsSync(gradlePropertiesPath)) {
    try {
      const rawProps = fs.readFileSync(gradlePropertiesPath, 'utf-8');
      gradleProperties = parseProperties(rawProps);
    } catch {
      warnings.push('Failed to parse gradle.properties');
    }
  }

  // Read gradle-wrapper.properties
  let gradleVersion: string | undefined;
  const wrapperPropsPath = path.join(rootDir, 'gradle', 'wrapper', 'gradle-wrapper.properties');
  if (fs.existsSync(wrapperPropsPath)) {
    try {
      const wrapperProps = parseProperties(fs.readFileSync(wrapperPropsPath, 'utf-8'));
      const distUrl = wrapperProps['distributionUrl'] || '';
      const match = distUrl.match(/gradle-([0-9.]+)-(bin|all)\.zip/);
      if (match) {
        gradleVersion = match[1];
      }
    } catch {
      // ignore
    }
  }

  // Detect mod loader and metadata
  let loader: ModLoader = 'unknown';
  let modId = 'unnamed_mod';
  let name = 'Unnamed Mod';
  let version = '1.0.0';
  let minecraftVersion = 'Unknown';
  let loaderVersion: string | undefined;
  const dependencies: ProjectDependency[] = [];
  const entrypoints: Record<string, string[]> = {};

  // Check Fabric (fabric.mod.json)
  const fabricModJsonPaths = [
    path.join(rootDir, 'src', 'main', 'resources', 'fabric.mod.json'),
    path.join(rootDir, 'resources', 'fabric.mod.json'),
    path.join(rootDir, 'fabric.mod.json'),
  ];
  let fabricJsonFound = false;
  for (const fpath of fabricModJsonPaths) {
    if (fs.existsSync(fpath)) {
      fabricJsonFound = true;
      loader = 'fabric';
      try {
        const raw = fs.readFileSync(fpath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.id) modId = parsed.id;
        if (parsed.name) name = parsed.name;
        if (parsed.version) version = parsed.version;

        if (parsed.entrypoints) {
          for (const [epKey, epVal] of Object.entries(parsed.entrypoints)) {
            if (Array.isArray(epVal)) {
              entrypoints[epKey] = epVal.map((v: any) => (typeof v === 'string' ? v : v?.value || String(v)));
            } else if (typeof epVal === 'string') {
              entrypoints[epKey] = [epVal];
            }
          }
        }

        if (parsed.depends && typeof parsed.depends === 'object') {
          for (const [depId, depVer] of Object.entries(parsed.depends)) {
            dependencies.push({
              name: depId,
              version: String(depVer),
              required: true,
            });
            if (depId === 'minecraft') {
              minecraftVersion = String(depVer).replace(/[~^>=<]/g, '').trim();
            } else if (depId === 'fabricloader') {
              loaderVersion = String(depVer);
            }
          }
        }
      } catch (e) {
        warnings.push(`Failed to parse fabric.mod.json: ${(e as Error).message}`);
      }
      break;
    }
  }

  // Check NeoForge / Forge mods.toml
  const neoForgeTomlPaths = [
    path.join(rootDir, 'src', 'main', 'resources', 'META-INF', 'neoforge.mods.toml'),
    path.join(rootDir, 'META-INF', 'neoforge.mods.toml'),
  ];
  const forgeTomlPaths = [
    path.join(rootDir, 'src', 'main', 'resources', 'META-INF', 'mods.toml'),
    path.join(rootDir, 'META-INF', 'mods.toml'),
  ];

  let neoForgeFound = false;
  for (const npath of neoForgeTomlPaths) {
    if (fs.existsSync(npath)) {
      neoForgeFound = true;
      loader = 'neoforge';
      parseModsToml(npath, (id, n, ver) => {
        if (id) modId = id;
        if (n) name = n;
        if (ver) version = ver;
      }, dependencies);
      break;
    }
  }

  if (!neoForgeFound && !fabricJsonFound) {
    for (const fpath of forgeTomlPaths) {
      if (fs.existsSync(fpath)) {
        loader = 'forge';
        parseModsToml(fpath, (id, n, ver) => {
          if (id) modId = id;
          if (n) name = n;
          if (ver) version = ver;
        }, dependencies);
        break;
      }
    }
  }

  // If loader still unknown, inspect build.gradle
  if (loader === 'unknown') {
    if (buildGradleContent.includes('fabric-loom') || buildGradleContent.includes('net.fabricmc')) {
      loader = 'fabric';
    } else if (buildGradleContent.includes('net.neoforged.gradle') || buildGradleContent.includes('net.neoforged.moddev')) {
      loader = 'neoforge';
    } else if (buildGradleContent.includes('net.minecraftforge.gradle') || buildGradleContent.includes('minecraftforge')) {
      loader = 'forge';
    } else if (buildGradleContent.includes('org.quiltmc')) {
      loader = 'quilt';
    }
  }

  // Extract versions from gradle.properties if not already known
  if (gradleProperties['mod_version']) version = gradleProperties['mod_version'];
  if (gradleProperties['archives_base_name']) modId = gradleProperties['archives_base_name'];
  if (gradleProperties['mod_name']) name = gradleProperties['mod_name'];
  if (gradleProperties['minecraft_version']) minecraftVersion = gradleProperties['minecraft_version'];
  if (gradleProperties['loader_version'] && !loaderVersion) loaderVersion = gradleProperties['loader_version'];

  // Check build.gradle for minecraft version fallback
  if (minecraftVersion === 'Unknown' && buildGradleContent) {
    const mcMatch = buildGradleContent.match(/minecraft\s+["']com\.mojang:minecraft:([0-9a-zA-Z._-]+)["']/i) ||
                    buildGradleContent.match(/minecraftVersion\s*=\s*["']([0-9a-zA-Z._-]+)["']/i) ||
                    buildGradleContent.match(/version\s*=\s*["']([0-9]+\.[0-9]+(?:\.[0-9]+)?)["']/i);
    if (mcMatch) {
      minecraftVersion = mcMatch[1];
    }
  }

  // Detect Java version requirement
  let javaTarget: JavaVersion = 17; // standard modern default
  if (buildGradleContent) {
    const javaMatch = buildGradleContent.match(/(?:sourceCompatibility|targetCompatibility)\s*=\s*(?:JavaVersion\.VERSION_|['"]?)(\d+)/i) ||
                      buildGradleContent.match(/languageVersion\s*=\s*JavaLanguageVersion\.of\((\d+)\)/i) ||
                      buildGradleContent.match(/targetCompatibility\s*=\s*(\d+)/i);
    if (javaMatch) {
      javaTarget = parseInt(javaMatch[1], 10);
    }
  }

  // Fallback Java target based on Minecraft version
  if (!javaTarget || javaTarget === 17) {
    if (minecraftVersion !== 'Unknown') {
      const parts = minecraftVersion.split('.').map(p => parseInt(p, 10));
      const minor = parts[1] || 0;
      const patch = parts[2] || 0;
      if (minor >= 21 || (minor === 20 && patch >= 5)) {
        javaTarget = 21;
      } else if (minor >= 17) {
        javaTarget = 17;
      } else if (minor === 16) {
        javaTarget = 16;
      } else if (minor > 0 && minor < 16) {
        javaTarget = 8;
      }
    }
  }

  // Find source & resource directories
  const sourceDirs: string[] = [];
  const resourceDirs: string[] = [];
  const candidateSourceDirs = [
    'src/main/java',
    'src/main/kotlin',
    'src/client/java',
    'src/common/java',
    'java',
  ];
  for (const s of candidateSourceDirs) {
    if (fs.existsSync(path.join(rootDir, s))) {
      sourceDirs.push(s);
    }
  }
  const candidateResourceDirs = [
    'src/main/resources',
    'src/client/resources',
    'resources',
  ];
  for (const r of candidateResourceDirs) {
    if (fs.existsSync(path.join(rootDir, r))) {
      resourceDirs.push(r);
    }
  }

  if (sourceDirs.length === 0) {
    warnings.push('No Java/Kotlin source directory detected (e.g. src/main/java).');
  }

  return {
    metadata: {
      modId: modId || 'mod',
      name: name || modId || 'Minecraft Mod',
      version: version || '1.0.0',
      minecraftVersion: minecraftVersion,
      loader: loader,
      loaderVersion: loaderVersion,
      buildSystem: buildSystem,
      gradleVersion: gradleVersion,
      javaTarget: javaTarget,
      dependencies: dependencies,
      rootDir: rootRelative,
      hasWrapper: hasGradlew,
      sourceDirs: sourceDirs,
      resourceDirs: resourceDirs,
      entrypoints: Object.keys(entrypoints).length > 0 ? entrypoints : undefined,
      warnings: warnings,
      fileCount: fileCount,
      totalSizeBytes: totalSizeBytes,
    },
    extractedPath: baseDir,
    relativeRoot: rootRelative,
  };
}

function findProjectRoot(baseDir: string): string {
  // Check if current dir has build files
  const rootIndicators = ['build.gradle', 'build.gradle.kts', 'pom.xml', 'fabric.mod.json', 'gradlew'];
  for (const ind of rootIndicators) {
    if (fs.existsSync(path.join(baseDir, ind))) {
      return '';
    }
  }

  // Check 1 level down
  try {
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    const subdirs = entries.filter(e => e.isDirectory() && e.name !== '__MACOSX' && e.name !== '.git');
    for (const d of subdirs) {
      for (const ind of rootIndicators) {
        if (fs.existsSync(path.join(baseDir, d.name, ind))) {
          return d.name;
        }
      }
    }

    // Check 2 levels down
    for (const d of subdirs) {
      const subEntries = fs.readdirSync(path.join(baseDir, d.name), { withFileTypes: true });
      for (const sd of subEntries.filter(e => e.isDirectory())) {
        for (const ind of rootIndicators) {
          if (fs.existsSync(path.join(baseDir, d.name, sd.name, ind))) {
            return path.join(d.name, sd.name);
          }
        }
      }
    }
  } catch {
    // fallback
  }

  return '';
}

function parseProperties(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      result[key] = val;
    }
  }
  return result;
}

function parseModsToml(
  filePath: string,
  onModInfo: (id?: string, name?: string, version?: string) => void,
  dependencies: ProjectDependency[]
) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const modIdMatch = content.match(/modId\s*=\s*["']([^"']+)["']/);
    const displayNameMatch = content.match(/displayName\s*=\s*["']([^"']+)["']/);
    const versionMatch = content.match(/version\s*=\s*["']([^"']+)["']/);

    onModInfo(modIdMatch?.[1], displayNameMatch?.[1], versionMatch?.[1]);

    // parse dependencies block
    const depMatches = content.matchAll(/\[\[dependencies\.[^\]]+\]\][\s\S]*?modId\s*=\s*["']([^"']+)["'][\s\S]*?(?:versionRange\s*=\s*["']([^"']+)["'])?/g);
    for (const m of depMatches) {
      if (m[1]) {
        dependencies.push({
          name: m[1],
          version: m[2],
          required: !content.includes(`mandatory = false`),
        });
      }
    }
  } catch {
    // ignore toml parse errors
  }
}

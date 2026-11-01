import type { BuildErrorDetail } from '../types/compiler';

export function analyzeBuildError(rawLogs: string, rootDir: string): BuildErrorDetail | undefined {
  if (!rawLogs) return undefined;

  // 1. Check for Java compilation error
  // Pattern: /path/to/File.java:line: error: message
  const javaErrorMatch = rawLogs.match(/(?:^|\n)(.*?\.java):(\d+):(?:\s*(\d+):)?\s*error:\s*([^\n\r]+)/);
  if (javaErrorMatch) {
    let filePath = javaErrorMatch[1].trim();
    if (rootDir && filePath.startsWith(rootDir)) {
      filePath = filePath.substring(rootDir.length).replace(/^[/\\]+/, '');
    }
    const lineNum = parseInt(javaErrorMatch[2], 10);
    const colNum = javaErrorMatch[3] ? parseInt(javaErrorMatch[3], 10) : undefined;
    const msg = javaErrorMatch[4].trim();

    let explanation = `The Java compiler failed while compiling ${filePath} on line ${lineNum}.`;
    let fix = 'Check the reported file and line for syntax mistakes or missing imports.';

    if (msg.includes('cannot find symbol')) {
      explanation = `Symbol not found on line ${lineNum} in ${filePath}. A class, method, or variable name does not exist in the current scope or classpath.`;
      fix = 'Ensure the class or method is spelled correctly and that all necessary import statements and dependencies are included in build.gradle.';
    } else if (msg.includes('incompatible types')) {
      explanation = `Type mismatch in ${filePath} at line ${lineNum}. The assigned value does not match the expected variable or return type.`;
      fix = 'Verify the variable type declaration or cast the object to the required type.';
    } else if (msg.includes('is not abstract and does not override abstract method')) {
      explanation = `The class does not implement all required abstract methods from its interface or superclass.`;
      fix = 'Implement the missing methods or declare the class as abstract.';
    }

    return {
      type: 'java_compilation',
      title: 'Java Compilation Error',
      file: filePath,
      line: lineNum,
      column: colNum,
      rawMessage: msg,
      explanation: explanation,
      suggestedFix: fix,
    };
  }

  // 2. Check for Java class version incompatibility
  const javaVersionMatch = rawLogs.match(/has been compiled by a more recent version of the Java Runtime \(class file version (\d+\.\d+)\), this version of the Java Runtime only recognizes class file versions up to (\d+\.\d+)/) ||
                          rawLogs.match(/invalid source release:\s*(\d+)/i) ||
                          rawLogs.match(/target release (\d+) is not supported/i);
  if (javaVersionMatch) {
    return {
      type: 'java_incompatibility',
      title: 'Java Version Mismatch',
      rawMessage: javaVersionMatch[0],
      explanation: 'The project or one of its dependencies requires a newer Java Runtime version than the one executing the build.',
      suggestedFix: 'Switch the project Java target version to JDK 17 or JDK 21 in build.gradle, or adjust toolchain settings.',
    };
  }

  // 3. Check for Dependency Resolution failures
  const depMatch = rawLogs.match(/Could not resolve (?:all files for configuration|all dependencies for configuration|dependencies)[\s\S]*?> Could not resolve ([^\n\r]+)/i) ||
                   rawLogs.match(/Could not find ([^\n\r]+)\.[\s\S]*?Searched in the following locations:/i);
  if (depMatch) {
    const depName = depMatch[1].trim();
    return {
      type: 'dependency_resolution',
      title: 'Dependency Resolution Failure',
      rawMessage: depMatch[0].slice(0, 300),
      explanation: `Gradle could not resolve the required dependency: "${depName}". The artifact was not found in any declared maven repository.`,
      suggestedFix: 'Check the dependency coordinates and version in build.gradle. Ensure that required repositories (e.g., FabricMC, Cursemaven, Parchment, or Maven Central) are declared in the repositories {} block.',
    };
  }

  // 4. Loom / Forge remapping errors
  if (rawLogs.includes('Failed to remap jar') || rawLogs.includes('LoomGradleException') || rawLogs.includes('Unable to find mappings')) {
    return {
      type: 'loom_mapping',
      title: 'Minecraft Mappings / Remapping Failure',
      rawMessage: 'Failed to remap mod classes to intermediary or runtime namespace.',
      explanation: 'Fabric Loom or ForgeGradle failed to remap source code or generate mapped Minecraft jars. This often occurs when yarn_mappings or forge version is invalid.',
      suggestedFix: 'Verify the minecraft_version and yarn_mappings in gradle.properties to ensure that a matching mapping build exists.',
    };
  }

  // 5. Gradle configuration / syntax failure
  const gradleConfigMatch = rawLogs.match(/\* What went wrong:\s*([\s\S]*?)(?:\* Try:|\* Exception is:|$)/);
  if (gradleConfigMatch) {
    const whatWentWrong = gradleConfigMatch[1].trim();
    return {
      type: 'gradle_config',
      title: 'Gradle Build Failure',
      rawMessage: whatWentWrong.slice(0, 400),
      explanation: 'The Gradle build failed during configuration or task execution.',
      suggestedFix: 'Review the build output above to identify which task failed (e.g. compileJava, processResources).',
    };
  }

  // 6. Generic failure fallback
  return {
    type: 'unknown',
    title: 'Compilation Failed',
    rawMessage: 'Build process exited with a non-zero exit code.',
    explanation: 'The build tool finished with errors. Inspect the full build log for details.',
    suggestedFix: 'Check the terminal logs above to diagnose the root cause.',
  };
}

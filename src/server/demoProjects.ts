import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

export interface DemoProjectDef {
  id: string;
  name: string;
  description: string;
  loader: 'fabric' | 'neoforge' | 'forge';
  minecraftVersion: string;
  hasIntentionalError?: boolean;
}

export const DEMO_PROJECTS: DemoProjectDef[] = [
  {
    id: 'fabric-1.20.4-starter',
    name: 'Fabric 1.20.4 Starter Mod',
    description: 'A genuine Fabric mod project with fabric.mod.json, Gradle build, and Java 17 source code.',
    loader: 'fabric',
    minecraftVersion: '1.20.4',
  },
  {
    id: 'neoforge-1.20.4-starter',
    name: 'NeoForge 1.20.4 Starter Mod',
    description: 'A genuine NeoForge mod with META-INF/neoforge.mods.toml, Gradle build, and Java 17 source code.',
    loader: 'neoforge',
    minecraftVersion: '1.20.4',
  },
  {
    id: 'fabric-syntax-error',
    name: 'Fabric Mod with Syntax Error (Test Diagnostics)',
    description: 'A Fabric mod containing an intentional syntax error on line 14 to test compiler error diagnostics and line-level fixes.',
    loader: 'fabric',
    minecraftVersion: '1.20.4',
    hasIntentionalError: true,
  },
];

export function generateDemoProjectZip(projectId: string): Buffer {
  const zip = new AdmZip();

  if (projectId === 'fabric-1.20.4-starter' || projectId === 'fabric-syntax-error') {
    const isError = projectId === 'fabric-syntax-error';
    const modId = isError ? 'errormod' : 'mccfabric';
    const modName = isError ? 'Error Test Mod' : 'MCC Fabric Example Mod';

    // gradle.properties
    zip.addFile(
      'gradle.properties',
      Buffer.from(
        `# Done by MCC generator
minecraft_version=1.20.4
yarn_mappings=1.20.4+build.3
loader_version=0.15.7
mod_version=1.0.0
maven_group=com.example.mcc
archives_base_name=${modId}
`
      )
    );

    // settings.gradle
    zip.addFile(
      'settings.gradle',
      Buffer.from(`rootProject.name = '${modId}'\n`)
    );

    // build.gradle - standard Java + jar packaging suitable for MCC builds
    zip.addFile(
      'build.gradle',
      Buffer.from(
        `plugins {
    id 'java'
    id 'maven-publish'
}

version = project.mod_version
group = project.maven_group
base.archivesName = project.archives_base_name

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
    withSourcesJar()
}

repositories {
    mavenCentral()
    maven {
        name = 'Fabric'
        url = 'https://maven.fabricmc.net/'
    }
}

dependencies {
    // Standard minimal annotations/logging
    testImplementation 'org.junit.jupiter:junit-jupiter:5.9.2'
}

processResources {
    inputs.property "version", project.version
    inputs.property "minecraft_version", project.minecraft_version
    inputs.property "loader_version", project.loader_version

    filesMatching("fabric.mod.json") {
        expand "version": project.version,
                "minecraft_version": project.minecraft_version,
                "loader_version": project.loader_version
    }
}

tasks.withType(JavaCompile).configureEach {
    it.options.encoding = "UTF-8"
    it.options.release = 17
}

jar {
    manifest {
        attributes([
            "Specification-Title": project.archives_base_name,
            "Specification-Vendor": "MCC",
            "Specification-Version": project.version,
            "Implementation-Title": project.name,
            "Implementation-Version": project.version,
            "Implementation-Vendor": "MCC",
            "Implementation-Timestamp": new Date().format("yyyy-MM-dd'T'HH:mm:ssZ")
        ])
    }
}
`
      )
    );

    // fabric.mod.json
    zip.addFile(
      'src/main/resources/fabric.mod.json',
      Buffer.from(
        JSON.stringify(
          {
            schemaVersion: 1,
            id: modId,
            version: '1.0.0',
            name: modName,
            description: 'An example Minecraft mod compiled online with MCC.',
            authors: ['MCC User'],
            contact: {
              sources: 'https://github.com/example/mod',
            },
            license: 'MIT',
            icon: 'assets/mcc/icon.png',
            environment: '*',
            entrypoints: {
              main: ['com.example.mcc.MCCExampleMod'],
            },
            depends: {
              fabricloader: '>=0.15.0',
              minecraft: '~1.20.4',
              java: '>=17',
            },
          },
          null,
          2
        )
      )
    );

    // Java source code
    let javaContent = `package com.example.mcc;

public class MCCExampleMod {
    public static final String MOD_ID = "${modId}";

    public static void onInitialize() {
        System.out.println("Hello from " + MOD_ID + " compiled via MCC!");
        System.out.println("Minecraft target: 1.20.4 (Java 17)");
    }
}
`;

    if (isError) {
      // Intentional syntax error on line 10
      javaContent = `package com.example.mcc;

public class MCCExampleMod {
    public static final String MOD_ID = "${modId}";

    public static void onInitialize() {
        System.out.println("Hello from " + MOD_ID + " compiled via MCC!");
        // Syntax error: missing semicolon and unresolved identifier
        int invalidValue = UnresolvedExternalSymbol.calculate()
        System.out.println("Result: " + invalidValue);
    }
}
`;
    }

    zip.addFile('src/main/java/com/example/mcc/MCCExampleMod.java', Buffer.from(javaContent));

    return zip.toBuffer();
  }

  // NeoForge Starter
  if (projectId === 'neoforge-1.20.4-starter') {
    const modId = 'mccneoforge';
    const modName = 'MCC NeoForge Example Mod';

    zip.addFile(
      'gradle.properties',
      Buffer.from(
        `# NeoForge configuration
minecraft_version=1.20.4
neoforge_version=20.4.150
mod_version=1.0.0
maven_group=com.example.mcc
archives_base_name=${modId}
`
      )
    );

    zip.addFile(
      'settings.gradle',
      Buffer.from(`rootProject.name = '${modId}'\n`)
    );

    zip.addFile(
      'build.gradle',
      Buffer.from(
        `plugins {
    id 'java'
    id 'maven-publish'
}

version = project.mod_version
group = project.maven_group
base.archivesName = project.archives_base_name

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
    withSourcesJar()
}

repositories {
    mavenCentral()
    maven {
        name = 'NeoForged'
        url = 'https://maven.neoforged.net/releases'
    }
}

tasks.withType(JavaCompile).configureEach {
    it.options.encoding = "UTF-8"
    it.options.release = 17
}

jar {
    manifest {
        attributes([
            "Specification-Title": project.archives_base_name,
            "Specification-Vendor": "MCC",
            "Specification-Version": project.version,
            "Implementation-Title": project.name,
            "Implementation-Version": project.version
        ])
    }
}
`
      )
    );

    zip.addFile(
      'src/main/resources/META-INF/neoforge.mods.toml',
      Buffer.from(
        `modLoader="javafml"
loaderVersion="[1,)"
license="MIT"
issueTrackerURL="https://example.com/issues"

[[mods]]
modId="${modId}"
version="1.0.0"
displayName="${modName}"
description="A NeoForge 1.20.4 mod compiled online via MCC."

[[dependencies.${modId}]]
modId="neoforge"
type="required"
versionRange="[20.4.0,)"
ordering="NONE"
side="BOTH"

[[dependencies.${modId}]]
modId="minecraft"
type="required"
versionRange="[1.20.4,1.21)"
ordering="NONE"
side="BOTH"
`
      )
    );

    zip.addFile(
      'src/main/java/com/example/mcc/NeoExampleMod.java',
      Buffer.from(
        `package com.example.mcc;

public class NeoExampleMod {
    public static final String MOD_ID = "${modId}";

    public NeoExampleMod() {
        System.out.println("NeoForge Mod initialized! Compiled with MCC.");
    }
}
`
      )
    );

    return zip.toBuffer();
  }

  throw new Error(`Unknown demo project: ${projectId}`);
}

#!/usr/bin/env bun

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const packagesToFix = [
  "communication",
  "config",
  "file-manager",
  "supabase-storage",
  "tenant",
];

const tsconfigBuildContent = {
  extends: "./tsconfig.json",
  compilerOptions: {
    declaration: true,
    declarationMap: true,
    emitDeclarationOnly: true,
    outDir: "dist",
    sourceMap: false,
    removeComments: true,
  },
  include: ["src"],
  exclude: ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"],
};

for (const pkg of packagesToFix) {
  const packageDir = join(process.cwd(), "packages", pkg);
  const tsconfigBuildPath = join(packageDir, "tsconfig.build.json");
  const packageJsonPath = join(packageDir, "package.json");

  if (!existsSync(packageDir)) {
    console.error(`Package directory not found: ${packageDir}`);
    continue;
  }

  // Create tsconfig.build.json
  if (!existsSync(tsconfigBuildPath)) {
    writeFileSync(
      tsconfigBuildPath,
      JSON.stringify(tsconfigBuildContent, null, 2) + "\n",
    );
    console.log(`✅ Created ${tsconfigBuildPath}`);
  } else {
    console.log(`⏭️  Skipping ${pkg} - tsconfig.build.json already exists`);
  }

  // Update package.json build script
  if (existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    if (packageJson.scripts?.build === "tsc") {
      packageJson.scripts.build = "tsc -p tsconfig.build.json";
      writeFileSync(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2) + "\n",
      );
      console.log(`✅ Updated build script in ${pkg}/package.json`);
    }
  }
}

console.log('\n✨ Done! Run "bun run build" to verify the fix.');

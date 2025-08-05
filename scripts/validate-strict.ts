#!/usr/bin/env bun
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Strict TypeScript validation for the entire monorepo
 * This script ensures NO code runs with TypeScript errors
 */

const APPS = ["api", "web", "figgy-website"];
const PACKAGES = [
  // Core packages
  "types",
  "config",
  "utils",
  "shared-db",
  "shared-auth",
  
  // Feature packages
  "tenant",
  "supabase-storage",
  "file-manager",
  "communication",
  "email",
  "email-ingestion",
  "supplier",
  "search",
  "deduplication",
  "llm-utils",
  "nlq",
  "trpc",
  "jobs",
  
  // UI packages
  "ui",
];

// Note: browser-extension excluded as it has its own build system
// Note: assets excluded as it contains only static files
// Note: tsconfig excluded as it only provides configs

async function validateTypesStrict(): Promise<void> {
  console.log(
    "🔍 Running STRICT TypeScript validation across entire monorepo...",
  );
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  );

  let hasErrors = false;
  const results: { name: string; status: "PASS" | "FAIL"; error?: string }[] =
    [];

  // Validate each app
  for (const app of APPS) {
    const appPath = path.join(process.cwd(), "apps", app);
    if (!existsSync(appPath)) {
      console.log(`⚠️  Skipping ${app} - directory not found`);
      continue;
    }

    try {
      console.log(`\n📦 Validating @figgy/${app}...`);

      let command: string;
      if (app === "api") {
        // API uses Bun and may need doppler
        command = existsSync(path.join(appPath, ".env"))
          ? "bunx tsc --noEmit"
          : "doppler run -- bunx tsc --noEmit";
      } else if (app === "web" || app === "figgy-website") {
        // Nuxt apps use vue-tsc
        command = "bunx vue-tsc -b --noEmit";
      } else {
        // Default TypeScript check
        command = "bunx tsc --noEmit";
      }

      execSync(command, {
        cwd: appPath,
        stdio: "pipe",
        encoding: "utf8",
      });

      console.log(`✅ @figgy/${app} - TypeScript validation PASSED`);
      results.push({ name: `@figgy/${app}`, status: "PASS" });
    } catch (error: any) {
      hasErrors = true;
      console.log(`❌ @figgy/${app} - TypeScript validation FAILED`);

      if (error.stdout) {
        console.log(`\n📋 Errors in @figgy/${app}:`);
        console.log(error.stdout);
      }
      if (error.stderr) {
        console.log(error.stderr);
      }

      results.push({
        name: `@figgy/${app}`,
        status: "FAIL",
        error: error.stdout || error.stderr || error.message,
      });
    }
  }

  // Validate each package
  for (const pkg of PACKAGES) {
    const pkgPath = path.join(process.cwd(), "packages", pkg);
    if (!existsSync(pkgPath)) {
      console.log(`⚠️  Skipping ${pkg} - directory not found`);
      continue;
    }

    try {
      console.log(`\n📦 Validating @figgy/${pkg}...`);

      execSync("bunx tsc --noEmit", {
        cwd: pkgPath,
        stdio: "pipe",
        encoding: "utf8",
      });

      console.log(`✅ @figgy/${pkg} - TypeScript validation PASSED`);
      results.push({ name: `@figgy/${pkg}`, status: "PASS" });
    } catch (error: any) {
      hasErrors = true;
      console.log(`❌ @figgy/${pkg} - TypeScript validation FAILED`);

      if (error.stdout) {
        console.log(`\n📋 Errors in @figgy/${pkg}:`);
        console.log(error.stdout);
      }

      results.push({
        name: `@figgy/${pkg}`,
        status: "FAIL",
        error: error.stdout || error.stderr || error.message,
      });
    }
  }

  // Summary
  console.log(
    "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  );
  console.log("📊 VALIDATION SUMMARY:");
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  );

  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  
  console.log(`\n✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📦 Total: ${results.length}`);
  
  console.log("\nDetailed Results:");
  for (const result of results) {
    const status = result.status === "PASS" ? "✅ PASS" : "❌ FAIL";
    console.log(`${status} ${result.name}`);
  }

  if (hasErrors) {
    console.log("\n🚨 STRICT VALIDATION FAILED");
    console.log("❌ Code execution is BLOCKED due to TypeScript errors");
    console.log("🔧 Fix all errors above before running any code");
    process.exit(1);
  } else {
    console.log("\n🎉 STRICT VALIDATION PASSED");
    console.log("✅ All packages have zero TypeScript errors");
    console.log("🚀 Code execution is allowed");
  }
}

// Run validation
validateTypesStrict().catch((error) => {
  console.error("💥 Validation script failed:", error);
  process.exit(1);
});
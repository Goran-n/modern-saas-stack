#!/usr/bin/env bun
import { execSync } from "child_process";
import { existsSync } from "fs";
import path from "path";

/**
 * Strict TypeScript validation for the entire monorepo
 * This script ensures NO code runs with TypeScript errors
 */

const APPS = ["api", "web"];
const PACKAGES = ["shared-utils"];

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
      console.log(`\n📦 Validating @kibly/${app}...`);

      const command =
        app === "api"
          ? "doppler run -- bunx tsc --noEmit"
          : "bunx vue-tsc -b --noEmit";

      execSync(command, {
        cwd: appPath,
        stdio: "pipe",
        encoding: "utf8",
      });

      console.log(`✅ @kibly/${app} - TypeScript validation PASSED`);
      results.push({ name: `@kibly/${app}`, status: "PASS" });
    } catch (error: any) {
      hasErrors = true;
      console.log(`❌ @kibly/${app} - TypeScript validation FAILED`);

      if (error.stdout) {
        console.log(`\n📋 Errors in @kibly/${app}:`);
        console.log(error.stdout);
      }
      if (error.stderr) {
        console.log(error.stderr);
      }

      results.push({
        name: `@kibly/${app}`,
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
      console.log(`\n📦 Validating @kibly/${pkg}...`);

      execSync("bunx tsc --noEmit", {
        cwd: pkgPath,
        stdio: "pipe",
        encoding: "utf8",
      });

      console.log(`✅ @kibly/${pkg} - TypeScript validation PASSED`);
      results.push({ name: `@kibly/${pkg}`, status: "PASS" });
    } catch (error: any) {
      hasErrors = true;
      console.log(`❌ @kibly/${pkg} - TypeScript validation FAILED`);

      if (error.stdout) {
        console.log(`\n📋 Errors in @kibly/${pkg}:`);
        console.log(error.stdout);
      }

      results.push({
        name: `@kibly/${pkg}`,
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

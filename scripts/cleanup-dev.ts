#!/usr/bin/env bun

import { execSync } from "child_process";

const COLORS = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

function log(message: string, color: keyof typeof COLORS = "reset") {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function getProcessesOnPort(port: number): string[] {
  try {
    const result = execSync(`lsof -ti:${port}`, { encoding: "utf-8" });
    return result.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

function killProcess(pid: string): boolean {
  try {
    execSync(`kill -9 ${pid}`);
    return true;
  } catch {
    return false;
  }
}

function findAndKillProcessesByName(patterns: string[]): number {
  let killedCount = 0;

  for (const pattern of patterns) {
    try {
      const result = execSync(
        `ps aux | grep -E "${pattern}" | grep -v grep | awk '{print $2}'`,
        { encoding: "utf-8" },
      );

      const pids = result.trim().split("\n").filter(Boolean);

      for (const pid of pids) {
        if (killProcess(pid)) {
          killedCount++;
          log(`  ✓ Killed process ${pid} (${pattern})`, "green");
        }
      }
    } catch {
      // No processes found
    }
  }

  return killedCount;
}

async function cleanup() {
  log("\n🧹 Figgy Development Cleanup Script\n", "blue");

  // Check common development ports
  const portsToCheck = [
    { port: 3000, name: "API Server" },
    { port: 3001, name: "API Server (fallback)" },
    { port: 5173, name: "Vite Dev Server" },
    { port: 5174, name: "Vite Dev Server" },
    { port: 5175, name: "Vite Dev Server" },
    { port: 4173, name: "Vite Preview" },
    { port: 8080, name: "Queue Monitor" },
  ];

  log("📍 Checking for processes on development ports...", "yellow");

  let totalKilled = 0;

  for (const { port, name } of portsToCheck) {
    const pids = getProcessesOnPort(port);

    if (pids.length > 0) {
      log(
        `\n🔍 Found ${pids.length} process(es) on port ${port} (${name})`,
        "yellow",
      );

      for (const pid of pids) {
        if (killProcess(pid)) {
          totalKilled++;
          log(`  ✓ Killed process ${pid}`, "green");
        } else {
          log(`  ✗ Failed to kill process ${pid}`, "red");
        }
      }
    }
  }

  // Look for hanging development processes
  log("\n📍 Looking for hanging development processes...", "yellow");

  const processPatterns = [
    "bun.*dev",
    "node.*tsx.*watch",
    "turbo.*dev",
    "vite",
    "doppler run.*dev",
  ];

  const killedByName = findAndKillProcessesByName(processPatterns);
  totalKilled += killedByName;

  // Summary
  if (totalKilled === 0) {
    log("\n✅ No hanging processes found. All clean!", "green");
  } else {
    log(`\n✅ Cleanup complete! Killed ${totalKilled} process(es).`, "green");
  }

  // Optional: Clear Redis development keys
  try {
    const readline = await import("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    await new Promise<void>((resolve) => {
      rl.question("\n🔄 Clear Redis development data? (y/N): ", (answer) => {
        if (answer.toLowerCase() === "y") {
          try {
            // This would need to be implemented based on your Redis setup
            log("  ⚠️  Redis cleanup not implemented yet", "yellow");
          } catch (error) {
            log("  ✗ Failed to clear Redis", "red");
          }
        }
        rl.close();
        resolve();
      });
    });
  } catch {
    // Skip Redis cleanup if readline fails
  }

  log("\n🎉 Development environment cleaned!\n", "blue");
}

// Run cleanup
cleanup().catch((error) => {
  log(`\n❌ Cleanup failed: ${error.message}`, "red");
  process.exit(1);
});

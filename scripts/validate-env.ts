#!/usr/bin/env bun
/**
 * Validates environment variables for all apps
 * Run this script to check if all required environment variables are set
 */

import { bootstrap, getConfig, validateProductionConfig } from "@figgy/config";
import { createLogger } from "@figgy/utils";

const logger = createLogger("env-validator");

// ANSI color codes for terminal output
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

function printHeader(text: string) {
  console.log(`\n${colors.blue}${colors.bold}${text}${colors.reset}`);
}

function printSuccess(text: string) {
  console.log(`${colors.green}✅ ${text}${colors.reset}`);
}

function printError(text: string) {
  console.log(`${colors.red}❌ ${text}${colors.reset}`);
}

function printWarning(text: string) {
  console.log(`${colors.yellow}⚠️  ${text}${colors.reset}`);
}

async function validateApiApp() {
  printHeader("Validating API App Environment");
  
  try {
    const config = bootstrap({ exitOnFailure: false, silent: true });
    if (!config) {
      throw new Error("Failed to validate configuration");
    }
    
    // Check critical API requirements
    const checks = [
      { name: "Database URL", value: config.DATABASE_URL, critical: true },
      { name: "Supabase URL", value: config.SUPABASE_URL, critical: true },
      { name: "Supabase Anon Key", value: config.SUPABASE_ANON_KEY, critical: true },
      { name: "JWT Secret", value: config.JWT_SECRET, critical: true },
      { name: "Base URL", value: config.BASE_URL, critical: true },
      { name: "Trigger Project ID", value: config.TRIGGER_PROJECT_ID, critical: true },
      { name: "Trigger API Key", value: config.TRIGGER_API_KEY, critical: true },
      { name: "Portkey API Key", value: config.PORTKEY_API_KEY, critical: true },
      { name: "Portkey Virtual Key", value: config.PORTKEY_VIRTUAL_KEY, critical: true },
    ];
    
    let hasErrors = false;
    for (const check of checks) {
      if (!check.value) {
        printError(`${check.name} is missing`);
        hasErrors = true;
      } else {
        printSuccess(`${check.name} is set`);
      }
    }
    
    return !hasErrors;
  } catch (error) {
    printError(`API validation failed: ${error}`);
    return false;
  }
}

function validateWebApp() {
  printHeader("Validating Web App Environment");
  
  const checks = [
    { 
      name: "Supabase URL", 
      value: process.env.SUPABASE_URL,
      envVar: "SUPABASE_URL",
      critical: true 
    },
    { 
      name: "Supabase Anon Key", 
      value: process.env.SUPABASE_ANON_KEY,
      envVar: "SUPABASE_ANON_KEY",
      critical: true 
    },
    { 
      name: "API URL", 
      value: process.env.NUXT_PUBLIC_API_URL,
      envVar: "NUXT_PUBLIC_API_URL",
      critical: true 
    },
  ];
  
  let hasErrors = false;
  for (const check of checks) {
    if (!check.value) {
      printError(`${check.name} is missing (${check.envVar})`);
      hasErrors = true;
    } else {
      printSuccess(`${check.name} is set`);
    }
  }
  
  return !hasErrors;
}

function validateBrowserExtension() {
  printHeader("Validating Browser Extension Environment");
  
  const checks = [
    { 
      name: "Supabase URL", 
      value: process.env.VITE_SUPABASE_URL,
      envVar: "VITE_SUPABASE_URL",
      critical: true 
    },
    { 
      name: "Supabase Anon Key", 
      value: process.env.VITE_SUPABASE_ANON_KEY,
      envVar: "VITE_SUPABASE_ANON_KEY",
      critical: true 
    },
    { 
      name: "API URL", 
      value: process.env.VITE_API_URL,
      envVar: "VITE_API_URL",
      critical: true 
    },
  ];
  
  let hasErrors = false;
  for (const check of checks) {
    if (!check.value) {
      printError(`${check.name} is missing (${check.envVar})`);
      hasErrors = true;
    } else {
      printSuccess(`${check.name} is set`);
    }
  }
  
  return !hasErrors;
}

async function main() {
  console.log(`${colors.bold}🔍 Environment Variable Validation${colors.reset}`);
  console.log("================================");
  
  const results = {
    api: await validateApiApp(),
    web: validateWebApp(),
    extension: validateBrowserExtension(),
  };
  
  // Production validation
  printHeader("Validating Production Configuration");
  const prodValid = validateProductionConfig();
  if (prodValid) {
    printSuccess("Production configuration is valid");
  } else {
    printError("Production configuration has errors");
  }
  
  // Summary
  printHeader("Summary");
  const allValid = results.api && results.web && results.extension;
  
  if (allValid) {
    printSuccess("All environment variables are properly configured!");
  } else {
    printError("Some environment variables are missing!");
    console.log("\nTo fix:");
    console.log("1. Copy .env.example to .env in each app directory");
    console.log("2. Fill in the missing values");
    console.log("3. Run this script again to verify");
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error("Validation script failed", { error });
  process.exit(1);
});
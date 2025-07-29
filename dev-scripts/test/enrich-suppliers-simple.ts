#!/usr/bin/env bun

import { getDatabaseConnection, globalSuppliers } from "@figgy/shared-db";
import { logger } from "@figgy/utils";
import { eq, isNull, or } from "drizzle-orm";

// Parse command line arguments
const args = process.argv.slice(2);
const showHelp = args.includes("--help") || args.includes("-h");
const enrichAll = args.includes("--all");
const supplierId = args.find((_arg, i) => args[i - 1] === "--supplier");
const limit = parseInt(
  args.find((_arg, i) => args[i - 1] === "--limit") || "10",
);
const dryRun = args.includes("--dry-run");

if (showHelp || (!enrichAll && !supplierId)) {
  console.log(`
Supplier Enrichment Script

Usage:
  bun run scripts/enrich-suppliers-simple.ts [options]

Options:
  --all                 Enrich all suppliers without domains
  --supplier <id>       Enrich a specific global supplier by ID
  --limit <number>      Limit number of suppliers to enrich (default: 10)
  --dry-run            Show what would be enriched without triggering jobs
  --help, -h           Show this help message

Examples:
  bun run scripts/enrich-suppliers-simple.ts --all --limit 5
  bun run scripts/enrich-suppliers-simple.ts --supplier 5f2efdc3-8589-43d1-9fb1-9100855b76cc

Note: This script outputs the job configuration. To trigger the jobs, pipe the output to the trigger CLI or use the Trigger.dev dashboard.
`);
  process.exit(0);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const db = getDatabaseConnection(databaseUrl);

  try {
    const jobs = [];

    if (supplierId) {
      // Enrich specific supplier
      const [supplier] = await db
        .select()
        .from(globalSuppliers)
        .where(eq(globalSuppliers.id, supplierId));

      if (!supplier) {
        logger.error("Global supplier not found", { id: supplierId });
        process.exit(1);
      }

      logger.info("Found supplier", {
        id: supplier.id,
        name: supplier.canonicalName,
        domain: supplier.primaryDomain,
        enrichmentStatus: supplier.enrichmentStatus,
      });

      if (dryRun) {
        logger.info("Dry run - would trigger enrichment for:", {
          id: supplier.id,
          name: supplier.canonicalName,
          needsDomain: !supplier.primaryDomain,
          needsLogo:
            supplier.primaryDomain && supplier.logoFetchStatus !== "success",
          needsEnrichment:
            supplier.primaryDomain && supplier.enrichmentStatus !== "completed",
        });
        process.exit(0);
      }

      // Create job configurations
      if (!supplier.primaryDomain) {
        jobs.push({
          task: "domain-discovery",
          payload: { globalSupplierIds: [supplier.id] },
        });
      } else {
        if (supplier.logoFetchStatus !== "success") {
          jobs.push({
            task: "fetch-logo",
            payload: { globalSupplierIds: [supplier.id] },
          });
        }

        if (supplier.enrichmentStatus !== "completed") {
          jobs.push({
            task: "website-analysis",
            payload: { globalSupplierIds: [supplier.id] },
          });
        }
      }

      if (jobs.length === 0) {
        logger.info("Supplier is already fully enriched");
        process.exit(0);
      }
    } else if (enrichAll) {
      // Enrich all suppliers without domains or incomplete enrichment
      logger.info("Fetching suppliers needing enrichment", { limit });

      const suppliersNeedingEnrichment = await db
        .select()
        .from(globalSuppliers)
        .where(
          or(
            isNull(globalSuppliers.primaryDomain),
            eq(globalSuppliers.enrichmentStatus, "pending"),
            eq(globalSuppliers.enrichmentStatus, "failed"),
          ),
        )
        .limit(limit);

      logger.info("Found suppliers needing enrichment", {
        count: suppliersNeedingEnrichment.length,
        limit,
      });

      if (suppliersNeedingEnrichment.length === 0) {
        logger.info("No suppliers need enrichment");
        process.exit(0);
      }

      // Group by enrichment needs
      const noDomain = suppliersNeedingEnrichment.filter(
        (s) => !s.primaryDomain,
      );
      const needsEnrichment = suppliersNeedingEnrichment.filter(
        (s) => s.primaryDomain && s.enrichmentStatus !== "completed",
      );

      logger.info("Enrichment breakdown", {
        noDomain: noDomain.length,
        needsEnrichment: needsEnrichment.length,
      });

      if (dryRun) {
        logger.info("Dry run - would enrich:", {
          noDomain: noDomain.map((s) => ({
            id: s.id,
            name: s.canonicalName,
          })),
          needsEnrichment: needsEnrichment.map((s) => ({
            id: s.id,
            name: s.canonicalName,
            domain: s.primaryDomain,
          })),
        });
        process.exit(0);
      }

      // Create job configurations
      if (noDomain.length > 0) {
        jobs.push({
          task: "domain-discovery",
          payload: { globalSupplierIds: noDomain.map((s) => s.id) },
        });
      }

      if (needsEnrichment.length > 0) {
        jobs.push({
          task: "website-analysis",
          payload: { globalSupplierIds: needsEnrichment.map((s) => s.id) },
        });
      }
    }

    // Output job configurations
    logger.info("Job configurations created", {
      count: jobs.length,
    });

    console.log(
      "\nTo trigger these jobs, use the Trigger.dev dashboard or API:",
    );
    jobs.forEach((job, index) => {
      console.log(`\nJob ${index + 1}:`);
      console.log(`  Task: ${job.task}`);
      console.log(`  Payload: ${JSON.stringify(job.payload, null, 2)}`);
    });

    console.log("\nNote: Jobs are not automatically triggered. Please use:");
    console.log(
      "  1. The Trigger.dev dashboard to manually trigger these jobs",
    );
    console.log("  2. The TRPC API endpoints from your application");
    console.log("  3. The Trigger.dev CLI if you have it installed");

    process.exit(0);
  } catch (error) {
    logger.error("Enrichment failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

main();

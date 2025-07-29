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
  bun run scripts/enrich-suppliers.ts [options]

Options:
  --all                 Enrich all suppliers without domains
  --supplier <id>       Enrich a specific global supplier by ID
  --limit <number>      Limit number of suppliers to enrich (default: 10)
  --dry-run            Show what would be enriched without triggering jobs
  --help, -h           Show this help message

Examples:
  bun run scripts/enrich-suppliers.ts --all --limit 5
  bun run scripts/enrich-suppliers.ts --supplier 5f2efdc3-8589-43d1-9fb1-9100855b76cc
`);
  process.exit(0);
}

// Trigger.dev API configuration
const TRIGGER_API_URL =
  process.env.TRIGGER_API_URL || "https://api.trigger.dev";
const TRIGGER_SECRET_KEY = process.env.TRIGGER_SECRET_KEY;

if (!TRIGGER_SECRET_KEY) {
  logger.error("TRIGGER_SECRET_KEY environment variable is required");
  process.exit(1);
}

async function triggerJob(taskId: string, payload: any) {
  const response = await fetch(
    `${TRIGGER_API_URL}/api/v1/tasks/${taskId}/trigger`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TRIGGER_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payload }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to trigger job: ${error}`);
  }

  const result = await response.json();
  return result;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const db = getDatabaseConnection(databaseUrl);

  try {
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

      // Trigger appropriate jobs
      const jobs = [];

      if (!supplier.primaryDomain) {
        logger.info("Triggering domain discovery...");
        const result = await triggerJob("domain-discovery", {
          globalSupplierIds: [supplier.id],
        });
        jobs.push(result);
      } else {
        if (supplier.logoFetchStatus !== "success") {
          logger.info("Triggering logo fetch...");
          const result = await triggerJob("fetch-logo", {
            globalSupplierIds: [supplier.id],
          });
          jobs.push(result);
        }

        if (supplier.enrichmentStatus !== "completed") {
          logger.info("Triggering website analysis...");
          const result = await triggerJob("website-analysis", {
            globalSupplierIds: [supplier.id],
          });
          jobs.push(result);
        }
      }

      if (jobs.length === 0) {
        logger.info("Supplier is already fully enriched");
        process.exit(0);
      }

      logger.info("Enrichment jobs triggered", {
        count: jobs.length,
        jobs: jobs,
      });
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

      // Trigger jobs
      const jobs = [];

      if (noDomain.length > 0) {
        logger.info(
          "Triggering domain discovery for suppliers without domains...",
        );
        const result = await triggerJob("domain-discovery", {
          globalSupplierIds: noDomain.map((s) => s.id),
        });
        jobs.push(result);
      }

      if (needsEnrichment.length > 0) {
        logger.info(
          "Triggering website analysis for suppliers with domains...",
        );
        const result = await triggerJob("website-analysis", {
          globalSupplierIds: needsEnrichment.map((s) => s.id),
        });
        jobs.push(result);
      }

      logger.info("All enrichment jobs triggered", {
        jobCount: jobs.length,
        jobs: jobs,
      });
    }

    process.exit(0);
  } catch (error) {
    logger.error("Enrichment failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

main();

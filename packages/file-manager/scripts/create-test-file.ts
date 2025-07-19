#!/usr/bin/env bun

import { getConfig } from "@kibly/config";
import type { CategorizeFilePayload } from "@kibly/jobs/schemas";
// Create a test file record directly in the database
import { files as filesTable, getDatabaseConnection } from "@kibly/shared-db";
import { createLogger } from "@kibly/utils";
import { tasks } from "@trigger.dev/sdk/v3";

const logger = createLogger("create-test-file");

async function main() {
  try {
    getConfig().validate();
    const config = getConfig().getCore();
    const db = getDatabaseConnection(config.DATABASE_URL);

    const tenantId = "8e4fd8f9-813e-4239-a954-956926648e10";
    const fileName = "Invoice-124114EE-0006.pdf";

    // Create a file record directly in the database
    const [record] = await db
      .insert(filesTable)
      .values({
        fileName,
        pathTokens: [tenantId, "test", fileName],
        mimeType: "application/pdf",
        size: 40239,
        bucket: "files",
        tenantId,
        uploadedBy: "cli-test",
        source: "user_upload",
        metadata: {
          importedVia: "test-script",
          originalPath:
            "/Users/goran/Projects/kibly/files/Invoice-124114EE-0006.pdf",
        },
      })
      .returning();

    logger.info("File record created", {
      fileId: record.id,
      fileName: record.fileName,
      tenantId: record.tenantId,
    });

    // Trigger categorization job
    await tasks.trigger("categorize-file", {
      fileId: record.id,
      tenantId: record.tenantId,
      mimeType: record.mimeType,
      size: record.size,
      pathTokens: record.pathTokens,
      source: record.source,
    } satisfies CategorizeFilePayload);

    logger.info("Categorization job triggered", {
      fileId: record.id,
    });

    console.log(`File record created: ${record.id}`);
    console.log("Job triggered successfully");
  } catch (error) {
    logger.error("Failed to create test file", { error });
    console.error("Error:", error);
    process.exit(1);
  }

  process.exit(0);
}

main();

#!/usr/bin/env bun

import { getConfig } from "@figgy/config";
import { uploadFile } from "@figgy/file-manager";
import { createLogger } from "@figgy/utils";
import { readFile } from "fs/promises";
import { basename } from "path";
import { parseArgs } from "util";

const logger = createLogger("ingest-file");

async function main() {
  try {
    // Validate configuration
    getConfig().validate();

    // Parse command line arguments
    const { values } = parseArgs({
      args: process.argv.slice(2),
      options: {
        file: {
          type: "string",
          short: "f",
        },
        tenant: {
          type: "string",
          short: "t",
        },
        source: {
          type: "string",
          short: "s",
          default: "user_upload",
        },
      },
    });

    if (!values.file || !values.tenant) {
      console.error(
        "Usage: bun run scripts/ingest-file.ts --file <path> --tenant <id>",
      );
      process.exit(1);
    }

    const filePath = values.file;
    const tenantId = values.tenant;
    const source = values.source as "user_upload" | "integration" | "whatsapp";

    logger.info("Starting file ingestion", { filePath, tenantId, source });

    // Read file
    const fileBuffer = await readFile(filePath);
    const fileName = basename(filePath);

    // Create File object
    const file = new File([fileBuffer], fileName);

    // Get storage bucket from config
    const config = getConfig().getCore();
    const bucket = config.STORAGE_BUCKET || "vault";

    // Upload file using file-manager
    const fileId = await uploadFile(file, {
      tenantId,
      uploadedBy: "00000000-0000-0000-0000-000000000000", // System user UUID
      bucket,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      source,
      pathTokens: [tenantId, "cli-imports"],
    });

    logger.info("File ingestion complete", { fileId, fileName });
    console.log(`File uploaded: ${fileId}`);

    process.exit(0);
  } catch (error) {
    logger.error("File ingestion failed", { error });
    console.error("Error:", error);
    process.exit(1);
  }
}

main();

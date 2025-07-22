#!/usr/bin/env bun

import { getConfig } from "@figgy/config";
import { configure, tasks } from "@trigger.dev/sdk/v3";

async function main() {
  try {
    getConfig().validate();
    const config = getConfig().getCore();

    console.log("Configuring Trigger.dev...");
    console.log("Project ID:", config.TRIGGER_PROJECT_ID);
    console.log(
      "API URL:",
      config.TRIGGER_API_URL || "https://api.trigger.dev",
    );

    configure({
      projectId: config.TRIGGER_PROJECT_ID!,
      apiKey: config.TRIGGER_API_KEY!,
      apiUrl: config.TRIGGER_API_URL || "https://api.trigger.dev",
    });

    console.log("\nAttempting to trigger categorize-file job...");

    const result = await tasks.trigger("categorize-file", {
      fileId: "test-file-id",
      tenantId: "8e4fd8f9-813e-4239-a954-956926648e10",
      mimeType: "application/pdf",
      size: 12345,
      pathTokens: ["test", "path"],
      source: "user_upload",
    });

    console.log("Success! Job triggered:", result);
  } catch (error) {
    console.error("Error triggering job:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
  }

  process.exit(0);
}

main();

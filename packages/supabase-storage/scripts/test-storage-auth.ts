#!/usr/bin/env bun

import { getConfig } from "@kibly/config";
import { createClient } from "@supabase/supabase-js";

async function main() {
  getConfig().validate();
  const config = getConfig().getCore();

  console.log("SUPABASE_URL exists:", !!config.SUPABASE_URL);
  console.log("SUPABASE_ANON_KEY exists:", !!config.SUPABASE_ANON_KEY);
  console.log("SUPABASE_SERVICE_KEY exists:", !!config.SUPABASE_SERVICE_KEY);
  console.log("Using service key:", !!config.SUPABASE_SERVICE_KEY);

  // Test with service key
  if (config.SUPABASE_SERVICE_KEY) {
    const serviceClient = createClient(
      config.SUPABASE_URL,
      config.SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      },
    );

    console.log("\nTesting service role client...");

    // List buckets
    const { data: buckets, error: bucketsError } =
      await serviceClient.storage.listBuckets();
    console.log(
      "Buckets:",
      buckets?.map((b) => b.name),
    );
    if (bucketsError) console.error("Buckets error:", bucketsError);

    // Test upload with service role
    const testFile = new File(["test content"], "test.txt", {
      type: "text/plain",
    });
    const testPath = "service-role-test/test.txt";

    const { error: uploadError } = await serviceClient.storage
      .from("vault")
      .upload(testPath, testFile, { upsert: true });

    if (uploadError) {
      console.error("Service role upload error:", uploadError);
    } else {
      console.log("Service role upload successful!");

      // Clean up
      await serviceClient.storage.from("vault").remove([testPath]);
    }
  }

  process.exit(0);
}

main().catch(console.error);

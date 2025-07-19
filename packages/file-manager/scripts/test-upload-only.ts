#!/usr/bin/env bun

import { getConfig } from "@kibly/config";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "fs/promises";
import { basename } from "path";

async function main() {
  const filePath = process.argv[2];
  const tenantId = process.argv[3];

  if (!filePath || !tenantId) {
    console.error(
      "Usage: bun scripts/test-upload-only.ts <file-path> <tenant-id>",
    );
    process.exit(1);
  }

  getConfig().validate();
  const config = getConfig().getCore();

  // Create service client
  const supabase = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );

  // Read file
  const fileBuffer = await readFile(filePath);
  const fileName = basename(filePath);
  const storagePath = `${tenantId}/cli-imports/${fileName}`;

  console.log(`Uploading ${fileName} to vault/${storagePath}...`);

  // Upload to storage
  const { data, error } = await supabase.storage
    .from("vault")
    .upload(storagePath, fileBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    console.error("Upload failed:", error);
  } else {
    console.log("Upload successful!");
    console.log("Path:", storagePath);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("vault")
      .getPublicUrl(storagePath);

    console.log("Public URL:", urlData.publicUrl);
  }

  process.exit(0);
}

main().catch(console.error);

#!/usr/bin/env bun

import { getConfig } from "@figgy/config";
import { createClient } from "@supabase/supabase-js";
import { createLogger } from "@figgy/utils";

const logger = createLogger("test-thumbnail-access");

const configManager = getConfig();
configManager.validate();
const config = configManager.getCore();

// Create Supabase client
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

// Test thumbnail path
const testPath = "8e4fd8f9-813e-4239-a954-956926648e10/thumbnails/7d1395ae-3a42-4121-a54d-7a713e38f43b_thumb.webp";

logger.info("Testing thumbnail access", { path: testPath });

// Get public URL
const { data } = supabase.storage
  .from('vault')
  .getPublicUrl(testPath);

logger.info("Public URL generated", { publicUrl: data.publicUrl });

// Try to fetch the URL
try {
  const response = await fetch(data.publicUrl);
  logger.info("Fetch completed", { 
    status: response.status, 
    statusText: response.statusText 
  });
  
  if (response.ok) {
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    logger.info("Content details", { 
      contentType, 
      contentLength: contentLength ? `${contentLength} bytes` : 'unknown' 
    });
  } else {
    const errorText = await response.text();
    logger.error("Fetch failed", { 
      status: response.status,
      error: errorText 
    });
  }
} catch (error) {
  logger.error("Failed to fetch thumbnail", { 
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });
}

process.exit(0);
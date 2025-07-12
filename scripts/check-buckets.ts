#!/usr/bin/env bun

import { createClient } from '@supabase/supabase-js';
import { getConfig } from '@kibly/config';

async function main() {
  getConfig().validate();
  const config = getConfig().getCore();
  const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY);

  const { data, error } = await supabase.storage.listBuckets();
  
  if (error) {
    console.error('Error listing buckets:', error);
  } else {
    console.log('Available buckets:', data);
  }
  
  // Try to create the files bucket if it doesn't exist
  const { data: createData, error: createError } = await supabase.storage.createBucket('files', {
    public: false,
    fileSizeLimit: 10485760, // 10MB
  });
  
  if (createError) {
    console.log('Bucket creation result:', createError.message);
  } else {
    console.log('Bucket created successfully:', createData);
  }
  
  process.exit(0);
}

main();
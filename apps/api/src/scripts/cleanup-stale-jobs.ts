#!/usr/bin/env tsx

import { getDatabase, connectDatabase } from '../database/connection'
import { syncJobs } from '../database/schema/index'
import { eq, and, lt } from 'drizzle-orm'

async function cleanupStaleJobs(dryRun: boolean = true) {
  // Initialize database connection
  await connectDatabase()
  const db = getDatabase()
  
  console.log('🧹 Cleaning up stale sync jobs...')
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (changes will be applied)'}`)
  
  // Find jobs that are "running" but started more than 2 minutes ago
  const staleThreshold = new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago
  
  const staleJobs = await db
    .select()
    .from(syncJobs)
    .where(
      and(
        eq(syncJobs.status, 'running'),
        lt(syncJobs.startedAt, staleThreshold)
      )
    )
  
  console.log(`\n🔍 Found ${staleJobs.length} stale jobs:\n`)
  
  if (staleJobs.length === 0) {
    console.log('✅ No stale jobs found!')
    return
  }
  
  for (const job of staleJobs) {
    const timeSinceStart = job.startedAt 
      ? Math.round((Date.now() - job.startedAt.getTime()) / 1000)
      : null
    
    console.log(`🚫 Stale Job: ${job.id}`)
    console.log(`   Integration: ${job.integrationId}`)
    console.log(`   Started: ${job.startedAt?.toISOString()}`)
    console.log(`   Running for: ${timeSinceStart ? `${timeSinceStart}s (${Math.round(timeSinceStart/60)}m)` : 'Unknown'}`)
    console.log(`   Progress: ${job.progress}%`)
    console.log('')
    
    if (!dryRun) {
      // Reset the job to failed status
      await db
        .update(syncJobs)
        .set({
          status: 'failed',
          error: 'Job terminated due to timeout - likely interrupted by server restart',
          completedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(syncJobs.id, job.id))
      
      console.log(`   ✅ Reset to "failed" status`)
    } else {
      console.log(`   🔄 Would reset to "failed" status`)
    }
  }
  
  if (dryRun) {
    console.log('\n💡 This was a dry run. To actually clean up these jobs, run:')
    console.log('   doppler run -- npx tsx src/scripts/cleanup-stale-jobs.ts --live')
  } else {
    console.log(`\n✅ Successfully cleaned up ${staleJobs.length} stale jobs!`)
  }
}

// Check command line arguments
const args = process.argv.slice(2)
const isLive = args.includes('--live')

cleanupStaleJobs(!isLive).catch(console.error)
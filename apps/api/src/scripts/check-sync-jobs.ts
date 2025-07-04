#!/usr/bin/env tsx

import { getDatabase, connectDatabase } from '../database/connection'
import { syncJobs } from '../database/schema/index'
import { desc } from 'drizzle-orm'

async function checkSyncJobs() {
  // Initialize database connection
  await connectDatabase()
  const db = getDatabase()
  
  console.log('🔍 Checking sync job status...')
  
  // Get all sync jobs ordered by creation date
  const jobs = await db
    .select()
    .from(syncJobs)
    .orderBy(desc(syncJobs.createdAt))
    .limit(20)
  
  console.log(`\n📊 Found ${jobs.length} recent sync jobs:\n`)
  
  jobs.forEach((job, index) => {
    const duration = job.completedAt && job.startedAt 
      ? Math.round((job.completedAt.getTime() - job.startedAt.getTime()) / 1000)
      : job.startedAt 
        ? Math.round((Date.now() - job.startedAt.getTime()) / 1000)
        : null
    
    console.log(`${index + 1}. Job ${job.id}`)
    console.log(`   Integration: ${job.integrationId}`)
    console.log(`   Status: ${job.status}`)
    console.log(`   Type: ${job.jobType}`)
    console.log(`   Priority: ${job.priority}`)
    console.log(`   Progress: ${job.progress}%`)
    console.log(`   Created: ${job.createdAt.toISOString()}`)
    console.log(`   Started: ${job.startedAt?.toISOString() || 'Not started'}`)
    console.log(`   Completed: ${job.completedAt?.toISOString() || 'Not completed'}`)
    console.log(`   Duration: ${duration ? `${duration}s` : 'N/A'}`)
    console.log(`   Error: ${job.error || 'None'}`)
    console.log(`   Result: ${job.result ? JSON.stringify(job.result, null, 2) : 'None'}`)
    console.log(`   Metadata: ${JSON.stringify(job.metadata, null, 2)}`)
    console.log('')
  })
  
  // Check for running jobs specifically
  const runningJobs = jobs.filter(job => job.status === 'running')
  
  if (runningJobs.length > 0) {
    console.log(`⚠️  Found ${runningJobs.length} jobs marked as "running":\n`)
    
    runningJobs.forEach(job => {
      const timeSinceStart = job.startedAt 
        ? Math.round((Date.now() - job.startedAt.getTime()) / 1000)
        : null
      
      console.log(`🏃 Running Job: ${job.id}`)
      console.log(`   Integration: ${job.integrationId}`)
      console.log(`   Started: ${job.startedAt?.toISOString()}`)
      console.log(`   Running for: ${timeSinceStart ? `${timeSinceStart}s` : 'Unknown'}`)
      console.log(`   Progress: ${job.progress}%`)
      console.log('')
    })
    
    console.log('💡 These jobs may be stale if they\'ve been running for a long time.')
    console.log('   You can clean them up using the cleanup script.')
  } else {
    console.log('✅ No running jobs found.')
  }
}

checkSyncJobs().catch(console.error)
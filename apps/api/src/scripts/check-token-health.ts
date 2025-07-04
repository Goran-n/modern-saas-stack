#!/usr/bin/env tsx

import { getDatabase, connectDatabase } from '../database/connection'
import { integrations } from '../database/schema/index'
import { XeroTokenService } from '../services/xero-token.service'
import { IntegrationEntity } from '../core/domain/integration/index'
import { eq } from 'drizzle-orm'

async function checkTokenHealth() {
  // Initialize database connection
  await connectDatabase()
  const db = getDatabase()
  
  console.log('🔍 Checking Xero token health for all integrations...')
  
  // Get all Xero integrations
  const xeroIntegrations = await db
    .select()
    .from(integrations)
    .where(eq(integrations.provider, 'xero'))
  
  if (xeroIntegrations.length === 0) {
    console.log('📭 No Xero integrations found.')
    return
  }
  
  console.log(`\n📊 Found ${xeroIntegrations.length} Xero integration(s):\n`)
  
  // Mock repository for token service (we won't save anything)
  const mockRepo = {
    save: async () => {},
    findById: async () => null,
    findByTenant: async () => [],
    delete: async () => {}
  } as any
  
  const tokenService = new XeroTokenService(mockRepo, console as any)
  
  for (const integration of xeroIntegrations) {
    const entity = IntegrationEntity.fromDatabase(integration as any)
    
    try {
      const healthStatus = await tokenService.checkTokenHealth(entity)
      const tokenStatus = await tokenService.getTokenStatus(entity)
      
      console.log(`🔧 Integration: ${integration.name} (${integration.id})`)
      console.log(`   Status: ${integration.status}`)
      console.log(`   Health: ${healthStatus.isValid ? '✅ Healthy' : '⚠️ Issues'}`)
      console.log(`   Token expires in: ${Math.floor(healthStatus.expiresIn / 60)} minutes`)
      console.log(`   Token Status: ${tokenStatus.status}`)
      console.log(`   Message: ${tokenStatus.message}`)
      console.log(`   Consecutive failures: ${healthStatus.consecutiveFailures}`)
      console.log(`   Needs refresh: ${healthStatus.needsRefresh ? 'Yes' : 'No'}`)
      
      if (healthStatus.error) {
        console.log(`   Error: ${healthStatus.error}`)
      }
      
      console.log(`   Re-auth needed: ${!healthStatus.isValid && healthStatus.consecutiveFailures > 3 ? '⚠️ Yes' : '✅ No'}`)
      
      console.log('')
      
    } catch (error) {
      console.log(`❌ Error checking integration ${integration.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      console.log('')
    }
  }
}

checkTokenHealth().catch(console.error)
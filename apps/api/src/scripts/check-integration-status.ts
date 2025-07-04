import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { integrations } from '../database/schema/index'
import { getDatabaseConfig } from '../config/config'
import log from '../config/logger'

const dbConfig = getDatabaseConfig()
const client = postgres(dbConfig.url!)
const db = drizzle(client)

async function checkIntegrationStatus() {
  try {
    log.info('🔍 Checking integration status...')
    
    const allIntegrations = await db
      .select()
      .from(integrations)
      .limit(10)

    console.log('📋 Current integrations:')
    
    for (const integration of allIntegrations) {
      console.log(`\n🔧 Integration: ${integration.name}`)
      console.log(`   ID: ${integration.id}`)
      console.log(`   Provider: ${integration.provider}`)
      console.log(`   Status: ${integration.status}`)
      console.log(`   Last Error: ${integration.lastError || 'None'}`)
      console.log(`   Last Sync: ${integration.lastSyncAt || 'Never'}`)
      
      // Check auth data without exposing sensitive tokens
      const authData = integration.authData as any
      if (authData) {
        console.log(`   Has Access Token: ${!!authData.accessToken}`)
        console.log(`   Has Refresh Token: ${!!authData.refreshToken}`)
        console.log(`   Has Tenant ID: ${!!authData.tenantId}`)
        if (authData.expiresAt) {
          const expiresAt = typeof authData.expiresAt === 'string' 
            ? new Date(authData.expiresAt) 
            : new Date(authData.expiresAt * 1000)
          const isExpired = expiresAt < new Date()
          console.log(`   Token Expires: ${expiresAt.toISOString()}`)
          console.log(`   Token Expired: ${isExpired ? '❌ YES' : '✅ NO'}`)
        }
      }
    }
    
    console.log('\n💡 Frontend Status Summary:')
    console.log('   - Integrations with expired tokens will show "Reconnect" button')
    console.log('   - Status will be "setup_pending" for auth issues')
    console.log('   - Users can click "Reconnect" to re-authenticate')
    
  } catch (error) {
    log.error('Failed to check integration status:', error)
  } finally {
    await client.end()
  }
}

checkIntegrationStatus()
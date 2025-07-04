#!/usr/bin/env bun

import postgres from 'postgres'
import { getDatabaseConfig } from '../config/config'
import logger from '../config/logger'

const integrationId = process.argv[2]
const tenantId = process.argv[3]

if (!integrationId || !tenantId) {
  logger.error('Usage: bun run test-integration-query.ts <integrationId> <tenantId>')
  process.exit(1)
}

const dbConfig = getDatabaseConfig()

logger.info('Database config:', {
  hasUrl: !!dbConfig.url,
  urlLength: dbConfig.url?.length,
  urlStart: dbConfig.url?.substring(0, 20) + '...'
})

if (!dbConfig.url) {
  logger.error('DATABASE_URL is required')
  process.exit(1)
}

const client = postgres(dbConfig.url)

async function testQuery() {
  try {
    logger.info('Testing direct query', { integrationId, tenantId })
    
    const result = await client`
      SELECT * FROM integrations 
      WHERE id = ${integrationId} 
      AND tenant_id = ${tenantId}
    `
    
    console.log('Query result:', result)
    
    if (result.length > 0) {
      console.log('Integration found:', {
        id: result[0].id,
        name: result[0].name,
        provider: result[0].provider,
        status: result[0].status,
        hasAuthData: !!result[0].auth_data
      })
    } else {
      console.log('No integration found')
    }
    
    await client.end()
    process.exit(0)
  } catch (error) {
    logger.error('Query failed:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    console.error('Full error:', error)
    await client.end()
    process.exit(1)
  }
}

testQuery()
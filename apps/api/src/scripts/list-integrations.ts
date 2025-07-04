#!/usr/bin/env bun

import postgres from 'postgres'
import { getDatabaseConfig } from '../config/config'
import logger from '../config/logger'

const dbConfig = getDatabaseConfig()

if (!dbConfig.url) {
  logger.error('DATABASE_URL is required')
  process.exit(1)
}

const client = postgres(dbConfig.url)

async function listIntegrations() {
  try {
    const result = await client`
      SELECT id, tenant_id, name, provider, status 
      FROM integrations 
      LIMIT 10
    `
    
    console.log('Integrations in database:')
    console.log('========================')
    
    if (result.length === 0) {
      console.log('No integrations found')
    } else {
      result.forEach((row, i) => {
        console.log(`\n${i + 1}. ${row.name}`)
        console.log(`   ID: ${row.id}`)
        console.log(`   Tenant ID: ${row.tenant_id}`)
        console.log(`   Provider: ${row.provider}`)
        console.log(`   Status: ${row.status}`)
      })
    }
    
    await client.end()
    process.exit(0)
  } catch (error) {
    logger.error('Query failed:', error)
    await client.end()
    process.exit(1)
  }
}

listIntegrations()
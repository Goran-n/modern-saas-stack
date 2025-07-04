#!/usr/bin/env bun

import postgres from 'postgres'
import { getDatabaseConfig } from '../config/config'
import logger from '@vepler/logger'

const dbConfig = getDatabaseConfig()

if (!dbConfig.url) {
  logger.error('DATABASE_URL is required')
  process.exit(1)
}

const client = postgres(dbConfig.url)

async function checkIntegrationAuth() {
  try {
    const result = await client`
      SELECT id, tenant_id, provider, auth_data 
      FROM integrations 
      WHERE id = '548c018e-d49a-4474-974d-f5bd40a273a7'
    `
    
    if (result.length === 0) {
      console.log('No integration found')
    } else {
      const row = result[0]
      console.log('\nIntegration Details:')
      console.log('===================')
      console.log('ID:', row.id)
      console.log('Tenant ID:', row.tenant_id)
      console.log('Provider:', row.provider)
      console.log('\nAuth Data Structure:')
      console.log(JSON.stringify(row.auth_data, null, 2))
    }
    
    await client.end()
    process.exit(0)
  } catch (error) {
    logger.error('Query failed:', error)
    await client.end()
    process.exit(1)
  }
}

checkIntegrationAuth()
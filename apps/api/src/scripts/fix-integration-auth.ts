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

async function fixIntegrationAuth() {
  try {
    // First, get the current auth data
    const result = await client`
      SELECT id, auth_data 
      FROM integrations 
      WHERE id = '548c018e-d49a-4474-974d-f5bd40a273a7'
    `
    
    if (result.length === 0) {
      console.log('No integration found')
      await client.end()
      process.exit(1)
    }
    
    const currentAuthData = result[0].auth_data
    
    // Calculate expiresIn from expiresAt
    const expiresAt = new Date(currentAuthData.expiresAt)
    const now = new Date()
    const calculatedExpiresIn = Math.floor((expiresAt.getTime() - now.getTime()) / 1000)
    // Set to 1 second if expired to trigger refresh but pass validation
    const expiresIn = calculatedExpiresIn <= 0 ? 1 : calculatedExpiresIn
    
    // Fix the auth data structure
    const fixedAuthData = {
      accessToken: currentAuthData.accessToken,
      refreshToken: currentAuthData.refreshToken,
      expiresIn: expiresIn,
      tokenType: currentAuthData.tokenType || 'Bearer',
      scope: Array.isArray(currentAuthData.scope) ? currentAuthData.scope.join(' ') : currentAuthData.scope,
      issuedAt: new Date().toISOString(),
      expiresAt: currentAuthData.expiresAt,
      tenantId: currentAuthData.tenantId,
      tenantName: currentAuthData.tenantName,
      tenantType: currentAuthData.tenantType
    }
    
    console.log('Fixed auth data:')
    console.log(JSON.stringify(fixedAuthData, null, 2))
    
    // Update the auth data in the database
    const updateResult = await client`
      UPDATE integrations 
      SET auth_data = ${JSON.stringify(fixedAuthData)}::jsonb
      WHERE id = '548c018e-d49a-4474-974d-f5bd40a273a7'
      RETURNING id
    `
    
    if (updateResult.length > 0) {
      console.log('\nSuccessfully updated auth data for integration:', updateResult[0].id)
    }
    
    await client.end()
    process.exit(0)
  } catch (error) {
    logger.error('Failed to fix auth data:', error)
    await client.end()
    process.exit(1)
  }
}

fixIntegrationAuth()
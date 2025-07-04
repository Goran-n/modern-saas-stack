#!/usr/bin/env bun

import { XeroClient } from 'xero-node'
import { getXeroConfig, getDatabaseConfig } from '../config/config'
import logger from '@vepler/logger'
import postgres from 'postgres'

const xeroConfig = getXeroConfig()
const dbConfig = getDatabaseConfig()

if (!xeroConfig.clientId || !xeroConfig.clientSecret) {
  logger.error('XERO_CLIENT_ID and XERO_CLIENT_SECRET are required')
  process.exit(1)
}

if (!dbConfig.url) {
  logger.error('DATABASE_URL is required')
  process.exit(1)
}

async function testXeroConnection() {
  const client = postgres(dbConfig.url)
  
  try {
    // Get integration ID from command line or use default
    const integrationId = process.argv[2] || '548c018e-d49a-4474-974d-f5bd40a273a7'
    
    logger.info('Fetching integration auth data', { integrationId })
    
    // Fetch fresh auth data from database
    const result = await client`
      SELECT auth_data, status, last_error
      FROM integrations 
      WHERE id = ${integrationId}
    `
    
    if (result.length === 0) {
      logger.error('Integration not found', { integrationId })
      process.exit(1)
    }
    
    const integration = result[0]
    const authData = integration.auth_data
    
    if (!authData.accessToken) {
      logger.error('No access token in integration', {
        integrationId,
        status: integration.status,
        lastError: integration.last_error,
        authDataKeys: Object.keys(authData)
      })
      process.exit(1)
    }
    
    logger.info('Integration auth data found', {
      hasAccessToken: !!authData.accessToken,
      hasRefreshToken: !!authData.refreshToken,
      tenantId: authData.tenantId,
      expiresAt: authData.expiresAt,
      tokenLength: authData.accessToken?.length
    })
    
    // Create Xero client
    const xero = new XeroClient({
      clientId: xeroConfig.clientId!,
      clientSecret: xeroConfig.clientSecret!,
      redirectUris: [xeroConfig.redirectUri!],
      scopes: xeroConfig.scopes
    })

    // Set access token from database
    const accessToken = authData.accessToken
    const xeroTenantId = authData.tenantId

    // Create API instance
    const api = xero.accountingApi
    api.accessToken = accessToken

    // Try simple API call - get organisation
    logger.info('Testing Xero connection...')
    
    try {
      const orgResponse = await api.getOrganisations(xeroTenantId)
      logger.info('✅ Successfully connected to Xero!', {
        organisation: orgResponse.body?.organisations?.[0]?.name,
        status: orgResponse.response?.status
      })
    } catch (apiError: any) {
      logger.error('Organisation API call failed', {
        message: apiError?.message,
        statusCode: apiError?.response?.statusCode,
        body: apiError?.response?.body,
        isTokenExpired: apiError?.response?.statusCode === 401
      })
      
      if (apiError?.response?.statusCode === 401) {
        logger.error('Token is expired. Run the sync script to refresh the token.')
      }
    }

    // Try to get bank transactions with date filter
    logger.info('Testing bank transactions query...')
    
    const dateFrom = new Date()
    dateFrom.setDate(dateFrom.getDate() - 30)
    const dateTo = new Date()
    
    const year = dateFrom.getFullYear()
    const month = dateFrom.getMonth() + 1
    const day = dateFrom.getDate()
    const whereClause = `Date >= DateTime(${year}, ${month}, ${day})`
    
    logger.info('Query parameters', {
      whereClause,
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString()
    })
    
    try {
      const txResponse = await api.getBankTransactions(
        xeroTenantId,
        undefined,
        whereClause,
        undefined,
        1,
        undefined,
        10
      )
      logger.info('✅ Bank transactions query successful!', {
        transactionCount: txResponse.body?.bankTransactions?.length,
        statusCode: txResponse.response?.status,
        hasMorePages: (txResponse.body?.bankTransactions?.length || 0) === 10
      })
      
      if (txResponse.body?.bankTransactions && txResponse.body.bankTransactions.length > 0) {
        const firstTx = txResponse.body.bankTransactions[0]
        logger.info('Sample transaction', {
          id: firstTx.bankTransactionID,
          date: firstTx.date,
          amount: firstTx.total,
          type: firstTx.type,
          status: firstTx.status
        })
      } else {
        logger.warn('No transactions found in the date range')
      }
    } catch (txError: any) {
      logger.error('Transaction query failed', {
        message: txError?.message,
        statusCode: txError?.response?.statusCode,
        body: txError?.response?.body
      })
    }
    
    logger.info('Test completed successfully')
    await client.end()
    process.exit(0)
  } catch (error) {
    logger.error('Test failed:', error)
    await client.end()
    process.exit(1)
  }
}

testXeroConnection()
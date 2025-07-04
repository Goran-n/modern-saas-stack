import { bootstrapDependencies } from './src/infrastructure/bootstrap.js'
import { container, TOKENS } from './src/shared/utils/container.js'
import { connectDatabase } from './src/database/connection.js'
import { XeroClient } from 'xero-node'
import { getXeroConfig } from './src/config/config.js'
import log from './src/config/logger.js'

const integrationId = '93d0753d-7c2f-49c1-9e14-c1149b68d355'

async function testXeroApi() {
  try {
    // Initialize
    await connectDatabase()
    bootstrapDependencies()
    
    // Get integration
    const integrationRepository = container.resolve(TOKENS.INTEGRATION_REPOSITORY)
    const integration = await integrationRepository.findById(integrationId)
    
    if (!integration) {
      console.error('❌ Integration not found')
      return
    }
    
    const authData = integration.authData as any
    
    // Initialize Xero client
    const xeroConfig = getXeroConfig()
    const xeroClient = new XeroClient({
      clientId: xeroConfig.clientId!,
      clientSecret: xeroConfig.clientSecret!,
      redirectUris: [xeroConfig.redirectUri],
      scopes: xeroConfig.scopes,
    })
    
    // Set token
    xeroClient.setTokenSet({
      access_token: authData.accessToken,
      refresh_token: authData.refreshToken,
      token_type: authData.tokenType || 'Bearer'
    })
    
    console.log('🔄 Testing Xero API call...')
    
    try {
      // Try to get organisation info first (simpler call)
      const response = await xeroClient.accountingApi.getOrganisations(authData.tenantId)
      console.log('✅ Xero API call successful!')
      console.log('- Organisation:', response.body.organisations?.[0]?.name)
      
      // Now try bank transactions
      console.log('\n🔄 Testing bank transactions API...')
      const bankResponse = await xeroClient.accountingApi.getBankTransactions(
        authData.tenantId,
        undefined, // modifiedAfter
        undefined, // whereClause 
        undefined, // order
        undefined, // page
        undefined, // unitdp
        undefined, // summerizeErrors
        undefined  // pageSize
      )
      
      console.log('✅ Bank transactions API successful!')
      console.log('- Found transactions:', bankResponse.body.bankTransactions?.length || 0)
      
    } catch (apiError: any) {
      console.error('❌ Xero API Error Details:')
      console.error('- Status:', apiError.response?.status)
      console.error('- Status Text:', apiError.response?.statusText)
      console.error('- Error Body:', JSON.stringify(apiError.response?.body, null, 2))
      console.error('- Full Error:', apiError.message)
      
      if (apiError.response?.status === 401) {
        console.log('\n💡 Token appears to be expired or invalid')
        console.log('   The integration needs to be re-authenticated with Xero')
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing Xero API:', error)
  }
  
  process.exit(0)
}

testXeroApi()
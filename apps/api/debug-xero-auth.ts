import { bootstrapDependencies } from './src/infrastructure/bootstrap.js'
import { container, TOKENS } from './src/shared/utils/container.js'
import { connectDatabase } from './src/database/connection.js'
import log from './src/config/logger.js'

const integrationId = '93d0753d-7c2f-49c1-9e14-c1149b68d355'
const tenantId = '02c24a6e-7e7a-4c1e-812d-0febd140efa2'

async function debugXeroAuth() {
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
    
    console.log('🔍 Integration found:')
    console.log('- ID:', integration.id)
    console.log('- Name:', integration.name)
    console.log('- Provider:', integration.provider)
    console.log('- Status:', integration.status)
    console.log('- Last Error:', integration.lastError)
    console.log('- Tenant ID matches:', integration.tenantId === tenantId)
    
    // Check auth data
    const authData = integration.authData as any
    console.log('\n🔐 Auth data check:')
    console.log('- Has accessToken:', !!authData?.accessToken)
    console.log('- Has refreshToken:', !!authData?.refreshToken)
    console.log('- Has tenantId:', !!authData?.tenantId)
    console.log('- Token type:', authData?.tokenType)
    
    if (authData?.accessToken) {
      console.log('- Access token preview:', authData.accessToken.substring(0, 20) + '...')
    }
    
    if (authData?.tenantId) {
      console.log('- Xero tenant ID:', authData.tenantId)
    }
    
    // Check token expiry if available
    if (authData?.expires_at) {
      const expiresAt = new Date(authData.expires_at * 1000)
      const now = new Date()
      console.log('- Token expires at:', expiresAt.toISOString())
      console.log('- Token expired:', expiresAt < now)
    }
    
  } catch (error) {
    console.error('❌ Error debugging auth:', error)
  }
  
  process.exit(0)
}

debugXeroAuth()
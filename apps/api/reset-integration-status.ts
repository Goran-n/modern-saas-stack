import { bootstrapDependencies } from './src/infrastructure/bootstrap.js'
import { container, TOKENS } from './src/shared/utils/container.js'
import { connectDatabase } from './src/database/connection.js'

const integrationId = '93d0753d-7c2f-49c1-9e14-c1149b68d355'

async function resetIntegrationStatus() {
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
    
    console.log('🔧 Current integration status:', integration.status)
    
    // Reset to active status to allow sync testing
    integration.clearSyncError()
    await integrationRepository.save(integration)
    
    console.log('✅ Integration status reset to active')
    console.log('   Now you can test the sync with token refresh logic')
    
  } catch (error) {
    console.error('❌ Error resetting integration status:', error)
  }
  
  process.exit(0)
}

resetIntegrationStatus()
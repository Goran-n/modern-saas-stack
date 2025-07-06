import { getTwilioConfig } from '../../../config/config'
import log from '../../../config/logger'
import { TwilioWhatsAppService } from './twilio-whatsapp.service'
import type { TwilioWhatsAppConfig } from './twilio-whatsapp.types'

let twilioServiceInstance: TwilioWhatsAppService | null = null

/**
 * Get or create a centralized Twilio WhatsApp service instance
 */
export function getTwilioWhatsAppService(): TwilioWhatsAppService {
  if (!twilioServiceInstance) {
    const config = getTwilioConfig()
    
    if (!config.isConfigured) {
      log.warn('Twilio WhatsApp is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_NUMBER')
    }
    
    const twilioConfig: TwilioWhatsAppConfig = {
      accountSid: config.accountSid,
      authToken: config.authToken,
      whatsappNumber: config.whatsappNumber,
    }
    
    twilioServiceInstance = new TwilioWhatsAppService(twilioConfig, log.child({ service: 'twilio-whatsapp' }))
  }
  
  return twilioServiceInstance
}

/**
 * Clear the cached Twilio service instance (useful for testing)
 */
export function clearTwilioServiceInstance(): void {
  twilioServiceInstance = null
}
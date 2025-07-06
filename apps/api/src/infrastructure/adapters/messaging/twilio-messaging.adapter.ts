import type { Logger } from 'pino'
import type { 
  WhatsAppMessagingService,
  MessageOptions, 
  SendMessageResult 
} from '../../../core/ports/messaging/messaging.service'
import { TwilioWhatsAppService } from '../../../integrations/messaging/twilio/twilio-whatsapp.service'
import type { TwilioWhatsAppConfig } from '../../../integrations/messaging/twilio/twilio-whatsapp.types'

/**
 * Adapter that implements the MessagingService port using Twilio
 */
export class TwilioMessagingAdapter implements WhatsAppMessagingService {
  private twilioService: TwilioWhatsAppService
  
  constructor(
    config: TwilioWhatsAppConfig,
    logger: Logger
  ) {
    this.twilioService = new TwilioWhatsAppService(config, logger)
  }
  
  async sendMessage(to: string, options: MessageOptions): Promise<SendMessageResult> {
    // Convert domain options to Twilio format
    const twilioContent = options.mediaUrl 
      ? { text: options.text, mediaUrls: [options.mediaUrl] }
      : { text: options.text }
    
    return this.twilioService.sendMessage(to, twilioContent)
  }
  
  async sendRegistrationPrompt(to: string): Promise<void> {
    await this.twilioService.sendRegistrationPrompt(to)
  }
  
  async sendVerificationCode(to: string, code: string): Promise<void> {
    await this.twilioService.sendVerificationCode(to, code)
  }
  
  async downloadMedia(mediaUrl: string): Promise<Buffer> {
    return this.twilioService.downloadMedia(mediaUrl)
  }
  
  validatePhoneNumber(phoneNumber: string): boolean {
    // E.164 format validation
    const e164Regex = /^\+[1-9]\d{1,14}$/
    return e164Regex.test(phoneNumber)
  }
  
  formatPhoneNumber(phoneNumber: string, defaultCountryCode: string = '+44'): string | null {
    // Remove all non-digit characters except +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '')
    
    // Handle different formats
    if (cleaned.startsWith('+')) {
      // Already has country code
      if (this.validatePhoneNumber(cleaned)) {
        return cleaned
      }
    } else if (cleaned.startsWith('00')) {
      // International format without +
      cleaned = '+' + cleaned.substring(2)
      if (this.validatePhoneNumber(cleaned)) {
        return cleaned
      }
    } else if (cleaned.startsWith('0')) {
      // Local number - add country code
      cleaned = defaultCountryCode + cleaned.substring(1)
      if (this.validatePhoneNumber(cleaned)) {
        return cleaned
      }
    } else {
      // Try adding country code
      cleaned = defaultCountryCode + cleaned
      if (this.validatePhoneNumber(cleaned)) {
        return cleaned
      }
    }
    
    return null
  }
  
  getSandboxNumber(): string {
    // Twilio sandbox number for development
    return '+14155238886'
  }
  
  async isRegistered(_phoneNumber: string): Promise<boolean> {
    // For now, we can't directly check if a number is registered with WhatsApp
    // This would require additional Twilio APIs or a different approach
    // Return true for now to allow all numbers
    return true
  }
  
  /**
   * Get the underlying Twilio service for operations not covered by the port
   * This should be used sparingly and only in infrastructure layer
   */
  getTwilioService(): TwilioWhatsAppService {
    return this.twilioService
  }
}
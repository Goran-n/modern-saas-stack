import twilio from 'twilio'
import { Twilio } from 'twilio'
import type { Logger } from 'pino'
import type { 
  TwilioWhatsAppConfig, 
  TwilioMessageContent, 
  TwilioSendResult,
  TwilioWebhookData 
} from './twilio-whatsapp.types'

export class TwilioWhatsAppService {
  private client: Twilio | null = null
  
  constructor(
    private config: TwilioWhatsAppConfig,
    private logger: Logger
  ) {
    if (config.accountSid && config.authToken) {
      this.client = twilio(config.accountSid, config.authToken)
    }
  }
  
  private ensureClient(): Twilio {
    if (!this.client) {
      throw new Error('Twilio client not initialized. Please configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN')
    }
    return this.client
  }

  async sendMessage(to: string, content: TwilioMessageContent): Promise<TwilioSendResult> {
    try {
      // Log configuration status
      this.logger.info('Sending WhatsApp message', {
        hasAccountSid: !!this.config.accountSid,
        hasAuthToken: !!this.config.authToken,
        whatsappNumber: this.config.whatsappNumber,
        to
      })
      
      const messageData: any = {
        from: `whatsapp:${this.config.whatsappNumber}`,
        to: `whatsapp:${to}`,
      }

      if (content.text) {
        messageData.body = content.text
      }

      if (content.mediaUrls && content.mediaUrls.length > 0) {
        messageData.mediaUrl = content.mediaUrls
      }

      const client = this.ensureClient()
      const message = await client.messages.create(messageData)
      
      this.logger.info('WhatsApp message sent', {
        messageSid: message.sid,
        to,
        status: message.status,
      })
      
      return {
        success: true,
        messageSid: message.sid,
        status: message.status,
      }
    } catch (error: any) {
      this.logger.error('Failed to send WhatsApp message', { 
        error: error.message,
        code: error.code,
        status: error.status,
        moreInfo: error.moreInfo,
        details: error.details,
        to,
        from: `whatsapp:${this.config.whatsappNumber}`,
        twilioError: {
          name: error.name,
          stack: error.stack,
          response: error.response?.data
        }
      })
      
      return {
        success: false,
        error: error.message || 'Failed to send message',
      }
    }
  }

  async getMessageStatus(messageSid: string): Promise<string | null> {
    try {
      const client = this.ensureClient()
      const message = await client.messages(messageSid).fetch()
      return message.status
    } catch (error) {
      this.logger.error('Failed to get message status', { error, messageSid })
      return null
    }
  }

  async downloadMedia(mediaUrl: string): Promise<Buffer> {
    try {
      this.logger.info('Starting media download', { mediaUrl })
      
      const response = await fetch(mediaUrl, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString('base64')}`
        }
      })
      
      if (!response.ok) {
        this.logger.error('Media download failed', {
          mediaUrl,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        })
        throw new Error(`Failed to download media: ${response.status} ${response.statusText}`)
      }
      
      const contentType = response.headers.get('content-type')
      const contentLength = response.headers.get('content-length')
      
      this.logger.info('Media response received', {
        mediaUrl,
        contentType,
        contentLength,
        status: response.status
      })
      
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      this.logger.info('Media downloaded successfully', {
        mediaUrl,
        bufferSize: buffer.length,
        contentType
      })
      
      return buffer
    } catch (error) {
      this.logger.error('Failed to download media', { 
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error,
        mediaUrl 
      })
      throw error
    }
  }

  validateWebhookSignature(
    signature: string | undefined,
    url: string,
    params: Record<string, any>
  ): boolean {
    if (!signature) return false
    
    if (!this.config.authToken) {
      this.logger.warn('Cannot validate webhook signature: auth token not configured')
      return false
    }
    
    try {
      return twilio.validateRequest(
        this.config.authToken,
        signature,
        url,
        params
      )
    } catch (error) {
      this.logger.error('Failed to validate webhook signature', { error })
      return false
    }
  }
  
  async testConnection(): Promise<boolean> {
    try {
      const client = this.ensureClient()
      // Try to fetch account details to verify credentials
      const account = await client.api.v2010.accounts(this.config.accountSid).fetch()
      this.logger.info('Twilio connection test successful', { accountSid: account.sid })
      return true
    } catch (error) {
      this.logger.error('Twilio connection test failed', { error })
      return false
    }
  }

  extractMediaUrls(webhookData: TwilioWebhookData): string[] {
    const urls: string[] = []
    const numMedia = parseInt(webhookData.NumMedia || '0')
    
    for (let i = 0; i < numMedia; i++) {
      const url = webhookData[`MediaUrl${i}`]
      if (url) {
        urls.push(url)
      }
    }
    
    return urls
  }

  parsePhoneNumber(twilioNumber: string): string {
    // Remove whatsapp: prefix if present
    return twilioNumber.replace('whatsapp:', '')
  }

  formatPhoneNumber(phoneNumber: string): string {
    // Ensure phone number has whatsapp: prefix
    if (!phoneNumber.startsWith('whatsapp:')) {
      return `whatsapp:${phoneNumber}`
    }
    return phoneNumber
  }

  async sendVerificationCode(phoneNumber: string, code: string): Promise<TwilioSendResult> {
    const message = `Your Kibly verification code is: ${code}\n\nThis code will expire in 10 minutes.`
    return this.sendMessage(phoneNumber, { text: message })
  }
  
  async sendWelcomeMessage(phoneNumber: string): Promise<TwilioSendResult> {
    const message = `Welcome to Kibly! 🎉\n\nYour WhatsApp is now connected. You can send me PDF documents and I'll help you process them.\n\nNote: I currently only support PDF files. Other file types will be ignored.\n\nTo get started, just send me any PDF file!`
    return this.sendMessage(phoneNumber, { text: message })
  }
  
  async sendRegistrationPrompt(phoneNumber: string): Promise<TwilioSendResult> {
    const message = `Hello! I'm Kibly, your document assistant. 👋\n\nTo get started, please reply with your email address so I can link your account.`
    return this.sendMessage(phoneNumber, { text: message })
  }
}
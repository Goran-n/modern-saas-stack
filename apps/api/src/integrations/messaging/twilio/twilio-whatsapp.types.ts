export interface TwilioWhatsAppConfig {
  accountSid: string
  authToken: string
  whatsappNumber: string // Twilio WhatsApp number (without whatsapp: prefix)
}

export interface TwilioMessageContent {
  text?: string
  mediaUrls?: string[]
}

export interface TwilioSendResult {
  success: boolean
  messageSid?: string
  status?: string
  error?: string
}

export interface TwilioWebhookData {
  MessageSid: string
  From: string
  To: string
  Body?: string
  NumMedia?: string
  [key: string]: any // For MediaUrl0, MediaUrl1, etc.
}

export interface TwilioMediaData {
  url: string
  contentType?: string
  size?: number
}
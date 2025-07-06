/**
 * Domain port for messaging services
 * This abstraction allows the domain to send messages without knowing about specific providers
 */

export interface MessageOptions {
  text: string
  mediaUrl?: string
}

export interface SendMessageResult {
  success: boolean
  messageSid?: string
  status?: string
  error?: string
}

export interface MessagingService {
  /**
   * Send a message to a recipient
   * @param to The recipient's phone number (E.164 format)
   * @param options Message content and options
   * @returns Result of the send operation
   */
  sendMessage(to: string, options: MessageOptions): Promise<SendMessageResult>
  
  /**
   * Send a registration prompt to an unknown number
   * @param to The recipient's phone number (E.164 format)
   */
  sendRegistrationPrompt(to: string): Promise<void>
  
  /**
   * Send a verification code
   * @param to The recipient's phone number (E.164 format)
   * @param code The verification code to send
   */
  sendVerificationCode(to: string, code: string): Promise<void>
  
  /**
   * Download media from a URL
   * @param mediaUrl The URL of the media to download
   * @returns The media content as a buffer
   */
  downloadMedia(mediaUrl: string): Promise<Buffer>
  
  /**
   * Validate that a phone number is in the correct format
   * @param phoneNumber The phone number to validate
   * @returns True if valid, false otherwise
   */
  validatePhoneNumber(phoneNumber: string): boolean
  
  /**
   * Format a phone number to E.164 format
   * @param phoneNumber The phone number to format
   * @param defaultCountryCode The default country code if not provided
   * @returns The formatted phone number or null if invalid
   */
  formatPhoneNumber(phoneNumber: string, defaultCountryCode?: string): string | null
}

/**
 * WhatsApp-specific messaging service extension
 */
export interface WhatsAppMessagingService extends MessagingService {
  /**
   * Get the WhatsApp sandbox number for development
   */
  getSandboxNumber(): string
  
  /**
   * Check if a number is registered with WhatsApp
   * @param phoneNumber The phone number to check
   */
  isRegistered(phoneNumber: string): Promise<boolean>
}
import { VerificationCode } from '../value-objects/verification-code'

export interface VerificationCodeConfig {
  codeLength?: number
  expiryMinutes?: number
  maxAttempts?: number
  cooldownMinutes?: number
}

export class VerificationCodeService {
  private readonly DEFAULT_EXPIRY_MINUTES = 10
  private readonly DEFAULT_MAX_ATTEMPTS = 3
  private readonly DEFAULT_COOLDOWN_MINUTES = 5

  constructor(private readonly config: VerificationCodeConfig = {}) {}

  /**
   * Generate a new verification code
   */
  generateCode(): VerificationCode {
    const expiryMinutes = this.config.expiryMinutes || this.DEFAULT_EXPIRY_MINUTES
    return VerificationCode.generate(expiryMinutes)
  }

  /**
   * Generate a custom alphanumeric code (for non-SMS channels)
   */
  generateAlphanumericCode(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  /**
   * Verify a code with attempt tracking
   */
  verifyCode(
    code: VerificationCode,
    inputCode: string,
    attempts: number = 0
  ): VerificationResult {
    // Check if too many attempts
    const maxAttempts = this.config.maxAttempts || this.DEFAULT_MAX_ATTEMPTS
    if (attempts >= maxAttempts) {
      return {
        success: false,
        reason: 'too_many_attempts',
        remainingAttempts: 0
      }
    }

    // Check if expired
    if (code.isExpired()) {
      return {
        success: false,
        reason: 'expired',
        remainingAttempts: 0
      }
    }

    // Check if valid
    if (!code.isValid(inputCode)) {
      return {
        success: false,
        reason: 'invalid_code',
        remainingAttempts: maxAttempts - attempts - 1
      }
    }

    return {
      success: true,
      reason: 'valid',
      remainingAttempts: 0
    }
  }

  /**
   * Check if enough time has passed for resend (cooldown period)
   */
  canResendCode(lastSentAt: Date): boolean {
    const cooldownMinutes = this.config.cooldownMinutes || this.DEFAULT_COOLDOWN_MINUTES
    const cooldownMs = cooldownMinutes * 60 * 1000
    const now = new Date()
    
    return (now.getTime() - lastSentAt.getTime()) >= cooldownMs
  }

  /**
   * Get remaining cooldown time in seconds
   */
  getRemainingCooldownSeconds(lastSentAt: Date): number {
    const cooldownMinutes = this.config.cooldownMinutes || this.DEFAULT_COOLDOWN_MINUTES
    const cooldownMs = cooldownMinutes * 60 * 1000
    const now = new Date()
    const elapsedMs = now.getTime() - lastSentAt.getTime()
    
    if (elapsedMs >= cooldownMs) {
      return 0
    }
    
    return Math.ceil((cooldownMs - elapsedMs) / 1000)
  }
}

export interface VerificationResult {
  success: boolean
  reason: 'valid' | 'invalid_code' | 'expired' | 'too_many_attempts'
  remainingAttempts: number
}

export class TooManyVerificationAttemptsError extends Error {
  constructor() {
    super('Too many verification attempts. Please request a new code.')
    this.name = 'TooManyVerificationAttemptsError'
  }
}

export class VerificationCooldownError extends Error {
  constructor(remainingSeconds: number) {
    super(`Please wait ${remainingSeconds} seconds before requesting a new code`)
    this.name = 'VerificationCooldownError'
  }
}
export class VerificationCode {
  private static readonly CODE_LENGTH = 6
  private static readonly CODE_PATTERN = /^\d{6}$/
  
  constructor(
    public readonly code: string,
    public readonly expiresAt: Date
  ) {
    this.validate()
  }

  static generate(expiryMinutes: number = 10): VerificationCode {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes)
    
    return new VerificationCode(code, expiresAt)
  }

  static from(code: string, expiresAt: Date): VerificationCode {
    return new VerificationCode(code, expiresAt)
  }

  isValid(inputCode: string): boolean {
    return this.code === inputCode && !this.isExpired()
  }

  isExpired(): boolean {
    return new Date() > this.expiresAt
  }

  getRemainingMinutes(): number {
    const now = new Date()
    const diffMs = this.expiresAt.getTime() - now.getTime()
    return Math.max(0, Math.floor(diffMs / 60000))
  }

  equals(other: VerificationCode): boolean {
    return this.code === other.code && 
           this.expiresAt.getTime() === other.expiresAt.getTime()
  }

  toString(): string {
    return this.code
  }

  private validate(): void {
    if (!VerificationCode.CODE_PATTERN.test(this.code)) {
      throw new InvalidVerificationCodeError(
        `Verification code must be exactly ${VerificationCode.CODE_LENGTH} digits`
      )
    }
    
    if (!(this.expiresAt instanceof Date) || isNaN(this.expiresAt.getTime())) {
      throw new InvalidVerificationCodeError('Invalid expiration date')
    }
  }
}

export class InvalidVerificationCodeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidVerificationCodeError'
  }
}

export class VerificationCodeExpiredError extends Error {
  constructor() {
    super('Verification code has expired')
    this.name = 'VerificationCodeExpiredError'
  }
}
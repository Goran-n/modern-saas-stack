export class Phone {
  private readonly value: string

  constructor(value: string) {
    if (!this.isValid(value)) {
      throw new InvalidPhoneError(value)
    }
    this.value = this.normalize(value)
  }

  static from(value: string): Phone {
    return new Phone(value)
  }

  toString(): string {
    return this.value
  }

  equals(other: Phone): boolean {
    return this.value === other.value
  }

  format(): string {
    // Format as international number
    return this.value
  }

  toNational(): string {
    // Remove country code for national format
    if (this.value.startsWith('+1')) {
      return this.value.slice(2)
    }
    return this.value.slice(1)
  }

  private isValid(phone: string): boolean {
    // E.164 format: +[country code][number] (max 15 digits)
    const e164Regex = /^\+[1-9]\d{1,14}$/
    return e164Regex.test(phone)
  }

  private normalize(phone: string): string {
    // Remove any spaces, dashes, parentheses, but keep the +
    return phone.replace(/[\s\-()]/g, '')
  }
}

export class InvalidPhoneError extends Error {
  constructor(value: string) {
    super(`Invalid phone number: ${value}`)
    this.name = 'InvalidPhoneError'
  }
}
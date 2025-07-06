export class Email {
  private readonly value: string

  constructor(value: string) {
    if (!this.isValid(value)) {
      throw new InvalidEmailError(value)
    }
    this.value = value.toLowerCase().trim()
  }

  static from(value: string): Email {
    return new Email(value)
  }

  toString(): string {
    return this.value
  }

  equals(other: Email): boolean {
    return this.value === other.value
  }

  private isValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && email.length <= 254
  }
}

export class InvalidEmailError extends Error {
  constructor(value: string) {
    super(`Invalid email address: ${value}`)
    this.name = 'InvalidEmailError'
  }
}
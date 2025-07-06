
/**
 * Money value object for handling monetary amounts with proper precision
 * Uses string representation internally to avoid floating point issues
 */
export class Money {
  private readonly amount: string
  private readonly currency: string
  
  constructor(amount: string | number, currency: string) {
    // Validate currency code (ISO 4217)
    if (!this.isValidCurrency(currency)) {
      throw new InvalidCurrencyError(currency)
    }
    
    // Convert to string and validate
    const amountStr = String(amount)
    if (!this.isValidAmount(amountStr)) {
      throw new InvalidMoneyAmountError(amountStr)
    }
    
    this.amount = this.normalizeAmount(amountStr)
    this.currency = currency.toUpperCase()
  }
  
  static zero(currency: string): Money {
    return new Money('0', currency)
  }
  
  static fromCents(cents: number, currency: string): Money {
    // Convert cents to decimal amount
    const amount = (cents / 100).toFixed(2)
    return new Money(amount, currency)
  }
  
  add(other: Money): Money {
    this.assertSameCurrency(other)
    const sum = parseFloat(this.amount) + parseFloat(other.amount)
    return new Money(sum.toFixed(2), this.currency)
  }
  
  subtract(other: Money): Money {
    this.assertSameCurrency(other)
    const difference = parseFloat(this.amount) - parseFloat(other.amount)
    return new Money(difference.toFixed(2), this.currency)
  }
  
  multiply(multiplier: number): Money {
    const result = parseFloat(this.amount) * multiplier
    return new Money(result.toFixed(2), this.currency)
  }
  
  divide(divisor: number): Money {
    if (divisor === 0) {
      throw new Error('Cannot divide by zero')
    }
    const result = parseFloat(this.amount) / divisor
    return new Money(result.toFixed(2), this.currency)
  }
  
  isPositive(): boolean {
    return parseFloat(this.amount) > 0
  }
  
  isNegative(): boolean {
    return parseFloat(this.amount) < 0
  }
  
  isZero(): boolean {
    return parseFloat(this.amount) === 0
  }
  
  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency
  }
  
  greaterThan(other: Money): boolean {
    this.assertSameCurrency(other)
    return parseFloat(this.amount) > parseFloat(other.amount)
  }
  
  lessThan(other: Money): boolean {
    this.assertSameCurrency(other)
    return parseFloat(this.amount) < parseFloat(other.amount)
  }
  
  greaterThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other)
    return parseFloat(this.amount) >= parseFloat(other.amount)
  }
  
  lessThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other)
    return parseFloat(this.amount) <= parseFloat(other.amount)
  }
  
  negate(): Money {
    const negated = parseFloat(this.amount) * -1
    return new Money(negated.toFixed(2), this.currency)
  }
  
  absolute(): Money {
    const abs = Math.abs(parseFloat(this.amount))
    return new Money(abs.toFixed(2), this.currency)
  }
  
  toCents(): number {
    return Math.round(parseFloat(this.amount) * 100)
  }
  
  toNumber(): number {
    return parseFloat(this.amount)
  }
  
  toString(): string {
    return this.amount
  }
  
  format(locale: string = 'en-US'): string {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    return formatter.format(parseFloat(this.amount))
  }
  
  getCurrency(): string {
    return this.currency
  }
  
  toJSON(): { amount: string; currency: string } {
    return {
      amount: this.amount,
      currency: this.currency,
    }
  }
  
  private isValidCurrency(currency: string): boolean {
    // Basic validation for 3-letter currency codes
    return /^[A-Z]{3}$/i.test(currency)
  }
  
  private isValidAmount(amount: string): boolean {
    // Allow negative numbers, decimals
    return /^-?\d+(\.\d{0,2})?$/.test(amount)
  }
  
  private normalizeAmount(amount: string): string {
    // Ensure 2 decimal places
    const num = parseFloat(amount)
    return num.toFixed(2)
  }
  
  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchError(this.currency, other.currency)
    }
  }
}

export class InvalidMoneyAmountError extends Error {
  constructor(amount: string) {
    super(`Invalid money amount: ${amount}`)
    this.name = 'InvalidMoneyAmountError'
  }
}

export class InvalidCurrencyError extends Error {
  constructor(currency: string) {
    super(`Invalid currency code: ${currency}`)
    this.name = 'InvalidCurrencyError'
  }
}

export class CurrencyMismatchError extends Error {
  constructor(currency1: string, currency2: string) {
    super(`Currency mismatch: ${currency1} vs ${currency2}`)
    this.name = 'CurrencyMismatchError'
  }
}

// Common currency codes
export const CURRENCY_CODES = {
  USD: 'USD', // US Dollar
  EUR: 'EUR', // Euro
  GBP: 'GBP', // British Pound
  JPY: 'JPY', // Japanese Yen
  AUD: 'AUD', // Australian Dollar
  CAD: 'CAD', // Canadian Dollar
  CHF: 'CHF', // Swiss Franc
  CNY: 'CNY', // Chinese Yuan
  NZD: 'NZD', // New Zealand Dollar
  INR: 'INR', // Indian Rupee
} as const

export type CurrencyCode = typeof CURRENCY_CODES[keyof typeof CURRENCY_CODES]
export class Slug {
  private static readonly MIN_LENGTH = 3
  private static readonly MAX_LENGTH = 50
  private static readonly VALID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  
  private static readonly RESERVED_SLUGS = new Set([
    'api', 'admin', 'www', 'app', 'dashboard', 'auth',
    'login', 'register', 'signup', 'settings', 'billing',
    'support', 'help', 'docs', 'blog', 'about', 'contact',
    'privacy', 'terms', 'kibly', 'system', 'root',
    'null', 'undefined'
  ])

  private constructor(public readonly value: string) {
    this.validate()
  }

  static from(value: string): Slug {
    return new Slug(value)
  }

  static generate(input: string): Slug {
    const slugValue = input
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces, underscores with hyphens
      .replace(/^-+|-+$/g, '')  // Remove leading/trailing hyphens

    return new Slug(slugValue || 'default')
  }

  equals(other: Slug): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }

  private validate(): void {
    if (!this.value || this.value.length < Slug.MIN_LENGTH) {
      throw new InvalidSlugError(`Slug must be at least ${Slug.MIN_LENGTH} characters`)
    }
    
    if (this.value.length > Slug.MAX_LENGTH) {
      throw new InvalidSlugError(`Slug must not exceed ${Slug.MAX_LENGTH} characters`)
    }
    
    if (!Slug.VALID_PATTERN.test(this.value)) {
      throw new InvalidSlugError(
        'Slug must contain only lowercase letters, numbers, and hyphens (no consecutive hyphens)'
      )
    }
    
    if (Slug.RESERVED_SLUGS.has(this.value)) {
      throw new InvalidSlugError(`Slug "${this.value}" is reserved and cannot be used`)
    }
  }
}

export class InvalidSlugError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidSlugError'
  }
}
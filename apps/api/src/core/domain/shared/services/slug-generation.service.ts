import { Slug } from '../value-objects/slug'

export interface SlugChecker {
  isAvailable(slug: string): Promise<boolean>
}

export class SlugGenerationService {
  private readonly MAX_ATTEMPTS = 100

  async generateUniqueSlug(
    name: string,
    checker: SlugChecker
  ): Promise<Slug> {
    // Generate base slug from name
    const baseSlug = Slug.generate(name)
    
    // Check if base slug is available
    if (await checker.isAvailable(baseSlug.value)) {
      return baseSlug
    }

    // Try with incrementing numbers
    for (let i = 1; i <= this.MAX_ATTEMPTS; i++) {
      const numberedSlugValue = `${baseSlug.value}-${i}`
      const numberedSlug = Slug.from(numberedSlugValue)
      
      if (await checker.isAvailable(numberedSlug.value)) {
        return numberedSlug
      }
    }

    throw new UnableToGenerateUniqueSlugError(name)
  }

  /**
   * Generate a slug with a custom suffix (useful for different strategies)
   */
  async generateWithSuffix(
    name: string,
    suffix: string,
    checker: SlugChecker
  ): Promise<Slug> {
    const baseSlug = Slug.generate(name)
    const slugWithSuffix = Slug.from(`${baseSlug.value}-${suffix}`)
    
    if (await checker.isAvailable(slugWithSuffix.value)) {
      return slugWithSuffix
    }
    
    // If not available, fall back to number strategy
    return this.generateUniqueSlug(`${name}-${suffix}`, checker)
  }

  /**
   * Generate a slug with timestamp suffix for guaranteed uniqueness
   */
  generateWithTimestamp(name: string): Slug {
    const baseSlug = Slug.generate(name)
    const timestamp = Date.now().toString(36) // Base36 for shorter string
    return Slug.from(`${baseSlug.value}-${timestamp}`)
  }
}

export class UnableToGenerateUniqueSlugError extends Error {
  constructor(name: string) {
    super(`Unable to generate unique slug for "${name}" after maximum attempts`)
    this.name = 'UnableToGenerateUniqueSlugError'
  }
}
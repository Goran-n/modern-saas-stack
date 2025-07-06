export interface ValidationRule<T = any> {
  validate: (value: T) => boolean
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function createValidator<T>(rules: ValidationRule<T>[]): (value: T) => ValidationResult {
  return (value: T): ValidationResult => {
    const errors: string[] = []
    
    for (const rule of rules) {
      if (!rule.validate(value)) {
        errors.push(rule.message)
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// Common validation rules
export const required = (message = 'This field is required'): ValidationRule<any> => ({
  validate: (value) => value !== null && value !== undefined && value !== '',
  message
})

export const email = (message = 'Please enter a valid email'): ValidationRule<string> => ({
  validate: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  },
  message
})

export const minLength = (min: number, message?: string): ValidationRule<string> => ({
  validate: (value) => value.length >= min,
  message: message || `Must be at least ${min} characters`
})

export const maxLength = (max: number, message?: string): ValidationRule<string> => ({
  validate: (value) => value.length <= max,
  message: message || `Must be no more than ${max} characters`
})

export const pattern = (regex: RegExp, message: string): ValidationRule<string> => ({
  validate: (value) => regex.test(value),
  message
})

export const numeric = (message = 'Must be a number'): ValidationRule<string> => ({
  validate: (value) => !isNaN(Number(value)),
  message
})

export const minValue = (min: number, message?: string): ValidationRule<number> => ({
  validate: (value) => value >= min,
  message: message || `Must be at least ${min}`
})

export const maxValue = (max: number, message?: string): ValidationRule<number> => ({
  validate: (value) => value <= max,
  message: message || `Must be no more than ${max}`
})

// Form validation helper
export function validateForm<T extends Record<string, any>>(
  data: T,
  validators: Partial<Record<keyof T, ValidationRule<any>[]>>
): Record<keyof T, ValidationResult> {
  const results = {} as Record<keyof T, ValidationResult>
  
  for (const field in validators) {
    const rules = validators[field]
    if (rules) {
      const validator = createValidator(rules)
      results[field] = validator(data[field])
    }
  }
  
  return results
}

export function isFormValid<T extends Record<string, any>>(
  results: Record<keyof T, ValidationResult>
): boolean {
  return Object.values(results).every((result) => result.valid)
}

export function getFirstError<T extends Record<string, any>>(
  results: Record<keyof T, ValidationResult>
): string | null {
  for (const result of Object.values(results)) {
    if (!result.valid && result.errors.length > 0) {
      return result.errors[0]
    }
  }
  return null
}
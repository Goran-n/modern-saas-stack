import { createError, type SupplierError } from '../errors';

// Country-specific validation patterns
const VAT_PATTERNS: Record<string, RegExp> = {
  GB: /^GB\d{9}(\d{3})?$/,
  IE: /^IE\d{7}[A-Z]{1,2}$/,
  FR: /^FR[A-Z0-9]{2}\d{9}$/,
  DE: /^DE\d{9}$/,
  NL: /^NL\d{9}B\d{2}$/,
  ES: /^ES[A-Z]\d{7}[A-Z0-9]$/,
  IT: /^IT\d{11}$/,
  // Add more as needed
};

const COMPANY_NUMBER_PATTERNS: Record<string, RegExp> = {
  GB: /^(?:\d{8}|[A-Z]{2}\d{6})$/, // UK: 8 digits or 2 letters + 6 digits
  IE: /^\d{6}$/, // Ireland: 6 digits
  // Add more as needed
};


export interface ValidationResult {
  isValid: boolean;
  errors: SupplierError[];
  warnings: SupplierError[];
  errorMessages: string[]; // For backward compatibility
  confidence: number;
  enhancedData?: {
    normalizedName?: string;
    country?: string;
    validatedVat?: string;
    validatedCompanyNumber?: string;
  };
}

export class SupplierValidator {
  /**
   * Validate supplier data quality
   */
  static validate(data: {
    name: string;
    companyNumber?: string | null;
    vatNumber?: string | null;
    country?: string;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
  }): ValidationResult {
    const errors: SupplierError[] = [];
    const warnings: SupplierError[] = [];
    const enhancedData: ValidationResult['enhancedData'] = {};
    
    // Name validation
    const nameValidation = this.validateName(data.name);
    if (!nameValidation.isValid) {
      errors.push(...nameValidation.errors);
    } else if (nameValidation.normalized) {
      enhancedData.normalizedName = nameValidation.normalized;
    }
    
    // Identifier validation
    const hasValidIdentifier = this.validateIdentifiers(
      data.companyNumber,
      data.vatNumber,
      data.country,
      errors,
      warnings,
      enhancedData
    );
    
    if (!hasValidIdentifier) {
      errors.push(createError.missingIdentifier());
    }
    
    // Contact validation
    if (data.email) {
      const emailValid = this.validateEmail(data.email);
      if (!emailValid) {
        warnings.push(createError.invalidEmail(data.email));
      }
    }
    
    if (data.phone) {
      const phoneValid = this.validatePhone(data.phone);
      if (!phoneValid) {
        warnings.push(createError.invalidPhone(data.phone));
      }
    }
    
    if (data.website) {
      const websiteValid = this.validateWebsite(data.website);
      if (!websiteValid) {
        warnings.push(createError.invalidWebsite(data.website));
      }
    }
    
    // Calculate confidence score
    const confidence = this.calculateConfidence(
      errors.length,
      warnings.length,
      hasValidIdentifier,
      data
    );
    
    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      errorMessages: errors.map(e => e.message), // For backward compatibility
      confidence,
    };
    
    if (Object.keys(enhancedData).length > 0) {
      result.enhancedData = enhancedData;
    }
    
    return result;
  }
  
  private static validateName(name: string): {
    isValid: boolean;
    errors: SupplierError[];
    normalized?: string;
  } {
    const errors: SupplierError[] = [];
    
    // Basic checks
    if (name.length < 2) {
      errors.push(createError.nameTooShort(name));
    }
    
    if (name.length > 200) {
      errors.push(createError.nameTooLong(name));
    }
    
    const normalizedName = name.toLowerCase().trim();
    
    // Check if name is just numbers or special characters
    if (!/[a-zA-Z]/.test(name)) {
      errors.push(createError.nameNoLetters(name));
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      normalized: normalizedName,
    };
  }
  
  private static validateIdentifiers(
    companyNumber: string | null | undefined,
    vatNumber: string | null | undefined,
    country: string = 'GB',
    _errors: SupplierError[],
    warnings: SupplierError[],
    enhancedData: ValidationResult['enhancedData']
  ): boolean {
    let hasValidIdentifier = false;
    
    // Validate company number
    if (companyNumber) {
      const pattern = COMPANY_NUMBER_PATTERNS[country];
      if (pattern) {
        const cleaned = companyNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        if (pattern.test(cleaned)) {
          hasValidIdentifier = true;
          enhancedData!.validatedCompanyNumber = cleaned;
        } else {
          warnings.push(createError.invalidCompanyNumber(companyNumber, country));
        }
      } else {
        // No specific pattern, accept if reasonable
        if (companyNumber.length >= 4 && companyNumber.length <= 20) {
          hasValidIdentifier = true;
          enhancedData!.validatedCompanyNumber = companyNumber;
        }
      }
    }
    
    // Validate VAT number
    if (vatNumber) {
      const cleaned = vatNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      let vatCountry = country;
      
      // Extract country from VAT number
      const vatPrefix = cleaned.substring(0, 2);
      if (/^[A-Z]{2}/.test(vatPrefix)) {
        vatCountry = vatPrefix;
      }
      
      const pattern = VAT_PATTERNS[vatCountry];
      if (pattern) {
        if (pattern.test(cleaned)) {
          hasValidIdentifier = true;
          enhancedData!.validatedVat = cleaned;
          enhancedData!.country = vatCountry;
        } else {
          warnings.push(createError.invalidVatNumber(vatNumber, vatCountry));
        }
      } else {
        // No specific pattern, basic validation
        if (cleaned.length >= 8 && cleaned.length <= 15) {
          hasValidIdentifier = true;
          enhancedData!.validatedVat = cleaned;
        }
      }
    }
    
    return hasValidIdentifier;
  }
  
  private static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  private static validatePhone(phone: string): boolean {
    // Basic phone validation - at least 7 digits
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length >= 7 && digitsOnly.length <= 20;
  }
  
  private static validateWebsite(website: string): boolean {
    try {
      const url = new URL(website.startsWith('http') ? website : `https://${website}`);
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  }
  
  private static calculateConfidence(
    errorCount: number,
    warningCount: number,
    hasValidIdentifier: boolean,
    data: any
  ): number {
    let confidence = 100;
    
    // Deduct for errors
    confidence -= errorCount * 20;
    
    // Deduct for warnings
    confidence -= warningCount * 5;
    
    // Boost for identifiers
    if (data.companyNumber && data.vatNumber) {
      confidence = Math.min(100, confidence + 10);
    } else if (!hasValidIdentifier) {
      confidence -= 30;
    }
    
    // Boost for complete data
    if (data.email) confidence += 5;
    if (data.phone) confidence += 5;
    if (data.website) confidence += 5;
    
    return Math.max(0, Math.min(100, confidence));
  }
}
import type { AccountingDocument, FieldWithConfidence } from "./types";
import type { CompanyConfig, ExtractedFields } from "@figgy/shared-db";
import { createLogger } from "@figgy/utils";

const logger = createLogger("document-validators");

// Currency validation
const ISO_CURRENCIES = new Set([
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CHF",
  "CAD",
  "AUD",
  "NZD",
  "CNY",
  "INR",
  "KRW",
  "SGD",
  "HKD",
  "NOK",
  "SEK",
  "DKK",
  "PLN",
  "CZK",
  "HUF",
  "RON",
  "BGN",
  "HRK",
  "RUB",
  "TRY",
  "BRL",
  "MXN",
  "ARS",
  "CLP",
  "COP",
  "PEN",
  "UYU",
  "ZAR",
  "THB",
  "MYR",
  "IDR",
  "PHP",
  "VND",
  "EGP",
  "PKR",
  "ILS",
  "AED",
  "SAR",
  "QAR",
  "KWD",
  "BHD",
  "OMR",
  "JOD",
  "KES",
  "NGN",
  "GHS",
  "MAD",
  "TND",
  "ETB",
  "UGX",
  "TZS",
  "XOF",
  "XAF",
]);

export function validateCurrency(currency: string): boolean {
  return ISO_CURRENCIES.has(currency.toUpperCase());
}

// Email validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// VAT number validation (basic)
export function validateVATNumber(vatNumber: string): boolean {
  // Basic EU VAT format: 2 letter country code + numbers
  const vatRegex = /^[A-Z]{2}[0-9A-Z]+$/;
  return vatRegex.test(vatNumber.toUpperCase());
}

// Date validation
export function validateISODate(date: string): boolean {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoDateRegex.test(date)) return false;

  const parsedDate = new Date(date);
  return !Number.isNaN(parsedDate.getTime());
}

// Amount validation
export function validateAmount(amount: number): boolean {
  return amount >= 0 && Number.isFinite(amount);
}

// Critical fields validation
export function validateCriticalFields(document: AccountingDocument): {
  isValid: boolean;
  missingFields: string[];
  invalidFields: string[];
} {
  const missingFields: string[] = [];
  const invalidFields: string[] = [];

  // Check required fields
  if (!document.totalAmount && document.totalAmount !== 0) {
    missingFields.push("totalAmount");
  } else if (!validateAmount(document.totalAmount)) {
    invalidFields.push("totalAmount");
  }

  if (!document.currency) {
    missingFields.push("currency");
  } else if (!validateCurrency(document.currency)) {
    invalidFields.push("currency");
  }

  if (!document.vendorName) {
    missingFields.push("vendorName");
  }

  if (!document.documentDate && !document.dueDate) {
    missingFields.push("documentDate or dueDate");
  } else {
    if (document.documentDate && !validateISODate(document.documentDate)) {
      invalidFields.push("documentDate");
    }
    if (document.dueDate && !validateISODate(document.dueDate)) {
      invalidFields.push("dueDate");
    }
  }

  // Validate optional fields if present
  if (document.vendorEmail && !validateEmail(document.vendorEmail)) {
    invalidFields.push("vendorEmail");
  }

  if (document.customerEmail && !validateEmail(document.customerEmail)) {
    invalidFields.push("customerEmail");
  }

  if (document.vendorTaxId && !validateVATNumber(document.vendorTaxId)) {
    // Don't mark as invalid, just lower confidence
  }

  return {
    isValid: missingFields.length === 0 && invalidFields.length === 0,
    missingFields,
    invalidFields,
  };
}

// Confidence adjustment based on validation
export function adjustConfidenceForValidation(
  field: FieldWithConfidence,
  isValid: boolean,
): FieldWithConfidence {
  if (!isValid) {
    return {
      ...field,
      confidence: Math.max(field.confidence * 0.7, 30), // Reduce confidence by 30%
    };
  }
  return field;
}

// Calculate checksum for line items
export function validateLineItemsTotal(
  lineItems: Array<{ totalPrice: number | null }>,
  subtotal: number,
): boolean {
  const calculatedTotal = lineItems.reduce(
    (sum, item) => sum + (item.totalPrice || 0),
    0,
  );

  // Allow 1% tolerance for rounding errors
  const tolerance = subtotal * 0.01;
  return Math.abs(calculatedTotal - subtotal) <= tolerance;
}

// Invoice ownership validation types
export interface OwnershipValidation {
  belongsToTenant: boolean;
  confidence: number; // 0-100
  matchType: 'exact' | 'trading_name' | 'subsidiary' | 'historical' | 'no_match' | 'uncertain';
  reasoning: string;
  evidence: {
    directMatches: string[];
    llmAnalysis?: string;
    riskFactors: string[];
  };
  requiresReview: boolean;
  suggestedAction: 'process' | 'review' | 'reject';
}

interface DirectMatchResult {
  isDefinitive: boolean;
  result?: OwnershipValidation;
}

// Check direct matches for fast validation
function checkDirectMatches(
  extractedFields: ExtractedFields,
  config: CompanyConfig
): DirectMatchResult {
  const customerVAT = extractedFields.customerTaxId?.value as string | undefined;
  const customerCompanyNumber = extractedFields.customerCompanyNumber?.value as string | undefined;
  
  // Exact VAT match = definitive
  if (customerVAT && config.identifiers.vatNumbers.length > 0) {
    const activeVATs = config.identifiers.vatNumbers
      .filter(v => v.isActive)
      .map(v => v.number);
    
    if (activeVATs.includes(customerVAT)) {
      return {
        isDefinitive: true,
        result: {
          belongsToTenant: true,
          confidence: 100,
          matchType: 'exact',
          reasoning: 'VAT number exactly matches company records',
          evidence: {
            directMatches: [`VAT: ${customerVAT}`],
            riskFactors: []
          },
          requiresReview: false,
          suggestedAction: 'process'
        }
      };
    }
    
    // Different VAT = definitive rejection
    return {
      isDefinitive: true,
      result: {
        belongsToTenant: false,
        confidence: 100,
        matchType: 'no_match',
        reasoning: 'VAT number belongs to different company',
        evidence: {
          directMatches: [],
          riskFactors: [`Invoice VAT ${customerVAT} not in company records`]
        },
        requiresReview: true,
        suggestedAction: 'reject'
      }
    };
  }
  
  // Company number match = definitive
  if (customerCompanyNumber && config.identifiers.companyNumbers.length > 0) {
    const companyNumbers = config.identifiers.companyNumbers.map(c => c.number);
    
    if (companyNumbers.includes(customerCompanyNumber)) {
      return {
        isDefinitive: true,
        result: {
          belongsToTenant: true,
          confidence: 100,
          matchType: 'exact',
          reasoning: 'Company number exactly matches',
          evidence: {
            directMatches: [`Company #: ${customerCompanyNumber}`],
            riskFactors: []
          },
          requiresReview: false,
          suggestedAction: 'process'
        }
      };
    }
  }
  
  // No definitive match
  return { isDefinitive: false };
}

// Main invoice ownership validation function
export async function validateInvoiceOwnership(
  extractedFields: ExtractedFields,
  companyConfig: CompanyConfig,
  invoiceDate: Date,
  llmProvider?: (prompt: string) => Promise<string>
): Promise<OwnershipValidation> {
  
  logger.info("Validating invoice ownership", {
    customerName: extractedFields.customerName?.value,
    customerVAT: extractedFields.customerTaxId?.value,
    invoiceDate
  });
  
  // Step 1: Try direct matches first (fast path)
  const directMatch = checkDirectMatches(extractedFields, companyConfig);
  if (directMatch.isDefinitive && directMatch.result) {
    logger.info("Direct match found", { 
      matchType: directMatch.result.matchType,
      confidence: directMatch.result.confidence 
    });
    return directMatch.result;
  }
  
  // Step 2: If no LLM provider, return uncertain result
  if (!llmProvider) {
    logger.warn("No LLM provider available for fuzzy matching");
    return {
      belongsToTenant: false,
      confidence: 0,
      matchType: 'uncertain',
      reasoning: 'Unable to validate without LLM analysis',
      evidence: {
        directMatches: [],
        riskFactors: ['No direct identifier match', 'LLM validation unavailable']
      },
      requiresReview: true,
      suggestedAction: 'review'
    };
  }
  
  // Step 3: Use LLM for intelligent analysis
  try {
    const llmResult = await performLLMValidation(
      extractedFields,
      companyConfig,
      invoiceDate,
      llmProvider
    );
    
    logger.info("LLM validation completed", {
      belongsToTenant: llmResult.belongsToTenant,
      confidence: llmResult.confidence,
      matchType: llmResult.matchType
    });
    
    return llmResult;
  } catch (error) {
    logger.error("LLM validation failed", { error });
    
    // Fallback on LLM error
    return {
      belongsToTenant: false,
      confidence: 0,
      matchType: 'uncertain',
      reasoning: 'LLM validation failed',
      evidence: {
        directMatches: [],
        riskFactors: ['Validation error occurred']
      },
      requiresReview: true,
      suggestedAction: 'review'
    };
  }
}

// LLM-based validation
async function performLLMValidation(
  extractedFields: ExtractedFields,
  config: CompanyConfig,
  invoiceDate: Date,
  llmProvider: (prompt: string) => Promise<string>
): Promise<OwnershipValidation> {
  
  // Build comprehensive prompt
  const prompt = buildValidationPrompt(extractedFields, config, invoiceDate);
  
  // Call LLM
  const response = await llmProvider(prompt);
  
  try {
    // Parse LLM response
    const parsed = JSON.parse(response);
    
    // Validate and structure the response
    return {
      belongsToTenant: parsed.belongsToCompany === true,
      confidence: Math.min(100, Math.max(0, parsed.confidence || 0)),
      matchType: parsed.matchType || 'uncertain',
      reasoning: parsed.reasoning || 'No reasoning provided',
      evidence: {
        directMatches: parsed.keyEvidence || [],
        llmAnalysis: parsed.reasoning,
        riskFactors: parsed.riskFactors || []
      },
      requiresReview: parsed.confidence < 80 || !parsed.belongsToCompany,
      suggestedAction: determineSuggestedAction(parsed)
    };
  } catch (error) {
    logger.error("Failed to parse LLM response", { error, response });
    throw new Error("Invalid LLM response format");
  }
}

// Build validation prompt for LLM
function buildValidationPrompt(
  extractedFields: ExtractedFields,
  config: CompanyConfig,
  invoiceDate: Date
): string {
  
  // Get historical names valid at invoice date
  const historicalNames = config.names.previous
    .filter(n => {
      const validFrom = n.validFrom ? new Date(n.validFrom) : null;
      const validTo = n.validTo ? new Date(n.validTo) : null;
      return (!validFrom || validFrom <= invoiceDate) && 
             (!validTo || validTo >= invoiceDate);
    })
    .map(n => n.name);
  
  // Format address if available
  const registeredAddress = config.addresses.registered 
    ? `${config.addresses.registered.line1}, ${config.addresses.registered.city}, ${config.addresses.registered.postcode}`
    : 'Not provided';
  
  return `You are a financial document validation expert. Determine if this invoice belongs to the company based on the evidence provided.

INVOICE CUSTOMER DETAILS:
- Name: ${extractedFields.customerName?.value || 'Not found'}
- VAT/Tax ID: ${extractedFields.customerTaxId?.value || 'Not found'}
- Address: ${extractedFields.customerAddress?.value || 'Not found'}
- Email: ${extractedFields.customerEmail?.value || 'Not found'}

COMPANY CONFIGURATION:
- Legal Name: ${config.names.legal}
- Trading Names: ${config.names.trading.join(', ') || 'None'}
- Previous Names: ${historicalNames.join(', ') || 'None'}
- Known Misspellings: ${config.names.misspellings.join(', ') || 'None'}
- Company Numbers: ${config.identifiers.companyNumbers.map(c => c.number).join(', ') || 'None'}
- VAT Numbers: ${config.identifiers.vatNumbers.filter(v => v.isActive).map(v => v.number).join(', ') || 'None'}
- Registered Address: ${registeredAddress}
- Group Company: ${config.names.groupName || 'None'}

INVOICE DATE: ${invoiceDate.toISOString().split('T')[0]}

TASK:
1. Analyze if the invoice customer matches the company
2. Consider variations, abbreviations, and common differences
3. Account for subsidiary relationships or group structures
4. Consider the invoice date when checking historical names
5. Identify any red flags or mismatches

Respond with JSON:
{
  "belongsToCompany": boolean,
  "confidence": 0-100,
  "matchType": "exact|trading_name|subsidiary|historical|no_match",
  "reasoning": "Detailed explanation",
  "keyEvidence": ["List of supporting evidence"],
  "riskFactors": ["List of concerns if any"]
}`;
}

// Determine suggested action based on LLM response
function determineSuggestedAction(llmResponse: any): 'process' | 'review' | 'reject' {
  if (llmResponse.belongsToCompany && llmResponse.confidence >= 80) {
    return 'process';
  }
  if (!llmResponse.belongsToCompany && llmResponse.confidence >= 90) {
    return 'reject';
  }
  return 'review';
}

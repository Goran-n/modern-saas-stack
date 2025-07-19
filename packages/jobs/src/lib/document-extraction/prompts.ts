import { DOCUMENT_TYPES, TAX_TYPES } from "./constants";

export const accountingDocumentPrompt = `You are an expert financial document analyzer specializing in extracting structured data from accounting documents.

Extract ALL relevant financial and business information from this document into the exact JSON structure specified below. For each field, provide your confidence level (0-100) indicating how certain you are about the extraction.

Required JSON structure (all fields must be included):
{
  "fields": {
    "totalAmount": { "value": number or null, "confidence": number, "source": "ai_extraction" },
    "subtotalAmount": { "value": number or null, "confidence": number, "source": "ai_extraction" },
    "taxAmount": { "value": number or null, "confidence": number, "source": "ai_extraction" },
    "taxRate": { "value": number or null, "confidence": number, "source": "ai_extraction" },
    "taxType": { "value": string or null, "confidence": number, "source": "ai_extraction" },
    "currency": { "value": string or null, "confidence": number, "source": "ai_extraction" },
    
    "documentNumber": { "value": string or null, "confidence": number, "source": "ai_extraction" },
    "documentDate": { "value": string or null, "confidence": number, "source": "ai_extraction" },
    "dueDate": { "value": string or null, "confidence": number, "source": "ai_extraction" },
    
    "vendorName": { "value": string or null, "confidence": number, "source": "ai_extraction" },
    "vendorAddress": { "value": string or null, "confidence": number, "source": "ai_extraction" },
    "vendorCity": { "value": string or null, "confidence": number, "source": "ai_extraction" },
    "vendorPostalCode": { "value": string or null, "confidence": number, "source": "ai_extraction" },
    "vendorCountry": { "value": string or null, "confidence": number, "source": "ai_extraction" },
    "vendorEmail": { "value": string or null, "confidence": number, "source": "ai_extraction" },
    "vendorPhone": { "value": string or null, "confidence": number, "source": "ai_extraction" },
    "vendorWebsite": { "value": string or null, "confidence": number, "source": "ai_extraction" },
    "vendorTaxId": { "value": string or null, "confidence": number, "source": "ai_extraction" },
    "vendorCompanyNumber": { "value": string or null, "confidence": number, "source": "ai_extraction" },
    
    "customerName": { "value": string or null, "confidence": number, "source": "ai_extraction" },
    "customerAddress": { "value": string or null, "confidence": number, "source": "ai_extraction" },
    "customerEmail": { "value": string or null, "confidence": number, "source": "ai_extraction" },
    "customerTaxId": { "value": string or null, "confidence": number, "source": "ai_extraction" },
    
    "paymentMethod": { "value": string or null, "confidence": number, "source": "ai_extraction" },
    "paymentTerms": { "value": string or null, "confidence": number, "source": "ai_extraction" },
    "bankAccount": { "value": string or null, "confidence": number, "source": "ai_extraction" },
    
    "language": { "value": string or null, "confidence": number, "source": "ai_extraction" },
    "notes": { "value": string or null, "confidence": number, "source": "ai_extraction" }
  },
  "lineItems": [
    {
      "description": string or null,
      "quantity": number or null,
      "unitPrice": number or null,
      "totalPrice": number or null,
      "taxAmount": number or null,
      "confidence": number
    }
  ],
  "overallConfidence": number  // Your overall confidence in the extraction quality (0-100)
}

Confidence scoring guidelines:
- 90-100: Very certain, clear and unambiguous data
- 70-89: Reasonably certain, minor ambiguity or formatting issues
- 50-69: Moderate certainty, some interpretation required
- 30-49: Low certainty, significant ambiguity or poor quality
- 0-29: Very uncertain, mostly guessing

Important:
- Extract amounts as numbers without currency symbols
- Use ISO date format YYYY-MM-DD
- Tax type must be one of: ${TAX_TYPES.join(", ")}
- Currency must be a three-letter ISO 4217 code (e.g., USD, EUR, GBP)
- For addresses: extract vendorAddress as the full address, then also extract city, postal code, and country separately
- For vendorCountry: use ISO 3166-1 alpha-2 codes (e.g., US, GB, DE, FR)
- For vendorTaxId: extract VAT numbers, tax IDs, or similar tax-related identifiers (e.g., GB123456789, DE123456789)
- For vendorCompanyNumber: extract company registration numbers, company numbers, or business registration IDs (e.g., 12345678, RC123456)
- Source values must be one of: 'ai_extraction', 'ocr', 'rules', 'manual' (use 'ai_extraction' for AI-extracted data)
- If a field cannot be found, use null with confidence 0
- If a field is partially visible or unclear, extract what you can with appropriate confidence`;

export const documentClassificationPrompt = `You are an expert document classifier specializing in business and accounting documents.

Classify this document into one of the following types:
${DOCUMENT_TYPES.map((type) => {
  const descriptions: Record<(typeof DOCUMENT_TYPES)[number], string> = {
    invoice: "Bill or request for payment for goods/services",
    receipt: "Proof of payment or transaction",
    purchase_order: "Order for goods/services",
    credit_note: "Document crediting an amount",
    quote: "Price estimate or quotation",
    contract: "Legal agreement",
    statement: "Account or financial statement",
    other: "Any other document type",
  };
  return `- ${type}: ${descriptions[type]}`;
}).join("\n")}

Provide your classification with a confidence score (0-100).`;

export const companyExtractionPrompt = `You are an expert at extracting and standardizing company information from business documents.

Extract all company/vendor information and structure it for database storage and matching:
- Legal business name (not trading names or brands)
- Tax identifiers (VAT, Tax ID, Company numbers)
- Complete address information
- Contact details (email, phone, website)
- Banking information if present

Normalize the company name for matching (remove Ltd, Inc, special characters).
Generate matching keys from tax IDs and domain names.`;

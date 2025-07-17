// TypeScript types for document extraction JSONB fields

export interface ExtractedFieldValue {
  value: any;
  confidence: number;
  source: 'ai_extraction' | 'ocr' | 'rules' | 'manual';
  alternativeValues?: Array<{
    value: any;
    confidence: number;
  }>;
}

export interface ExtractedFields {
  // Core financial fields
  totalAmount?: ExtractedFieldValue;
  subtotalAmount?: ExtractedFieldValue;
  taxAmount?: ExtractedFieldValue;
  taxRate?: ExtractedFieldValue;
  taxType?: ExtractedFieldValue;
  currency?: ExtractedFieldValue;
  
  // Document identifiers
  documentNumber?: ExtractedFieldValue;
  documentDate?: ExtractedFieldValue;
  dueDate?: ExtractedFieldValue;
  
  // Vendor information
  vendorName?: ExtractedFieldValue;
  vendorAddress?: ExtractedFieldValue;
  vendorCity?: ExtractedFieldValue;
  vendorPostalCode?: ExtractedFieldValue;
  vendorCountry?: ExtractedFieldValue;
  vendorEmail?: ExtractedFieldValue;
  vendorPhone?: ExtractedFieldValue;
  vendorWebsite?: ExtractedFieldValue;
  vendorTaxId?: ExtractedFieldValue;
  
  // Customer information
  customerName?: ExtractedFieldValue;
  customerAddress?: ExtractedFieldValue;
  customerEmail?: ExtractedFieldValue;
  customerTaxId?: ExtractedFieldValue;
  
  // Payment information
  paymentMethod?: ExtractedFieldValue;
  paymentTerms?: ExtractedFieldValue;
  bankAccount?: ExtractedFieldValue;
  
  // Additional fields
  language?: ExtractedFieldValue;
  notes?: ExtractedFieldValue;
  _validationErrors?: ExtractedFieldValue;
  
  // Allow additional fields
  [key: string]: ExtractedFieldValue | undefined;
}

export interface CompanyProfile {
  taxIdentifiers: {
    vatNumber?: string;
    taxId?: string;
    companyNumber?: string;
    countryCode: string;
  };
  legalName: string;
  tradingNames: string[];
  addresses: Array<{
    type: 'billing' | 'shipping' | 'registered' | 'other';
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
    confidence: number;
  }>;
  primaryEmail?: string;
  domains: string[];
  phones: string[];
  bankAccounts: Array<{
    accountNumber?: string;
    iban?: string;
    swiftCode?: string;
    bankName?: string;
  }>;
  paymentMethods: string[];
  defaultCurrency?: string;
  normalizedName: string;
  matchingKeys: string[];
  lastVerifiedDate?: Date;
}

export interface LineItem {
  description: string | null;
  quantity: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
  taxAmount: number | null;
  confidence: number;
}

export interface FieldAnnotation {
  fieldName: string;
  pageNumber: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  textContent: string;
}

export interface ExtractionError {
  field: string;
  error: string;
}

export interface SuggestedMatch {
  supplierId: string;
  supplierName: string;
  confidence: number;
  matchType: 'exact' | 'fuzzy' | 'domain' | 'tax_id';
}
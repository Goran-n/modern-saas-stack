
// Date range for historical data
export interface DateRange {
  validFrom: Date | null;
  validTo: Date | null;
}

// Address structure for multiple address types
export interface Address extends DateRange {
  id: string;
  type: "registered" | "trading" | "billing" | "previous";
  line1: string;
  line2?: string | undefined;
  city: string;
  county?: string | undefined;
  postcode: string;
  country: string;
  isActive: boolean;
}

// VAT registration for multiple jurisdictions
export interface VATRegistration extends DateRange {
  id: string;
  number: string;
  country: string;
  scheme: "standard" | "flat_rate" | "cash_accounting" | "annual_accounting";
  flatRatePercentage?: number | undefined; // Only for flat rate scheme
  isActive: boolean;
}

// Company registration numbers
export interface CompanyRegistration extends DateRange {
  id: string;
  number: string;
  jurisdiction: string;
  type: "company_number" | "charity_number" | "partnership_number" | "other";
}

// Tax reference numbers
export interface TaxReference {
  id: string;
  type: "utr" | "paye" | "vat" | "corporation_tax" | "other";
  reference: string;
  description?: string | undefined;
}

// Name history for tracking changes
export interface NameHistory extends DateRange {
  id: string;
  name: string;
  type: "legal" | "trading" | "previous";
}

// Main company configuration interface
export interface CompanyConfig {
  // Company names for matching
  names: {
    legal: string;
    trading: string[];
    previous: NameHistory[];
    abbreviations: string[];
    misspellings: string[];
    groupName?: string | undefined; // Parent company if subsidiary
  };

  // Identifiers for validation and matching
  identifiers: {
    vatNumbers: VATRegistration[];
    companyNumbers: CompanyRegistration[];
    taxReferences: TaxReference[];
  };

  // Multiple addresses for comprehensive matching
  addresses: {
    registered: Address | null;
    trading: Address[];
    billing: Address[];
    historical: Address[];
  };

  // Matching helpers
  matching: {
    emailDomains: string[];
    phoneNumbers: string[];
    bankStatementNames: string[]; // How company appears on bank statements
    commonSuppliers: string[]; // Frequent supplier names for better matching
    websites: string[];
  };

  // Business details for context
  business: {
    type: CompanyType;
    industrySectors: string[]; // Primary and secondary sectors
    size: CompanySize;
    incorporationDate?: Date | undefined;
    financialYearEnd: { month: number; day: number }; // e.g., { month: 3, day: 31 } for March 31
    accountingMethod: "cash" | "accrual";
    defaultCurrency: string; // ISO 4217 code
  };

  // VAT specific configuration
  vat: {
    isRegistered: boolean;
    schemes: VATSchemeHistory[];
    taxYearBasis: "cash" | "accrual";
    mtdEnabled: boolean; // Making Tax Digital
    ecSalesListRequired: boolean;
  };
}

// Supporting types
export type CompanyType = 
  | "limited_company"
  | "plc"
  | "llp"
  | "partnership"
  | "sole_trader"
  | "charity"
  | "community_interest_company"
  | "other";

export type CompanySize = "micro" | "small" | "medium" | "large";

export interface VATSchemeHistory extends DateRange {
  id: string;
  scheme: "standard" | "flat_rate" | "cash_accounting" | "annual_accounting";
  flatRatePercentage?: number | undefined;
  annualLimit?: number | undefined; // For annual accounting scheme
}

// Industry sectors based on SIC codes
export const industrySectors = [
  "Agriculture, Forestry and Fishing",
  "Mining and Quarrying",
  "Manufacturing",
  "Electricity, Gas, Steam and Air Conditioning Supply",
  "Water Supply; Sewerage, Waste Management",
  "Construction",
  "Wholesale and Retail Trade",
  "Transportation and Storage",
  "Accommodation and Food Service Activities",
  "Information and Communication",
  "Financial and Insurance Activities",
  "Real Estate Activities",
  "Professional, Scientific and Technical Activities",
  "Administrative and Support Service Activities",
  "Public Administration and Defence",
  "Education",
  "Human Health and Social Work Activities",
  "Arts, Entertainment and Recreation",
  "Other Service Activities",
] as const;

// Turnover ranges for company size determination
export const turnoverRanges = [
  { value: "0-85000", label: "£0 - £85,000 (Below VAT threshold)" },
  { value: "85001-250000", label: "£85,001 - £250,000" },
  { value: "250001-500000", label: "£250,001 - £500,000" },
  { value: "500001-1000000", label: "£500,001 - £1,000,000" },
  { value: "1000001-5000000", label: "£1,000,001 - £5,000,000" },
  { value: "5000001-10000000", label: "£5,000,001 - £10,000,000" },
  { value: "10000001+", label: "£10,000,001+" },
] as const;

// EU countries for VAT number validation
export const euCountries = [
  { value: "GB", label: "United Kingdom" },
  { value: "IE", label: "Ireland" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "IT", label: "Italy" },
  { value: "ES", label: "Spain" },
  { value: "NL", label: "Netherlands" },
  { value: "BE", label: "Belgium" },
  { value: "AT", label: "Austria" },
  { value: "DK", label: "Denmark" },
  { value: "FI", label: "Finland" },
  { value: "GR", label: "Greece" },
  { value: "LU", label: "Luxembourg" },
  { value: "PT", label: "Portugal" },
  { value: "SE", label: "Sweden" },
  { value: "PL", label: "Poland" },
  { value: "CZ", label: "Czech Republic" },
  { value: "HU", label: "Hungary" },
  { value: "RO", label: "Romania" },
  { value: "BG", label: "Bulgaria" },
  { value: "HR", label: "Croatia" },
  { value: "CY", label: "Cyprus" },
  { value: "EE", label: "Estonia" },
  { value: "LV", label: "Latvia" },
  { value: "LT", label: "Lithuania" },
  { value: "MT", label: "Malta" },
  { value: "SK", label: "Slovakia" },
  { value: "SI", label: "Slovenia" },
] as const;

// Helper function to create default company config
export function createDefaultCompanyConfig(): CompanyConfig {
  return {
    names: {
      legal: "",
      trading: [],
      previous: [],
      abbreviations: [],
      misspellings: [],
    },
    identifiers: {
      vatNumbers: [],
      companyNumbers: [],
      taxReferences: [],
    },
    addresses: {
      registered: null,
      trading: [],
      billing: [],
      historical: [],
    },
    matching: {
      emailDomains: [],
      phoneNumbers: [],
      bankStatementNames: [],
      commonSuppliers: [],
      websites: [],
    },
    business: {
      type: "limited_company",
      industrySectors: [],
      size: "small",
      financialYearEnd: { month: 3, day: 31 }, // Default to March 31
      accountingMethod: "accrual",
      defaultCurrency: "GBP",
    },
    vat: {
      isRegistered: false,
      schemes: [],
      taxYearBasis: "accrual",
      mtdEnabled: false,
      ecSalesListRequired: false,
    },
  };
}
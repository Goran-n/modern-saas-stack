export const companyTypes = [
  { value: 'limited_company', label: 'Limited Company' },
  { value: 'plc', label: 'Public Limited Company' },
  { value: 'llp', label: 'Limited Liability Partnership' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'sole_trader', label: 'Sole Trader' },
  { value: 'charity', label: 'Charity' },
  { value: 'community_interest_company', label: 'Community Interest Company' },
  { value: 'other', label: 'Other' },
];

export const companySizes = [
  { value: 'micro', label: 'Micro (< 10 employees)' },
  { value: 'small', label: 'Small (10-49 employees)' },
  { value: 'medium', label: 'Medium (50-249 employees)' },
  { value: 'large', label: 'Large (250+ employees)' },
];

export const currencies = [
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'USD', label: 'USD - US Dollar' },
];

export const accountingMethods = [
  { value: 'cash', label: 'Cash Basis' },
  { value: 'accrual', label: 'Accrual Basis' },
];

export const months = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export const days = Array.from({ length: 31 }, (_, i) => ({ 
  value: i + 1, 
  label: String(i + 1) 
}));

export const countries = [
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
  { value: 'IE', label: 'Ireland' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'NZ', label: 'New Zealand' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'IT', label: 'Italy' },
  { value: 'ES', label: 'Spain' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'BE', label: 'Belgium' },
  { value: 'AT', label: 'Austria' },
  { value: 'CH', label: 'Switzerland' },
  { value: 'SE', label: 'Sweden' },
  { value: 'NO', label: 'Norway' },
  { value: 'DK', label: 'Denmark' },
  { value: 'FI', label: 'Finland' },
  { value: 'PL', label: 'Poland' },
  { value: 'PT', label: 'Portugal' },
];
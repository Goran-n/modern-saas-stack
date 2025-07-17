export class SupplierError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'SupplierError';
  }
}

export const SupplierErrors = {
  MISSING_IDENTIFIER: new SupplierError(
    'At least one identifier (company number or VAT number) is required',
    'MISSING_IDENTIFIER'
  ),
  
  DUPLICATE_COMPANY_NUMBER: new SupplierError(
    'A supplier with this company number already exists',
    'DUPLICATE_COMPANY_NUMBER',
    409
  ),
  
  DUPLICATE_VAT_NUMBER: new SupplierError(
    'A supplier with this VAT number already exists',
    'DUPLICATE_VAT_NUMBER',
    409
  ),
  
  SUPPLIER_NOT_FOUND: new SupplierError(
    'Supplier not found',
    'SUPPLIER_NOT_FOUND',
    404
  ),
  
  INVALID_TENANT: new SupplierError(
    'Invalid tenant ID',
    'INVALID_TENANT',
    403
  ),
};
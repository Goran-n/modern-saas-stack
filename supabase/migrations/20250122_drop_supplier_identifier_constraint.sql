-- Drop the must_have_identifier constraint on suppliers table
-- This constraint was preventing creation of suppliers without formal identifiers
-- The application already handles data quality through validation and confidence scoring

-- Drop the constraint if it exists
ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS must_have_identifier;

-- Add documentation about the decision
COMMENT ON TABLE suppliers IS 'Suppliers table. Identifiers (company_number, vat_number) are preferred but not required. Data quality is managed through application-level validation and confidence scoring.';

-- Add column comments to clarify the optional nature
COMMENT ON COLUMN suppliers.company_number IS 'Company registration number (optional). Used for matching and validation but not required.';
COMMENT ON COLUMN suppliers.vat_number IS 'VAT registration number (optional). Used for matching and validation but not required.';
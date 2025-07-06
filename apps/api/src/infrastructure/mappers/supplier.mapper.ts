import { SupplierEntity } from '../../core/domain/supplier/supplier.entity'
import { EntityId } from '../../core/domain/shared/value-objects/entity-id'
import { Money } from '../../core/domain/shared/value-objects/money'
import type { SupplierDatabaseRow } from '../persistence/types/supplier.types'

export class SupplierMapper {
  static toDomain(row: SupplierDatabaseRow): SupplierEntity {
    return SupplierEntity.fromDatabase({
      id: EntityId.from(row.id),
      tenantId: row.tenant_id,
      
      // Core identification
      name: row.name,
      displayName: row.display_name,
      legalName: row.legal_name,
      tradingNames: row.trading_names || [],
      
      // Individual names
      firstName: row.first_name,
      lastName: row.last_name,
      
      // External identifiers
      externalIds: row.external_ids || [],
      companyNumber: row.company_number,
      
      // Contact information
      primaryEmail: row.primary_email,
      additionalEmails: row.additional_emails || [],
      primaryPhone: row.primary_phone,
      additionalPhones: row.additional_phones || [],
      website: row.website,
      
      // Addresses
      mainAddress: row.main_address,
      shippingAddresses: row.shipping_addresses || [],
      billingAddresses: row.billing_addresses || [],
      
      // Tax information
      taxNumber: row.tax_number,
      taxNumberType: row.tax_number_type,
      secondaryTaxNumbers: row.secondary_tax_numbers || {},
      taxExempt: row.tax_exempt,
      taxExemptionReason: row.tax_exemption_reason,
      
      // Banking
      defaultCurrency: row.default_currency,
      mainBankAccount: row.main_bank_account,
      additionalBankAccounts: row.additional_bank_accounts || [],
      
      // Payment terms
      paymentTermsDays: row.payment_terms_days,
      paymentTermsType: row.payment_terms_type as any,
      paymentTermsDescription: row.payment_terms_description,
      creditLimit: row.credit_limit && row.credit_limit_currency 
        ? new Money(row.credit_limit, row.credit_limit_currency)
        : null,
      
      // Classification
      supplierType: row.supplier_type as any,
      isActive: row.is_active,
      isIndividual: row.is_individual,
      contactStatus: row.contact_status as any,
      
      // AI/Enhancement
      normalizedName: row.normalized_name,
      nameTokens: row.name_tokens || [],
      industryCode: row.industry_code,
      supplierSize: row.supplier_size,
      
      // Metadata
      tags: row.tags || [],
      customFields: row.custom_fields || {},
      notes: row.notes,
      metadata: row.metadata || {},
      
      // Quality
      dataQualityScore: row.data_quality_score,
      verifiedDate: row.verified_date,
      verificationSource: row.verification_source,
      
      // Audit
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      lastSyncedAt: row.last_synced_at,
      syncVersion: row.sync_version,
    })
  }

  static toDatabase(entity: SupplierEntity): SupplierDatabaseRow {
    const props = entity.toDatabase()
    
    return {
      id: props.id.toString(),
      tenant_id: props.tenantId,
      
      // Core identification
      name: props.name,
      display_name: props.displayName,
      legal_name: props.legalName,
      trading_names: JSON.stringify(props.tradingNames),
      
      // Individual names
      first_name: props.firstName,
      last_name: props.lastName,
      
      // External identifiers
      external_ids: JSON.stringify(props.externalIds),
      company_number: props.companyNumber,
      
      // Contact information
      primary_email: props.primaryEmail,
      additional_emails: JSON.stringify(props.additionalEmails),
      primary_phone: props.primaryPhone,
      additional_phones: JSON.stringify(props.additionalPhones),
      website: props.website,
      
      // Addresses
      main_address: props.mainAddress ? JSON.stringify(props.mainAddress) : null,
      shipping_addresses: JSON.stringify(props.shippingAddresses),
      billing_addresses: JSON.stringify(props.billingAddresses),
      
      // Tax information
      tax_number: props.taxNumber,
      tax_number_type: props.taxNumberType,
      secondary_tax_numbers: JSON.stringify(props.secondaryTaxNumbers),
      tax_exempt: props.taxExempt,
      tax_exemption_reason: props.taxExemptionReason,
      
      // Banking
      default_currency: props.defaultCurrency,
      main_bank_account: props.mainBankAccount ? JSON.stringify(props.mainBankAccount) : null,
      additional_bank_accounts: JSON.stringify(props.additionalBankAccounts),
      
      // Payment terms
      payment_terms_days: props.paymentTermsDays,
      payment_terms_type: props.paymentTermsType,
      payment_terms_description: props.paymentTermsDescription,
      credit_limit: props.creditLimit?.toString() || null,
      credit_limit_currency: props.creditLimit?.getCurrency() || null,
      
      // Classification
      supplier_type: props.supplierType,
      is_active: props.isActive,
      is_individual: props.isIndividual,
      contact_status: props.contactStatus,
      
      // AI/Enhancement
      normalized_name: props.normalizedName,
      name_tokens: JSON.stringify(props.nameTokens),
      industry_code: props.industryCode,
      supplier_size: props.supplierSize,
      
      // Metadata
      tags: JSON.stringify(props.tags),
      custom_fields: JSON.stringify(props.customFields),
      notes: props.notes,
      metadata: JSON.stringify(props.metadata),
      
      // Quality
      data_quality_score: props.dataQualityScore,
      verified_date: props.verifiedDate,
      verification_source: props.verificationSource,
      
      // Audit
      created_at: props.createdAt,
      updated_at: props.updatedAt,
      created_by: props.createdBy,
      last_synced_at: props.lastSyncedAt,
      sync_version: props.syncVersion,
    }
  }
}
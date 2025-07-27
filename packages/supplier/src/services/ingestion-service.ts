import * as searchOps from "@figgy/search";
import {
  and,
  eq,
  sql,
  supplierAttributes,
  supplierDataSources,
  suppliers,
} from "@figgy/shared-db";
import { logger } from "@figgy/utils";
import { CONFIDENCE_THRESHOLDS, DEFAULT_CONFIDENCE } from "../constants";
import { getDb } from "../db";
import { SupplierError } from "../errors";
import { AttributeNormalizer } from "../ingestion/normalizer";
import { IngestionValidator } from "../ingestion/validator";
import { type SupplierMatchData, SupplierMatcher } from "../matching/matcher";
import {
  AttributeType,
  type SupplierIngestionRequest,
  SupplierStatus,
} from "../types";
import { generateSlug } from "../utils/slug";
import { SupplierValidator } from "../validation/supplier-validator";
import { GlobalSupplierService } from "./global-supplier-service";
import { SupplierOperations } from "./supplier-operations";

export interface IngestionResult {
  success: boolean;
  action: "created" | "updated" | "skipped";
  supplierId?: string | undefined;
  globalSupplierId?: string | undefined;
  error?: string | undefined;
}

export class SupplierIngestionService {
  private get db() {
    return getDb();
  }

  /**
   * Ingest supplier data from invoice or manual entry
   */
  async ingest(request: SupplierIngestionRequest): Promise<IngestionResult> {
    try {
      // Validate and sanitize
      const validated = IngestionValidator.validate(request);

      // Validate data quality
      const validateData: {
        name: string;
        companyNumber?: string | null;
        vatNumber?: string | null;
        country?: string;
        email?: string | null;
        phone?: string | null;
        website?: string | null;
      } = {
        name: validated.data.name,
        companyNumber: validated.data.identifiers.companyNumber ?? null,
        vatNumber: validated.data.identifiers.vatNumber ?? null,
        email:
          validated.data.contacts.find((c) => c.type === "email")?.value ??
          null,
        phone:
          validated.data.contacts.find((c) => c.type === "phone")?.value ??
          null,
        website:
          validated.data.contacts.find((c) => c.type === "website")?.value ??
          null,
      };

      const country = validated.data.addresses[0]?.country;
      if (country) {
        validateData.country = country;
      }

      const qualityValidation = SupplierValidator.validate(validateData);

      // Only fail on actual errors (not warnings like missing identifiers)
      if (!qualityValidation.isValid) {
        logger.warn("Supplier data quality validation failed", {
          errors: qualityValidation.errors,
          warnings: qualityValidation.warnings,
          name: validated.data.name,
        });
        return {
          success: false,
          action: "skipped",
          error: `Data quality issues: ${qualityValidation.errorMessages.join(", ")}`,
        };
      }

      // Log warnings but continue - the scoring system will decide if we have enough data
      if (qualityValidation.warnings.length > 0) {
        logger.info("Supplier data quality warnings", {
          warnings: qualityValidation.warnings,
          confidence: qualityValidation.confidence,
          name: validated.data.name,
        });
      }

      // Apply enhanced data if available
      if (qualityValidation.enhancedData) {
        if (qualityValidation.enhancedData.validatedCompanyNumber) {
          validated.data.identifiers.companyNumber =
            qualityValidation.enhancedData.validatedCompanyNumber;
        }
        if (qualityValidation.enhancedData.validatedVat) {
          validated.data.identifiers.vatNumber =
            qualityValidation.enhancedData.validatedVat;
        }
      }

      // Match against existing suppliers
      const matchResult = await this.matchSupplier(validated);

      if (
        matchResult.matched &&
        matchResult.confidence >= CONFIDENCE_THRESHOLDS.AUTO_ACCEPT
      ) {
        // High confidence match - update existing
        return await this.updateExistingSupplier(
          validated,
          matchResult.supplierId!,
        );
      } else if (!matchResult.matched) {
        // No match - check if we have enough data to create new supplier
        const supplierMatchData = {
          identifiers: validated.data.identifiers,
          name: validated.data.name,
          addresses: validated.data.addresses,
          contacts: validated.data.contacts,
          bankAccounts: validated.data.bankAccounts,
        };

        const creationScore =
          SupplierMatcher.calculateCreationScore(supplierMatchData);

        logger.info("Supplier creation score calculated", {
          name: validated.data.name,
          score: creationScore,
          requiredScore: CONFIDENCE_THRESHOLDS.CREATE_SUPPLIER,
          hasIdentifiers:
            !!supplierMatchData.identifiers.companyNumber ||
            !!supplierMatchData.identifiers.vatNumber,
          hasAddress: supplierMatchData.addresses.length > 0,
          hasContacts: supplierMatchData.contacts.length > 0,
        });

        if (creationScore >= CONFIDENCE_THRESHOLDS.CREATE_SUPPLIER) {
          return await this.createNewSupplier(validated);
        } else {
          logger.warn("Insufficient data for supplier creation", {
            name: validated.data.name,
            creationScore,
            requiredScore: CONFIDENCE_THRESHOLDS.CREATE_SUPPLIER,
            matchData: supplierMatchData,
          });
          return {
            success: false,
            action: "skipped",
            error: `Insufficient data for supplier creation (score: ${creationScore}/${CONFIDENCE_THRESHOLDS.CREATE_SUPPLIER})`,
          };
        }
      } else {
        // Low confidence match - skip for manual review
        logger.info("Low confidence match, skipping", {
          name: validated.data.name,
          confidence: matchResult.confidence,
        });
        return {
          success: true,
          action: "skipped",
        };
      }
    } catch (error: any) {
      logger.error("Supplier ingestion failed", { error, request });

      // Handle database constraint violations
      if (error.code === "23505") {
        // Unique constraint violation
        if (error.detail?.includes("company_number")) {
          throw new SupplierError(
            "A supplier with this company number already exists",
            "DUPLICATE_COMPANY_NUMBER",
            409,
          );
        }
        // VAT number constraint removed - multiple trading names can share VAT
      }

      // Ensure we always have a meaningful error message
      const errorMessage =
        error instanceof Error
          ? error.message
          : error?.toString() || "Unknown error during supplier ingestion";

      return {
        success: false,
        action: "skipped",
        error: errorMessage,
      };
    }
  }

  /**
   * Match supplier against existing records
   */
  private async matchSupplier(request: SupplierIngestionRequest) {
    const { data, tenantId } = request;

    // Get all suppliers for tenant
    const existingSuppliers = await this.db
      .select()
      .from(suppliers)
      .where(eq(suppliers.tenantId, tenantId));

    // Use enhanced matching with scoring
    const supplierMatchData: SupplierMatchData = {
      identifiers: data.identifiers,
      name: data.name,
      addresses: data.addresses,
      contacts: data.contacts,
      bankAccounts: data.bankAccounts,
      // Pass confidence scores if available from extraction
      confidence: (data as any).confidence,
    };

    return SupplierMatcher.matchWithScoring(
      supplierMatchData,
      existingSuppliers.map((s: any) => ({
        id: s.id,
        companyNumber: s.companyNumber,
        vatNumber: s.vatNumber,
        legalName: s.legalName,
        displayName: s.displayName,
        slug: s.slug,
        status: s.status,
        tenantId: s.tenantId,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        deletedAt: s.deletedAt,
      })),
    );
  }

  /**
   * Create new supplier
   */
  private async createNewSupplier(
    request: SupplierIngestionRequest,
  ): Promise<IngestionResult> {
    const { data, source, sourceId, tenantId } = request;

    // Retry logic for slug generation race conditions
    let retries = 3;
    let lastError: any;

    while (retries > 0) {
      try {
        const result = await this.db.transaction(async (tx) => {
          // Create supplier
          const [supplier] = await tx
            .insert(suppliers)
            .values({
              companyNumber: data.identifiers.companyNumber,
              vatNumber: data.identifiers.vatNumber,
              legalName: data.name,
              displayName: data.name,
              slug: await generateSlug(data.name, tenantId, tx),
              status: SupplierStatus.ACTIVE,
              tenantId,
            })
            .returning();

          if (!supplier) {
            throw new Error("Failed to create supplier");
          }

          // Track data source
          await tx.insert(supplierDataSources).values({
            supplierId: supplier.id,
            sourceType: source,
            sourceId,
          });

          // Add attributes
          await this.addAttributes(tx, supplier.id, request);

          // Link to global supplier
          const globalSupplierService = new GlobalSupplierService();
          const globalSupplierId =
            await globalSupplierService.findOrCreateGlobalSupplier(supplier);

          if (globalSupplierId) {
            await globalSupplierService.linkToGlobalSupplier(
              supplier.id,
              globalSupplierId,
            );
          }

          logger.info("Created new supplier", {
            supplierId: supplier.id,
            name: supplier.displayName,
            source,
            globalSupplierId,
          });

          // Index supplier in search
          try {
            const indexData: Parameters<typeof searchOps.indexSupplier>[0] = {
              id: supplier.id,
              tenantId: supplier.tenantId,
              displayName: supplier.displayName,
              legalName: supplier.legalName,
              createdAt: supplier.createdAt,
            };

            if (supplier.companyNumber) {
              indexData.companyNumber = supplier.companyNumber;
            }

            if (supplier.vatNumber) {
              indexData.vatNumber = supplier.vatNumber;
            }

            await searchOps.indexSupplier(indexData);
          } catch (error) {
            logger.error("Failed to index supplier in search", {
              supplierId: supplier.id,
              error: error instanceof Error ? error.message : String(error),
            });
            // Don't throw - search indexing failure shouldn't fail supplier creation
          }

          return {
            success: true,
            action: "created" as const,
            supplierId: supplier.id,
            globalSupplierId: globalSupplierId ?? undefined,
          };
        });

        // Trigger logo fetch for newly created global supplier
        if (result.globalSupplierId) {
          const operations = new SupplierOperations();
          await operations.triggerLogoFetchForGlobalSupplier(
            result.globalSupplierId,
          );
        }

        return result;
      } catch (error: any) {
        lastError = error;

        // Check if it's a unique constraint violation on slug
        if (error.code === "23505" && error.detail?.includes("slug")) {
          retries--;
          logger.warn("Slug collision detected, retrying", {
            name: data.name,
            tenantId,
            retriesLeft: retries,
          });

          // Add a small delay to reduce contention
          await new Promise((resolve) =>
            setTimeout(resolve, 50 + Math.random() * 50),
          );
          continue;
        }

        // If it's a different error, throw immediately
        throw error;
      }
    }

    // If we exhausted retries, throw the last error
    throw lastError;
  }

  /**
   * Update existing supplier
   */
  private async updateExistingSupplier(
    request: SupplierIngestionRequest,
    supplierId: string,
  ): Promise<IngestionResult> {
    const { source, sourceId } = request;

    return await this.db.transaction(async (tx) => {
      // Update source tracking
      await tx
        .insert(supplierDataSources)
        .values({
          supplierId,
          sourceType: source,
          sourceId,
        })
        .onConflictDoUpdate({
          target: [
            supplierDataSources.supplierId,
            supplierDataSources.sourceType,
            supplierDataSources.sourceId,
          ],
          set: {
            lastSeenAt: sql`NOW()`,
            occurrenceCount: sql`${supplierDataSources.occurrenceCount} + 1`,
          },
        });

      // Update attributes
      await this.updateAttributes(tx, supplierId, request);

      logger.info("Updated existing supplier", {
        supplierId,
        source,
      });

      return {
        success: true,
        action: "updated",
        supplierId,
      };
    });
  }

  /**
   * Add attributes for a new supplier
   */
  private async addAttributes(
    tx: any,
    supplierId: string,
    request: SupplierIngestionRequest,
  ): Promise<void> {
    const { data, source, sourceId, userId } = request;
    const attributes = [];

    // Add addresses
    for (const address of data.addresses) {
      attributes.push({
        supplierId,
        attributeType: AttributeType.ADDRESS,
        value: address,
        hash: AttributeNormalizer.hash(address),
        sourceType: source,
        sourceId,
        confidence: DEFAULT_CONFIDENCE.DOCUMENT_EXTRACTED,
        createdBy: userId,
      });
    }

    // Add contacts
    for (const contact of data.contacts) {
      const type =
        contact.type === "phone"
          ? AttributeType.PHONE
          : contact.type === "email"
            ? AttributeType.EMAIL
            : AttributeType.WEBSITE;

      attributes.push({
        supplierId,
        attributeType: type,
        value: { value: contact.value },
        hash: AttributeNormalizer.hash(contact),
        sourceType: source,
        sourceId,
        confidence: DEFAULT_CONFIDENCE.DOCUMENT_EXTRACTED,
        isPrimary: contact.isPrimary,
        createdBy: userId,
      });
    }

    // Add bank accounts
    for (const bankAccount of data.bankAccounts) {
      attributes.push({
        supplierId,
        attributeType: AttributeType.BANK_ACCOUNT,
        value: bankAccount,
        hash: AttributeNormalizer.hash(bankAccount),
        sourceType: source,
        sourceId,
        confidence: DEFAULT_CONFIDENCE.DOCUMENT_EXTRACTED,
        createdBy: userId,
      });
    }

    if (attributes.length > 0) {
      await tx.insert(supplierAttributes).values(attributes);
    }
  }

  /**
   * Update attributes for existing supplier
   */
  private async updateAttributes(
    tx: any,
    supplierId: string,
    request: SupplierIngestionRequest,
  ): Promise<void> {
    const { data, source, sourceId, userId } = request;

    // Get existing attribute hashes
    const existing = await tx
      .select({ hash: supplierAttributes.hash })
      .from(supplierAttributes)
      .where(eq(supplierAttributes.supplierId, supplierId));

    const existingHashes = new Set(existing.map((a: any) => a.hash));

    // Process each attribute type
    const newAttributes = [];

    // Check addresses
    for (const address of data.addresses) {
      const hash = AttributeNormalizer.hash(address);
      if (!existingHashes.has(hash)) {
        newAttributes.push({
          supplierId,
          attributeType: AttributeType.ADDRESS,
          value: address,
          hash,
          sourceType: source,
          sourceId,
          confidence: DEFAULT_CONFIDENCE.DOCUMENT_EXTRACTED,
          createdBy: userId,
        });
      } else {
        // Update seen count and confidence
        await tx
          .update(supplierAttributes)
          .set({
            lastSeenAt: sql`NOW()`,
            seenCount: sql`${supplierAttributes.seenCount} + 1`,
            confidence: sql`LEAST(${DEFAULT_CONFIDENCE.MAX_CONFIDENCE}, ${supplierAttributes.confidence} + ${DEFAULT_CONFIDENCE.REPEAT_OBSERVATION_INCREMENT})`,
          })
          .where(
            and(
              eq(supplierAttributes.supplierId, supplierId),
              eq(supplierAttributes.hash, hash),
            ),
          );
      }
    }

    // Add new attributes if any
    if (newAttributes.length > 0) {
      await tx.insert(supplierAttributes).values(newAttributes);
    }
  }
}

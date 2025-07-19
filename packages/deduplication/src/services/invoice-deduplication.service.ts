import { documentExtractions, files, type DocumentExtraction, type DrizzleClient, eq, sql } from '@kibly/shared-db';
import { logger } from '@kibly/utils';
import type { InvoiceDeduplicationResult, InvoiceData, ExtractedFieldsData, DeduplicationThresholds } from '../types';
import { HashUtils, ScoringUtils } from '../utils';

export class InvoiceDeduplicationService {
  private readonly thresholds: DeduplicationThresholds = {
    CERTAIN: 0.95,
    LIKELY: 0.85,
    POSSIBLE: 0.70,
    UNLIKELY: 0.50
  };

  constructor(
    private db: DrizzleClient,
    customThresholds?: Partial<DeduplicationThresholds>
  ) {
    if (customThresholds) {
      this.thresholds = { ...this.thresholds, ...customThresholds };
    }
  }

  /**
   * Extract invoice data from extracted fields
   */
  private extractInvoiceData(extractedFields: ExtractedFieldsData): InvoiceData {
    return {
      vendorName: extractedFields.vendorName?.value || extractedFields.supplierName?.value || null,
      invoiceNumber: extractedFields.invoiceNumber?.value || extractedFields.invoiceNo?.value || null,
      invoiceDate: extractedFields.invoiceDate?.value || extractedFields.date?.value || null,
      totalAmount: extractedFields.totalAmount?.value || extractedFields.total?.value || null,
      currency: extractedFields.currency?.value || 'GBP'
    };
  }

  /**
   * Check for duplicate invoices
   */
  async checkInvoiceDuplicate(
    extractionId: string,
    extractedFields: ExtractedFieldsData,
    tenantId: string
  ): Promise<InvoiceDeduplicationResult> {
    try {
      const invoiceData = this.extractInvoiceData(extractedFields);
      
      // Generate fingerprint
      const invoiceFingerprint = HashUtils.generateInvoiceFingerprint(
        invoiceData.vendorName,
        invoiceData.invoiceNumber,
        invoiceData.invoiceDate,
        invoiceData.totalAmount,
        invoiceData.currency
      );

      logger.info('Checking for invoice duplicates', {
        extractionId,
        invoiceFingerprint,
        vendorName: invoiceData.vendorName,
        invoiceNumber: invoiceData.invoiceNumber
      });

      // First, check for exact fingerprint match
      const exactMatches = await this.findExactMatches(
        invoiceFingerprint,
        tenantId,
        extractionId
      );

      if (exactMatches.length > 0) {
        const match = exactMatches[0];
        logger.info('Exact invoice duplicate found', {
          duplicateExtractionId: match.id,
          invoiceFingerprint
        });

        return {
          isDuplicate: true,
          duplicateExtractionId: match.id,
          invoiceFingerprint,
          duplicateConfidence: 1.0,
          duplicateType: 'exact'
        };
      }

      // If no exact match, check for similar invoices
      const similarMatches = await this.findSimilarInvoices(
        invoiceData,
        tenantId,
        extractionId
      );

      if (similarMatches.length > 0) {
        const bestMatch = similarMatches[0];
        const matchData = this.extractInvoiceData(bestMatch.extractedFields as ExtractedFieldsData);
        
        // Calculate similarity scores
        const scores = {
          vendorMatch: ScoringUtils.calculateVendorSimilarity(
            invoiceData.vendorName,
            matchData.vendorName
          ),
          invoiceNumberMatch: ScoringUtils.calculateInvoiceNumberMatch(
            invoiceData.invoiceNumber,
            matchData.invoiceNumber
          ),
          dateProximity: ScoringUtils.calculateDateProximity(
            invoiceData.invoiceDate,
            matchData.invoiceDate
          ),
          amountMatch: ScoringUtils.calculateAmountMatch(
            invoiceData.totalAmount,
            matchData.totalAmount
          ),
          overallScore: 0
        };

        scores.overallScore = ScoringUtils.calculateOverallScore(scores);

        const duplicateType = this.determineDuplicateType(scores.overallScore);
        const isDuplicate = duplicateType !== 'unique';

        logger.info('Similar invoice found', {
          duplicateExtractionId: bestMatch.id,
          scores,
          duplicateType
        });

        return {
          isDuplicate,
          duplicateExtractionId: isDuplicate ? bestMatch.id : undefined,
          invoiceFingerprint,
          duplicateConfidence: scores.overallScore,
          duplicateType,
          similarityScores: scores
        };
      }

      // No duplicates found
      return {
        isDuplicate: false,
        invoiceFingerprint,
        duplicateConfidence: 0,
        duplicateType: 'unique'
      };
    } catch (error) {
      logger.error('Error checking invoice duplicate', { error, extractionId });
      throw error;
    }
  }

  /**
   * Find exact fingerprint matches
   */
  private async findExactMatches(
    invoiceFingerprint: string,
    tenantId: string,
    excludeExtractionId: string
  ): Promise<DocumentExtraction[]> {
    const query = sql`
      SELECT de.*
      FROM ${documentExtractions} de
      JOIN ${files} f ON de.file_id = f.id
      WHERE f.tenant_id = ${tenantId}
        AND de.invoice_fingerprint = ${invoiceFingerprint}
        AND de.id != ${excludeExtractionId}
      LIMIT 1
    `;

    const results = await this.db.execute(query);
    return results as unknown as DocumentExtraction[];
  }

  /**
   * Find similar invoices based on key fields
   */
  private async findSimilarInvoices(
    invoiceData: InvoiceData,
    tenantId: string,
    excludeExtractionId: string
  ): Promise<DocumentExtraction[]> {
    if (!invoiceData.vendorName && !invoiceData.invoiceNumber) {
      return [];
    }

    // Build conditions for similar invoices
    const conditions = [];
    
    if (invoiceData.vendorName) {
      conditions.push(sql`
        (de.extracted_fields->>'vendorName' ILIKE ${`%${invoiceData.vendorName}%`}
         OR de.extracted_fields->>'supplierName' ILIKE ${`%${invoiceData.vendorName}%`})
      `);
    }
    
    if (invoiceData.invoiceNumber) {
      conditions.push(sql`
        (de.extracted_fields->>'invoiceNumber' = ${invoiceData.invoiceNumber}
         OR de.extracted_fields->>'invoiceNo' = ${invoiceData.invoiceNumber})
      `);
    }

    const whereClause = conditions.length > 0 
      ? sql`AND (${sql.join(conditions, sql` OR `)})`
      : sql``;

    const query = sql`
      SELECT de.*
      FROM ${documentExtractions} de
      JOIN ${files} f ON de.file_id = f.id
      WHERE f.tenant_id = ${tenantId}
        AND de.id != ${excludeExtractionId}
        AND de.document_type IN ('invoice', 'receipt', 'purchase_order')
        ${whereClause}
      LIMIT 10
    `;

    const results = await this.db.execute(query);
    return results as unknown as DocumentExtraction[];
  }

  /**
   * Determine duplicate type based on confidence score
   */
  private determineDuplicateType(overallScore: number): 'exact' | 'likely' | 'possible' | 'unique' {
    if (overallScore >= this.thresholds.CERTAIN) return 'exact';
    if (overallScore >= this.thresholds.LIKELY) return 'likely';
    if (overallScore >= this.thresholds.POSSIBLE) return 'possible';
    return 'unique';
  }

  /**
   * Update document extraction with duplicate information
   */
  async updateDuplicateStatus(
    extractionId: string,
    result: InvoiceDeduplicationResult
  ): Promise<void> {
    try {
      // Map duplicate types to enum values
      const statusMap = {
        'exact': 'duplicate' as const,
        'likely': 'possible_duplicate' as const,
        'possible': 'possible_duplicate' as const,
        'unique': 'unique' as const
      };

      await this.db
        .update(documentExtractions)
        .set({
          invoiceFingerprint: result.invoiceFingerprint,
          duplicateConfidence: result.duplicateConfidence.toString(),
          duplicateCandidateId: result.duplicateExtractionId || null,
          duplicateStatus: statusMap[result.duplicateType],
          updatedAt: new Date()
        })
        .where(eq(documentExtractions.id, extractionId));

      logger.info('Updated document extraction with duplicate status', {
        extractionId,
        duplicateType: result.duplicateType,
        duplicateConfidence: result.duplicateConfidence
      });
    } catch (error) {
      logger.error('Error updating duplicate status', { error, extractionId });
      throw error;
    }
  }

  /**
   * Get duplicate chain for an extraction
   */
  async getDuplicateChain(extractionId: string): Promise<DocumentExtraction[]> {
    try {
      const extraction = await this.db
        .select()
        .from(documentExtractions)
        .where(eq(documentExtractions.id, extractionId))
        .limit(1);

      if (!extraction[0] || !extraction[0].invoiceFingerprint) {
        return [];
      }

      const chain = await this.db
        .select()
        .from(documentExtractions)
        .where(eq(documentExtractions.invoiceFingerprint, extraction[0].invoiceFingerprint))
        .orderBy(documentExtractions.createdAt);

      return chain;
    } catch (error) {
      logger.error('Error getting duplicate chain', { error, extractionId });
      throw error;
    }
  }
}
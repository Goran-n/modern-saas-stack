import { getConfig } from "@figgy/config";
import { DeduplicationService } from "@figgy/deduplication";
import {
  documentExtractions,
  eq,
  files,
  getDatabaseConnection,
  sql,
} from "@figgy/shared-db";
import { z } from "zod";
import { createTRPCRouter } from "../trpc";
import { protectedProcedure } from "../trpc/procedures";

export const duplicatesRouter = createTRPCRouter({
  /**
   * Check if a file is a duplicate before uploading
   */
  checkFileHash: protectedProcedure
    .input(
      z.object({
        contentHash: z.string().length(64),
        fileSize: z.number().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) {
        throw new Error("Tenant ID is required");
      }

      const deduplicationService = new DeduplicationService();

      const result = await deduplicationService.checkFileDuplicate(
        input.contentHash,
        input.fileSize,
        ctx.tenantId,
      );

      return {
        isDuplicate: result.isDuplicate,
        duplicateFileId: result.duplicateFileId,
        confidence: result.confidence,
      };
    }),

  /**
   * Get duplicate status for a document extraction
   */
  getExtractionDuplicates: protectedProcedure
    .input(
      z.object({
        extractionId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) {
        throw new Error("Tenant ID is required");
      }

      const config = getConfig().getCore();
      const db = getDatabaseConnection(config.DATABASE_URL);

      // Get extraction with file info
      const query = sql`
        SELECT 
          de.*,
          f.tenant_id
        FROM ${documentExtractions} de
        JOIN ${files} f ON de.file_id = f.id
        WHERE de.id = ${input.extractionId}
          AND f.tenant_id = ${ctx.tenantId}
      `;

      const [extraction] = await db.execute(query);

      if (!extraction) {
        throw new Error("Document extraction not found");
      }

      // Get duplicate chain if fingerprint exists
      const deduplicationService = new DeduplicationService();
      const duplicateChain = await deduplicationService.getDuplicateChain(
        input.extractionId,
      );

      return {
        extraction: {
          id: extraction.id,
          duplicateStatus: extraction.duplicate_status,
          duplicateConfidence: extraction.duplicate_confidence,
          duplicateCandidateId: extraction.duplicate_candidate_id,
          invoiceFingerprint: extraction.invoice_fingerprint,
        },
        duplicateChain: duplicateChain.map((doc: any) => ({
          id: doc.id,
          fileId: doc.fileId,
          documentType: doc.documentType,
          createdAt: doc.createdAt,
          extractedFields: doc.extractedFields,
        })),
      };
    }),

  /**
   * Get all duplicates in the system
   */
  listDuplicates: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        duplicateType: z.enum(["exact", "likely", "possible"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) {
        throw new Error("Tenant ID is required");
      }

      const config = getConfig().getCore();
      const db = getDatabaseConnection(config.DATABASE_URL);

      let whereClause = sql`f.tenant_id = ${ctx.tenantId} AND de.duplicate_status != 'unique'`;

      if (input.duplicateType) {
        whereClause = sql`${whereClause} AND de.duplicate_status = ${input.duplicateType}`;
      }

      const query = sql`
        SELECT 
          de.id,
          de.file_id,
          de.document_type,
          de.duplicate_status,
          de.duplicate_confidence,
          de.duplicate_candidate_id,
          de.invoice_fingerprint,
          de.created_at,
          f.file_name,
          f.size,
          json_build_object(
            'vendorName', de.extracted_fields->>'vendorName',
            'invoiceNumber', de.extracted_fields->>'invoiceNumber',
            'invoiceDate', de.extracted_fields->>'invoiceDate',
            'totalAmount', de.extracted_fields->>'totalAmount'
          ) as key_fields
        FROM ${documentExtractions} de
        JOIN ${files} f ON de.file_id = f.id
        WHERE ${whereClause}
        ORDER BY de.created_at DESC
        LIMIT ${input.limit}
        OFFSET ${input.offset}
      `;

      const countQuery = sql`
        SELECT COUNT(*) as total
        FROM ${documentExtractions} de
        JOIN ${files} f ON de.file_id = f.id
        WHERE ${whereClause}
      `;

      const [duplicates, countResult] = await Promise.all([
        db.execute(query),
        db.execute(countQuery),
      ]);

      const total = (countResult[0] as any)?.total || 0;

      return {
        duplicates: duplicates.map((row: any) => ({
          id: row.id,
          fileId: row.file_id,
          fileName: row.file_name,
          fileSize: row.size,
          documentType: row.document_type,
          duplicateStatus: row.duplicate_status,
          duplicateConfidence: parseFloat(row.duplicate_confidence || "0"),
          duplicateCandidateId: row.duplicate_candidate_id,
          invoiceFingerprint: row.invoice_fingerprint,
          createdAt: row.created_at,
          keyFields: row.key_fields,
        })),
        total: parseInt(String(total)),
        hasMore: input.offset + input.limit < parseInt(String(total)),
      };
    }),

  /**
   * Manually mark extraction as duplicate/not duplicate
   */
  updateDuplicateStatus: protectedProcedure
    .input(
      z.object({
        extractionId: z.string().uuid(),
        duplicateStatus: z.enum([
          "unique",
          "duplicate",
          "possible_duplicate",
          "reviewing",
        ]),
        duplicateCandidateId: z.string().uuid().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) {
        throw new Error("Tenant ID is required");
      }

      const config = getConfig().getCore();
      const db = getDatabaseConnection(config.DATABASE_URL);

      // Verify extraction belongs to tenant
      const verifyQuery = sql`
        SELECT de.id
        FROM ${documentExtractions} de
        JOIN ${files} f ON de.file_id = f.id
        WHERE de.id = ${input.extractionId}
          AND f.tenant_id = ${ctx.tenantId}
      `;

      const [exists] = await db.execute(verifyQuery);
      if (!exists) {
        throw new Error("Document extraction not found");
      }

      // Update status
      const updateData: any = {
        duplicateStatus: input.duplicateStatus,
        updatedAt: new Date(),
      };
      
      if (input.duplicateCandidateId !== undefined) {
        updateData.duplicateCandidateId = input.duplicateCandidateId;
      }
      
      await db
        .update(documentExtractions)
        .set(updateData)
        .where(eq(documentExtractions.id, input.extractionId));

      return { success: true };
    }),

  /**
   * Get file duplicate statistics
   */
  getDuplicateStats: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.tenantId) {
      throw new Error("Tenant ID is required");
    }

    const config = getConfig().getCore();
    const db = getDatabaseConnection(config.DATABASE_URL);

    const statsQuery = sql`
        SELECT 
          COUNT(DISTINCT f.id) as total_files,
          COUNT(DISTINCT CASE WHEN f.content_hash IS NOT NULL THEN f.id END) as files_with_hash,
          COUNT(DISTINCT de.id) as total_extractions,
          COUNT(DISTINCT CASE WHEN de.duplicate_status = 'duplicate' THEN de.id END) as exact_duplicates,
          COUNT(DISTINCT CASE WHEN de.duplicate_status = 'likely' THEN de.id END) as likely_duplicates,
          COUNT(DISTINCT CASE WHEN de.duplicate_status = 'possible_duplicate' THEN de.id END) as possible_duplicates,
          COUNT(DISTINCT de.invoice_fingerprint) as unique_invoices
        FROM ${files} f
        LEFT JOIN ${documentExtractions} de ON de.file_id = f.id
        WHERE f.tenant_id = ${ctx.tenantId}
      `;

    const duplicatesByTypeQuery = sql`
        SELECT 
          de.document_type,
          COUNT(*) as count
        FROM ${documentExtractions} de
        JOIN ${files} f ON de.file_id = f.id
        WHERE f.tenant_id = ${ctx.tenantId}
          AND de.duplicate_status != 'unique'
        GROUP BY de.document_type
      `;

    const [[stats], duplicatesByType] = await Promise.all([
      db.execute(statsQuery),
      db.execute(duplicatesByTypeQuery),
    ]);

    if (!stats) {
      throw new Error("Unable to retrieve duplicate statistics");
    }

    return {
      totalFiles: parseInt(stats.total_files as string),
      filesWithHash: parseInt(stats.files_with_hash as string),
      totalExtractions: parseInt(stats.total_extractions as string),
      duplicates: {
        exact: parseInt(stats.exact_duplicates as string),
        likely: parseInt(stats.likely_duplicates as string),
        possible: parseInt(stats.possible_duplicates as string),
      },
      uniqueInvoices: parseInt(stats.unique_invoices as string),
      duplicatesByDocumentType: duplicatesByType.map((row: any) => ({
        documentType: row.document_type,
        count: parseInt(row.count),
      })),
    };
  }),
});

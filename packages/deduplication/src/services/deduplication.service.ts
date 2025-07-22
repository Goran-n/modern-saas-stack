import { getConfig } from "@figgy/config";
import { type DrizzleClient, getDatabaseConnection } from "@figgy/shared-db";
import { logger } from "@figgy/utils";
import type {
  ExtractedFieldsData,
  FileDeduplicationResult,
  InvoiceDeduplicationResult,
} from "../types";
import { FileDeduplicationService } from "./file-deduplication.service";
import { InvoiceDeduplicationService } from "./invoice-deduplication.service";

export class DeduplicationService {
  private fileService: FileDeduplicationService;
  private invoiceService: InvoiceDeduplicationService;
  private db: DrizzleClient;

  constructor(db?: DrizzleClient) {
    const config = getConfig().getCore();
    this.db = db || getDatabaseConnection(config.DATABASE_URL);

    this.fileService = new FileDeduplicationService(this.db);
    this.invoiceService = new InvoiceDeduplicationService(this.db);
  }

  /**
   * Stage 1: Check file-level duplication
   */
  async checkFileDuplicate(
    contentHash: string,
    fileSize: number,
    tenantId: string,
    excludeFileId?: string,
  ): Promise<FileDeduplicationResult> {
    return this.fileService.checkFileDuplicate(
      contentHash,
      fileSize,
      tenantId,
      excludeFileId,
    );
  }

  /**
   * Stage 2: Check invoice-level duplication
   */
  async checkInvoiceDuplicate(
    extractionId: string,
    extractedFields: ExtractedFieldsData,
    tenantId: string,
  ): Promise<InvoiceDeduplicationResult> {
    return this.invoiceService.checkInvoiceDuplicate(
      extractionId,
      extractedFields,
      tenantId,
    );
  }

  /**
   * Calculate and store file hash
   */
  async calculateAndStoreFileHash(
    fileId: string,
    fileContent: Buffer,
  ): Promise<string> {
    return this.fileService.calculateAndStoreFileHash(fileId, fileContent);
  }

  /**
   * Update document extraction with duplicate information
   */
  async updateInvoiceDuplicateStatus(
    extractionId: string,
    result: InvoiceDeduplicationResult,
  ): Promise<void> {
    return this.invoiceService.updateDuplicateStatus(extractionId, result);
  }

  /**
   * Check if file should be processed
   */
  async shouldProcessFile(
    fileId: string,
    contentHash: string,
    fileSize: number,
    tenantId: string,
  ): Promise<{
    shouldProcess: boolean;
    reason?: string;
    duplicateFileId?: string;
  }> {
    return this.fileService.shouldProcessFile(
      fileId,
      contentHash,
      fileSize,
      tenantId,
    );
  }

  /**
   * Get duplicate chain for an extraction
   */
  async getDuplicateChain(extractionId: string) {
    return this.invoiceService.getDuplicateChain(extractionId);
  }

  /**
   * Full deduplication flow for a file
   */
  async performFullDeduplication(params: {
    fileId: string;
    fileContent: Buffer;
    tenantId: string;
    extractedFields?: ExtractedFieldsData;
    extractionId?: string;
  }): Promise<{
    fileResult: FileDeduplicationResult;
    invoiceResult?: InvoiceDeduplicationResult;
    shouldProcess: boolean;
  }> {
    try {
      // Stage 1: File-level deduplication
      const contentHash = await this.calculateAndStoreFileHash(
        params.fileId,
        params.fileContent,
      );
      const fileResult = await this.checkFileDuplicate(
        contentHash,
        params.fileContent.length,
        params.tenantId,
        params.fileId,
      );

      // If exact file duplicate, no need to process
      if (fileResult.isDuplicate) {
        logger.info("File is exact duplicate, skipping processing", {
          fileId: params.fileId,
          duplicateFileId: fileResult.duplicateFileId,
        });
        return {
          fileResult,
          shouldProcess: false,
        };
      }

      // Stage 2: Invoice-level deduplication (if applicable)
      let invoiceResult: InvoiceDeduplicationResult | undefined;
      if (params.extractedFields && params.extractionId) {
        invoiceResult = await this.checkInvoiceDuplicate(
          params.extractionId,
          params.extractedFields,
          params.tenantId,
        );

        // Update extraction with duplicate status
        await this.updateInvoiceDuplicateStatus(
          params.extractionId,
          invoiceResult,
        );

        // Determine if we should process based on duplicate type
        const shouldProcess =
          invoiceResult.duplicateType === "unique" ||
          invoiceResult.duplicateType === "possible";

        if (!shouldProcess) {
          logger.info("Invoice is likely duplicate, may skip processing", {
            extractionId: params.extractionId,
            duplicateType: invoiceResult.duplicateType,
            duplicateConfidence: invoiceResult.duplicateConfidence,
          });
        }

        return {
          fileResult,
          invoiceResult,
          shouldProcess,
        };
      }

      return {
        fileResult,
        shouldProcess: true,
      };
    } catch (error) {
      logger.error("Error in full deduplication flow", {
        error,
        fileId: params.fileId,
      });
      // In case of error, allow processing to continue
      return {
        fileResult: {
          isDuplicate: false,
          contentHash: "",
          confidence: 0,
        },
        shouldProcess: true,
      };
    }
  }
}

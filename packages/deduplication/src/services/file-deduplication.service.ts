import {
  and,
  type DrizzleClient,
  eq,
  type File,
  files,
  ne,
} from "@figgy/shared-db";
import { logger } from "@figgy/utils";
import type { FileDeduplicationResult } from "../types";
import { HashUtils } from "../utils";

export class FileDeduplicationService {
  constructor(private db: DrizzleClient) {}

  /**
   * Check if a file is a duplicate based on content hash
   */
  async checkFileDuplicate(
    contentHash: string,
    fileSize: number,
    tenantId: string,
    excludeFileId?: string,
  ): Promise<FileDeduplicationResult> {
    try {
      logger.info("Checking for file duplicates", {
        contentHash,
        fileSize,
        tenantId,
        excludeFileId,
      });

      // Build query conditions
      const conditions = [
        eq(files.tenantId, tenantId),
        eq(files.contentHash, contentHash),
        eq(files.fileSize, fileSize),
      ];

      if (excludeFileId) {
        conditions.push(ne(files.id, excludeFileId));
      }

      // Look for existing files with same hash and size
      const duplicates = await this.db
        .select()
        .from(files)
        .where(and(...conditions))
        .limit(1);

      if (duplicates.length > 0) {
        const duplicate = duplicates[0];
        logger.info("File duplicate found", {
          duplicateFileId: duplicate.id,
          fileName: duplicate.fileName,
          contentHash,
        });

        return {
          isDuplicate: true,
          duplicateFileId: duplicate.id,
          contentHash,
          confidence: 1.0, // Exact hash match = 100% confidence
        };
      }

      logger.info("No file duplicate found", { contentHash });
      return {
        isDuplicate: false,
        contentHash,
        confidence: 0,
      };
    } catch (error) {
      logger.error("Error checking file duplicate", { error, contentHash });
      throw error;
    }
  }

  /**
   * Calculate and store file hash
   */
  async calculateAndStoreFileHash(
    fileId: string,
    fileContent: Buffer,
  ): Promise<string> {
    try {
      const contentHash = await HashUtils.calculateFileHash(fileContent);
      const fileSize = fileContent.length;

      // Update file record with hash and size
      await this.db
        .update(files)
        .set({
          contentHash,
          fileSize,
          updatedAt: new Date(),
        })
        .where(eq(files.id, fileId));

      logger.info("File hash calculated and stored", {
        fileId,
        contentHash,
        fileSize,
      });

      return contentHash;
    } catch (error) {
      logger.error("Error calculating file hash", { error, fileId });
      throw error;
    }
  }

  /**
   * Get file by content hash
   */
  async getFileByHash(
    contentHash: string,
    tenantId: string,
  ): Promise<File | null> {
    try {
      const [file] = await this.db
        .select()
        .from(files)
        .where(
          and(eq(files.tenantId, tenantId), eq(files.contentHash, contentHash)),
        )
        .limit(1);

      return file || null;
    } catch (error) {
      logger.error("Error getting file by hash", { error, contentHash });
      throw error;
    }
  }

  /**
   * Check if file should be processed based on duplicate status
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
    try {
      // Check for duplicates
      const duplicationResult = await this.checkFileDuplicate(
        contentHash,
        fileSize,
        tenantId,
        fileId,
      );

      if (duplicationResult.isDuplicate) {
        return {
          shouldProcess: false,
          reason: "Duplicate file already processed",
          duplicateFileId: duplicationResult.duplicateFileId,
        };
      }

      return { shouldProcess: true };
    } catch (error) {
      logger.error("Error checking if file should be processed", {
        error,
        fileId,
      });
      // In case of error, allow processing to continue
      return { shouldProcess: true };
    }
  }
}

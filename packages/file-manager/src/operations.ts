import { getConfig } from "@figgy/config";
import { DeduplicationService, HashUtils } from "@figgy/deduplication";
import type { CategorizeFilePayload } from "@figgy/jobs";
import {
  and,
  desc,
  documentExtractions,
  eq,
  files,
  gte,
  inArray,
  sql,
  suppliers,
} from "@figgy/shared-db";
import { download, remove, signedUrl, upload } from "@figgy/supabase-storage";
import { createLogger, stripSpecialCharacters } from "@figgy/utils";
import { tasks } from "@trigger.dev/sdk/v3";
import { getClient } from "./client";
import { getDb } from "./db";
import type { CreateFileInput, ProcessingStatus } from "./types";

const logger = createLogger("file-manager");

/**
 * Upload a file and create a database record
 * @param file - File object to upload
 * @param input - File creation input
 * @returns Promise resolving to the created file ID
 */
export async function uploadFile(
  file: File,
  input: CreateFileInput,
): Promise<string> {
  const sanitisedFileName = stripSpecialCharacters(file.name);
  const fullPath = [...input.pathTokens, sanitisedFileName];

  // Get bucket from input or config
  const config = getConfig().getForFileManager();
  const bucket = input.bucket || config.STORAGE_BUCKET;

  logger.info("Uploading file", {
    fileName: file.name,
    sanitisedFileName,
    tenantId: input.tenantId,
    source: input.source,
    bucket,
  });

  // Upload to Supabase Storage
  const client = getClient();
  const publicUrl = await upload(client, {
    file,
    path: fullPath,
    bucket,
  });

  // Calculate file hash for deduplication
  const fileBuffer = await file.arrayBuffer();
  const db = getDb();
  const deduplicationService = new DeduplicationService(db);
  // Just calculate hash without storing (we'll store it during insert)
  const contentHash = await HashUtils.calculateFileHash(
    Buffer.from(fileBuffer),
  );

  // Check for duplicates
  const duplicateCheck = await deduplicationService.checkFileDuplicate(
    contentHash,
    file.size,
    input.tenantId,
  );

  if (duplicateCheck.isDuplicate) {
    logger.warn("File is a duplicate", {
      fileName: file.name,
      duplicateFileId: duplicateCheck.duplicateFileId,
      contentHash,
    });
  }

  // Save to database
  const [record] = await db
    .insert(files)
    .values({
      ...input,
      sourceId: input.sourceId || null,
      fileName: sanitisedFileName,
      pathTokens: fullPath,
      bucket,
      contentHash,
      fileSize: file.size,
    })
    .returning();

  if (!record) {
    throw new Error("Failed to create file record");
  }

  logger.info("File uploaded and record created", {
    fileId: record.id,
    publicUrl,
    tenantId: input.tenantId,
  });

  // Trigger categorization job with tenant-based concurrency control
  try {
    await tasks.trigger("categorize-file", {
      fileId: record.id,
      tenantId: record.tenantId,
      mimeType: record.mimeType,
      size: record.size,
      pathTokens: record.pathTokens,
      source: record.source,
    } satisfies CategorizeFilePayload, {
      queue: {
        name: `tenant-${record.tenantId}`,
      },
    });

    logger.info("File categorization job triggered with concurrency control", {
      fileId: record.id,
      concurrencyKey: `tenant-${record.tenantId}`,
      tenantId: record.tenantId,
    });
  } catch (error) {
    logger.error("Failed to trigger categorization job", {
      fileId: record.id,
      tenantId: record.tenantId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Don't throw - file is already uploaded successfully
  }

  return record.id;
}

/**
 * Upload a file from base64 data
 * @param input - File upload input including base64 data
 * @returns Promise resolving to the created file record
 */
export async function uploadFileFromBase64(input: {
  fileName: string;
  mimeType: string;
  size: number;
  base64Data: string;
  tenantId: string;
  uploadedBy: string;
  source?: string;
  metadata?: Record<string, any>;
}): Promise<{
  id: string;
  fileName: string;
  size: number;
  mimeType: string;
  createdAt: Date;
}> {
  const sanitisedFileName = input.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const timestamp = Date.now();
  const fileName = `${timestamp}_${sanitisedFileName}`;
  const pathTokens = [input.tenantId, input.uploadedBy, fileName];
  const fullPath = pathTokens.join("/");

  logger.info("Uploading file from base64", {
    fileName: input.fileName,
    sanitisedFileName,
    pathTokens,
    fullPath,
    tenantId: input.tenantId,
    size: input.size,
  });

  // Convert base64 to buffer
  const fileBuffer = Buffer.from(input.base64Data, "base64");

  // Calculate file hash for deduplication
  let contentHash: string;
  const db = getDb();
  const deduplicationService = new DeduplicationService(db);

  try {
    // Just calculate hash without storing (we'll store it during insert)
    contentHash = await HashUtils.calculateFileHash(fileBuffer);
  } catch (hashError) {
    logger.error("Error calculating file hash", {
      error: hashError instanceof Error ? hashError.message : String(hashError),
      stack: hashError instanceof Error ? hashError.stack : undefined,
      fileName: input.fileName,
      bufferLength: fileBuffer.length,
    });
    throw hashError;
  }

  // Check for duplicates
  const duplicateCheck = await deduplicationService.checkFileDuplicate(
    contentHash,
    fileBuffer.length,
    input.tenantId,
  );

  if (duplicateCheck.isDuplicate) {
    logger.warn("File is a duplicate", {
      fileName: input.fileName,
      duplicateFileId: duplicateCheck.duplicateFileId,
      contentHash,
    });
  }

  // Get bucket from config
  const config = getConfig().getForFileManager();
  const bucket = config.STORAGE_BUCKET || "vault";

  logger.info("Uploading to Supabase Storage", {
    bucket,
    fullPath,
    fileSize: fileBuffer.length,
    mimeType: input.mimeType,
  });

  // Upload to Supabase Storage
  const client = getClient();
  const { error: uploadError } = await client.storage
    .from(bucket)
    .upload(fullPath, fileBuffer, {
      contentType: input.mimeType,
      upsert: false,
    });

  if (uploadError) {
    logger.error("Supabase upload failed", {
      error: uploadError.message,
      bucket,
      path: fullPath,
      statusCode: (uploadError as any).statusCode,
    });
    throw uploadError;
  }

  const {
    data: { publicUrl },
  } = client.storage.from(bucket).getPublicUrl(fullPath);

  // Save to database
  let fileRecord;
  const insertData = {
    tenantId: input.tenantId,
    uploadedBy: input.uploadedBy,
    fileName: fileName, // Use the timestamped filename
    pathTokens,
    mimeType: input.mimeType,
    size: Number(input.size), // Ensure it's a number for bigint
    source: (input.source || "user_upload") as
      | "user_upload"
      | "integration"
      | "whatsapp"
      | "slack",
    metadata: {
      originalName: input.fileName,
      publicUrl,
      isDuplicate: duplicateCheck.isDuplicate,
      duplicateFileId: duplicateCheck.duplicateFileId,
      ...input.metadata,
    },
    bucket,
    contentHash,
    fileSize: Number(fileBuffer.length), // Ensure it's a number for bigint
  };

  try {
    logger.info("Inserting file record", {
      fileName: fileName,
      originalFileName: input.fileName,
      tenantId: input.tenantId,
      uploadedBy: input.uploadedBy,
      contentHash,
      fileSize: fileBuffer.length,
      pathTokens,
      source: input.source || "user_upload",
      bucket,
      mimeType: input.mimeType,
      hasMetadata: !!insertData.metadata,
      metadataKeys: insertData.metadata ? Object.keys(insertData.metadata) : [],
    });

    // Log the exact insert data for debugging
    logger.debug("Insert data details", {
      tenantIdType: typeof insertData.tenantId,
      tenantIdValue: insertData.tenantId,
      uploadedByType: typeof insertData.uploadedBy,
      uploadedByValue: insertData.uploadedBy,
      sizeType: typeof insertData.size,
      sizeValue: insertData.size,
      fileSizeType: typeof insertData.fileSize,
      fileSizeValue: insertData.fileSize,
    });

    const result = await db.insert(files).values(insertData).returning();

    fileRecord = result[0];

    if (!fileRecord) {
      throw new Error("Failed to create file record - no record returned");
    }
  } catch (dbError) {
    logger.error("Database insert failed", dbError, {
      fileName: input.fileName,
      tenantId: input.tenantId,
      insertData,
    });
    throw dbError;
  }

  logger.info("File uploaded successfully", {
    fileId: fileRecord.id,
    tenantId: input.tenantId,
  });

  // Trigger categorization job with tenant-based concurrency control
  try {
    await tasks.trigger("categorize-file", {
      fileId: fileRecord.id,
      tenantId: fileRecord.tenantId,
      mimeType: fileRecord.mimeType,
      size: fileRecord.size,
      pathTokens: fileRecord.pathTokens,
      source: fileRecord.source,
    } satisfies CategorizeFilePayload, {
      queue: {
        name: `tenant-${fileRecord.tenantId}`,
      },
    });

    logger.info("File categorization job triggered with concurrency control", {
      fileId: fileRecord.id,
      concurrencyKey: `tenant-${fileRecord.tenantId}`,
    });
  } catch (error) {
    logger.error("Failed to trigger categorization job", {
      fileId: fileRecord.id,
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - file is already uploaded successfully
  }

  return {
    id: fileRecord.id,
    fileName: fileRecord.fileName,
    size: fileRecord.size,
    mimeType: fileRecord.mimeType,
    createdAt: fileRecord.createdAt,
  };
}

/**
 * Download a file by ID
 * @param fileId - File ID to download
 * @param tenantId - Tenant ID for security
 * @returns Promise resolving to the file blob
 */
export async function downloadFile(
  fileId: string,
  tenantId: string,
): Promise<Blob> {
  logger.info("Downloading file", { fileId, tenantId });

  // Get file record
  const db = getDb();
  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.tenantId, tenantId)));

  if (!file) {
    logger.error("File not found", { fileId, tenantId });
    throw new Error("File not found");
  }

  // Download from Supabase Storage
  const client = getClient();
  const { data } = await download(client, {
    bucket: file.bucket,
    path: file.pathTokens.join("/"),
  });

  logger.info("File downloaded successfully", {
    fileId,
    tenantId,
    size: data.size,
  });

  return data;
}

/**
 * Generate a signed URL for a file
 * @param fileId - File ID
 * @param tenantId - Tenant ID for security
 * @param expiresIn - URL expiration time in seconds
 * @returns Promise resolving to the signed URL
 */
export async function getFileUrl(
  fileId: string,
  tenantId: string,
  expiresIn: number = 3600,
): Promise<string> {
  logger.info("Generating signed URL", { fileId, tenantId, expiresIn });

  // Get file record
  const db = getDb();
  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.tenantId, tenantId)));

  if (!file) {
    logger.error("File not found", { fileId, tenantId });
    throw new Error("File not found");
  }

  // Generate signed URL for inline viewing (not download)
  const client = getClient();
  const { data } = await signedUrl(client, {
    bucket: file.bucket,
    path: file.pathTokens.join("/"),
    expireIn: expiresIn,
    download: false, // Inline viewing for browser extension
  });

  logger.info("Signed URL generated", { fileId, tenantId, expiresIn });

  return data.signedUrl;
}

/**
 * Generate a signed URL with options
 * @param fileId - File ID
 * @param tenantId - Tenant ID for security check
 * @param options - URL generation options
 * @returns Promise resolving to signed URL data
 */
export async function generateSignedUrl(
  fileId: string,
  tenantId: string,
  options: {
    expiresIn?: number;
    download?: boolean;
  } = {},
): Promise<{
  url: string;
  expiresAt: Date;
}> {
  const expiresIn = options.expiresIn || 3600;
  const download = options.download || false;

  logger.info("Generating signed URL", {
    fileId,
    tenantId,
    expiresIn,
    download,
  });

  const db = getDb();
  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.tenantId, tenantId)))
    .limit(1);

  if (!file) {
    throw new Error("File not found");
  }

  const client = getClient();
  const filePath = file.pathTokens.join("/");

  const { data, error } = await client.storage
    .from(file.bucket)
    .createSignedUrl(filePath, expiresIn, {
      download: download,
    });

  if (error || !data) {
    logger.error("Failed to generate signed URL", { error, fileId });
    throw new Error("Failed to generate signed URL");
  }

  return {
    url: data.signedUrl,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
  };
}

/**
 * Delete a file and its database record
 * @param fileId - File ID to delete
 * @param tenantId - Tenant ID for security
 * @returns Promise resolving when file is deleted
 */
export async function deleteFile(
  fileId: string,
  tenantId: string,
): Promise<void> {
  logger.info("Deleting file", { fileId, tenantId });

  // Get file record
  const db = getDb();
  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.tenantId, tenantId)));

  if (!file) {
    logger.error("File not found", { fileId, tenantId });
    throw new Error("File not found");
  }

  // Delete from Supabase Storage
  const client = getClient();
  await remove(client, {
    bucket: file.bucket,
    path: file.pathTokens,
  });

  // Delete from database
  await db.delete(files).where(eq(files.id, fileId));

  logger.info("File deleted successfully", { fileId, tenantId });
}

/**
 * Delete a file by user (checks ownership)
 * @param fileId - File ID to delete
 * @param tenantId - Tenant ID
 * @param userId - User ID (must be the uploader)
 * @returns Promise resolving to success boolean
 */
export async function deleteFileByUser(
  fileId: string,
  tenantId: string,
  userId: string,
): Promise<boolean> {
  logger.info("Deleting file by user", { fileId, tenantId, userId });

  const db = getDb();
  const [file] = await db
    .select()
    .from(files)
    .where(
      and(
        eq(files.id, fileId),
        eq(files.tenantId, tenantId),
        eq(files.uploadedBy, userId),
      ),
    )
    .limit(1);

  if (!file) {
    logger.warn("File not found or user doesn't have permission", {
      fileId,
      tenantId,
      userId,
    });
    return false;
  }

  // Delete from storage
  const client = getClient();
  const filePath = file.pathTokens.join("/");
  const { error: removeError } = await client.storage
    .from(file.bucket)
    .remove([filePath]);

  if (removeError) {
    logger.error("Failed to remove file from storage", {
      error: removeError,
      fileId,
    });
    throw removeError;
  }

  // Delete from database
  await db.delete(files).where(eq(files.id, fileId));

  logger.info("File deleted successfully", { fileId });
  return true;
}

/**
 * Update the processing status of a file
 * @param fileId - File ID
 * @param status - New processing status
 * @returns Promise resolving when status is updated
 */
export async function updateProcessingStatus(
  fileId: string,
  status: ProcessingStatus,
): Promise<void> {
  logger.info("Updating processing status", { fileId, status });

  const db = getDb();
  await db
    .update(files)
    .set({
      processingStatus: status,
      updatedAt: new Date(),
    })
    .where(eq(files.id, fileId));

  logger.info("Processing status updated", { fileId, status });
}

/**
 * Get file by ID
 * @param fileId - File ID
 * @param tenantId - Tenant ID for security check
 * @returns Promise resolving to file record or null
 */
export async function getFileById(
  fileId: string,
  tenantId: string,
): Promise<{
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  processingStatus: ProcessingStatus | null;
  createdAt: Date;
  updatedAt: Date;
} | null> {
  logger.info("Getting file by ID", { fileId, tenantId });

  const db = getDb();
  const [file] = await db
    .select({
      id: files.id,
      fileName: files.fileName,
      mimeType: files.mimeType,
      size: files.size,
      processingStatus: files.processingStatus,
      createdAt: files.createdAt,
      updatedAt: files.updatedAt,
    })
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.tenantId, tenantId)))
    .limit(1);

  return file || null;
}

/**
 * List files with pagination
 * @param tenantId - Tenant ID
 * @param options - Pagination options
 * @returns Promise resolving to paginated file list
 */
export async function listFiles(
  tenantId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<{
  files: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    size: number;
    createdAt: Date;
  }>;
  hasMore: boolean;
}> {
  const limit = options.limit || 20;
  const offset = options.offset || 0;

  logger.info("Listing files", { tenantId, limit, offset });

  const db = getDb();
  const fileList = await db
    .select({
      id: files.id,
      fileName: files.fileName,
      mimeType: files.mimeType,
      size: files.size,
      createdAt: files.createdAt,
    })
    .from(files)
    .where(eq(files.tenantId, tenantId))
    .orderBy(desc(files.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    files: fileList,
    hasMore: fileList.length === limit,
  };
}

/**
 * List files in a specific path
 * @param tenantId - Tenant ID
 * @param path - Path prefix to filter files
 * @returns Promise resolving to array of files
 */
export async function listFilesByPath(
  tenantId: string,
  path: string,
): Promise<
  Array<{
    id: string;
    fileName: string;
    mimeType: string;
    size: number;
    createdAt: Date;
    pathTokens: string[];
  }>
> {
  logger.info("Listing files by path", { tenantId, path });

  const db = getDb();
  const allFiles = await db
    .select({
      id: files.id,
      fileName: files.fileName,
      mimeType: files.mimeType,
      size: files.size,
      createdAt: files.createdAt,
      pathTokens: files.pathTokens,
    })
    .from(files)
    .where(eq(files.tenantId, tenantId));

  // Filter files that match the path prefix
  const matchingFiles = allFiles.filter((file) => {
    const filePath = file.pathTokens.join("/");
    return filePath.includes(path);
  });

  logger.info("Files listed", {
    tenantId,
    path,
    count: matchingFiles.length,
  });

  return matchingFiles;
}

/**
 * Get file with extraction data
 * @param fileId - File ID
 * @param tenantId - Tenant ID for security check
 * @returns Promise resolving to file with extraction or null
 */
export async function getFileWithExtractions(
  fileId: string,
  tenantId: string,
): Promise<{
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  processingStatus: ProcessingStatus | null;
  createdAt: Date;
  updatedAt: Date;
  extraction: any | null;
} | null> {
  logger.info("Getting file with extractions", { fileId, tenantId });

  const db = getDb();
  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.tenantId, tenantId)))
    .limit(1);

  if (!file) {
    return null;
  }

  // Get document extractions for this file
  const [extraction] = await db
    .select()
    .from(documentExtractions)
    .where(eq(documentExtractions.fileId, fileId))
    .orderBy(desc(documentExtractions.createdAt))
    .limit(1);

  return {
    id: file.id,
    fileName: file.fileName,
    mimeType: file.mimeType,
    size: file.size,
    processingStatus: file.processingStatus,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    extraction: extraction || null,
  };
}

/**
 * Get files that have been matched to a specific supplier
 * @param supplierId - Supplier ID to get files for
 * @returns Promise resolving to array of files with extraction metadata
 */
export async function getFilesBySupplier(supplierId: string): Promise<
  Array<{
    id: string;
    fileName: string;
    mimeType: string;
    size: number;
    createdAt: Date;
    pathTokens: string[];
    metadata: any;
    extractionId: string | null;
    documentType: string | null;
    extractionConfidence: string | null;
    matchConfidence: string | null;
  }>
> {
  logger.info("Getting files for supplier", { supplierId });

  const db = getDb();
  const supplierFiles = await db
    .select({
      id: files.id,
      fileName: files.fileName,
      mimeType: files.mimeType,
      size: files.size,
      createdAt: files.createdAt,
      pathTokens: files.pathTokens,
      metadata: files.metadata,
      extractionId: documentExtractions.id,
      documentType: documentExtractions.documentType,
      extractionConfidence: documentExtractions.overallConfidence,
      matchConfidence: documentExtractions.matchConfidence,
    })
    .from(documentExtractions)
    .innerJoin(files, eq(documentExtractions.fileId, files.id))
    .where(eq(documentExtractions.matchedSupplierId, supplierId))
    .orderBy(desc(files.createdAt));

  logger.info("Found files for supplier", {
    supplierId,
    fileCount: supplierFiles.length,
  });

  return supplierFiles;
}

/**
 * Process multiple files in batch
 * @param fileIds - Array of file IDs
 * @param tenantId - Tenant ID for security check
 * @returns Promise resolving to batch processing result
 */
export async function processBatchFiles(
  fileIds: string[],
  tenantId: string,
): Promise<{
  triggered: number;
  jobHandle: string;
}> {
  logger.info("Processing batch files", { fileIds, tenantId });

  const db = getDb();
  const filesToProcess = await db
    .select()
    .from(files)
    .where(and(eq(files.tenantId, tenantId), inArray(files.id, fileIds)));

  if (filesToProcess.length === 0) {
    throw new Error("No files found");
  }

  const jobHandle = await tasks.batchTrigger(
    "categorize-file",
    filesToProcess.map((file) => ({
      payload: {
        fileId: file.id,
        tenantId: file.tenantId,
        mimeType: file.mimeType,
        size: file.size,
        pathTokens: file.pathTokens,
        source: file.source,
      } satisfies CategorizeFilePayload,
    })),
  );

  logger.info("Batch file categorization jobs triggered", {
    count: filesToProcess.length,
    tenantId,
  });

  return {
    triggered: filesToProcess.length,
    jobHandle: jobHandle.batchId,
  };
}

/**
 * Reprocess a file by clearing existing extraction data and re-triggering categorization
 * @param fileId - File ID to reprocess
 * @param tenantId - Tenant ID for security
 * @returns Promise resolving to the job handle
 */
export async function reprocessFile(
  fileId: string,
  tenantId: string,
): Promise<{
  jobHandle: string;
}> {
  logger.info("Reprocessing file", { fileId, tenantId });

  const db = getDb();

  // Get file details and verify ownership
  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.tenantId, tenantId)));

  if (!file) {
    logger.error("File not found for reprocessing", { fileId, tenantId });
    throw new Error("File not found");
  }

  // Check if file is already being processed
  if (file.processingStatus === "processing") {
    logger.warn("File is already being processed", { fileId, tenantId });
    throw new Error("File is already being processed");
  }

  // Clean up existing data and reset status in a transaction
  await db.transaction(async (tx) => {
    // Delete existing document extractions
    await tx
      .delete(documentExtractions)
      .where(eq(documentExtractions.fileId, fileId));

    logger.info("Deleted existing extractions", { fileId });

    // Reset file status and clear supplier linkage from metadata
    const updatedMetadata = {
      ...(typeof file.metadata === "object" && file.metadata !== null
        ? file.metadata
        : {}),
      supplierName: null,
      matchedSupplierId: null,
      displayName: file.fileName, // Reset to original filename
      reprocessedAt: new Date().toISOString(),
      reprocessCount: ((file.metadata as any)?.reprocessCount || 0) + 1,
    };

    await tx
      .update(files)
      .set({
        processingStatus: "pending" as ProcessingStatus,
        metadata: updatedMetadata,
        updatedAt: new Date(),
      })
      .where(eq(files.id, fileId));

    logger.info("Reset file status and metadata", { fileId });
  });

  // Trigger new categorization job with tenant-based concurrency control
  const jobHandle = await tasks.trigger("categorize-file", {
    fileId: file.id,
    tenantId: file.tenantId,
    mimeType: file.mimeType,
    size: file.size,
    pathTokens: file.pathTokens,
    source: file.source,
  } satisfies CategorizeFilePayload, {
    queue: {
      name: `tenant-${file.tenantId}`,
    },
  });

  logger.info("Triggered file reprocessing job with concurrency control", {
    fileId,
    concurrencyKey: `tenant-${file.tenantId}`,
    tenantId,
    jobHandle: jobHandle.id,
  });

  return {
    jobHandle: jobHandle.id,
  };
}

/**
 * Get files grouped by year and supplier
 * @param tenantId - Tenant ID
 * @returns Promise resolving to grouped file data
 */
export async function getFilesGroupedByYear(tenantId: string): Promise<{
  byYear: Record<
    string,
    {
      year: string;
      suppliers: Record<
        string,
        {
          name: string;
          supplierId: string | null;
          files: any[];
          fileCount: number;
        }
      >;
      totalFiles: number;
    }
  >;
  totalFiles: number;
}> {
  logger.info("Getting files grouped by year", { tenantId });

  const db = getDb();
  const filesWithData = await db
    .select({
      id: files.id,
      fileName: files.fileName,
      mimeType: files.mimeType,
      size: files.size,
      processingStatus: files.processingStatus,
      createdAt: files.createdAt,
      updatedAt: files.updatedAt,
      extraction: {
        id: documentExtractions.id,
        documentType: documentExtractions.documentType,
        overallConfidence: documentExtractions.overallConfidence,
        validationStatus: documentExtractions.validationStatus,
        extractedFields: documentExtractions.extractedFields,
      },
      supplier: {
        id: suppliers.id,
        displayName: suppliers.displayName,
        legalName: suppliers.legalName,
      },
    })
    .from(files)
    .leftJoin(documentExtractions, eq(documentExtractions.fileId, files.id))
    .leftJoin(
      suppliers,
      eq(suppliers.id, documentExtractions.matchedSupplierId),
    )
    .where(eq(files.tenantId, tenantId))
    .orderBy(desc(files.createdAt));

  // Group files by year and supplier
  const groupedData: Record<string, any> = {};

  filesWithData.forEach((file) => {
    const year = new Date(file.createdAt).getFullYear().toString();
    const supplierName =
      file.supplier?.displayName ||
      file.supplier?.legalName ||
      "Unknown Supplier";

    if (!groupedData[year]) {
      groupedData[year] = {
        year,
        suppliers: {},
        totalFiles: 0,
      };
    }

    if (!groupedData[year].suppliers[supplierName]) {
      groupedData[year].suppliers[supplierName] = {
        name: supplierName,
        supplierId: file.supplier?.id || null,
        files: [],
        fileCount: 0,
      };
    }

    const fileData = {
      id: file.id,
      fileName: file.fileName,
      mimeType: file.mimeType,
      size: file.size,
      processingStatus: file.processingStatus,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      extraction: file.extraction?.id ? file.extraction : null,
    };

    groupedData[year].suppliers[supplierName].files.push(fileData);
    groupedData[year].suppliers[supplierName].fileCount++;
    groupedData[year].totalFiles++;
  });

  return {
    byYear: groupedData,
    totalFiles: filesWithData.length,
  };
}

/**
 * Get files by processing status
 * @param tenantId - Tenant ID
 * @returns Promise resolving to processing status data
 */
export async function getFilesByProcessingStatus(tenantId: string): Promise<{
  processing: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    size: number;
    processingStatus: ProcessingStatus | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  failed: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    size: number;
    processingStatus: ProcessingStatus | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
}> {
  logger.info("Getting files by processing status", { tenantId });

  const db = getDb();
  const processingFiles = await db
    .select({
      id: files.id,
      fileName: files.fileName,
      mimeType: files.mimeType,
      size: files.size,
      processingStatus: files.processingStatus,
      createdAt: files.createdAt,
      updatedAt: files.updatedAt,
    })
    .from(files)
    .where(
      and(
        eq(files.tenantId, tenantId),
        inArray(files.processingStatus, ["processing", "pending"]),
      ),
    )
    .orderBy(desc(files.createdAt));

  const failedFiles = await db
    .select({
      id: files.id,
      fileName: files.fileName,
      mimeType: files.mimeType,
      size: files.size,
      processingStatus: files.processingStatus,
      createdAt: files.createdAt,
      updatedAt: files.updatedAt,
    })
    .from(files)
    .where(
      and(eq(files.tenantId, tenantId), eq(files.processingStatus, "failed")),
    )
    .orderBy(desc(files.createdAt));

  return {
    processing: processingFiles,
    failed: failedFiles,
  };
}

/**
 * Get files by supplier and year
 * @param tenantId - Tenant ID
 * @param year - Year to filter by
 * @param supplierId - Optional supplier ID to filter by
 * @returns Promise resolving to filtered file list
 */
export async function getFilesBySupplierAndYear(
  tenantId: string,
  year: string,
  supplierId?: string,
): Promise<
  Array<{
    id: string;
    fileName: string;
    mimeType: string;
    size: number;
    processingStatus: ProcessingStatus | null;
    createdAt: Date;
    updatedAt: Date;
    extraction: any | null;
    supplier: any | null;
  }>
> {
  logger.info("Getting files by supplier and year", {
    tenantId,
    year,
    supplierId,
  });

  const db = getDb();
  const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
  const endOfYear = new Date(`${parseInt(year) + 1}-01-01T00:00:00.000Z`);

  const baseConditions = [
    eq(files.tenantId, tenantId),
    gte(files.createdAt, startOfYear),
    sql`${files.createdAt} < ${endOfYear}`,
  ];

  if (supplierId) {
    baseConditions.push(eq(documentExtractions.matchedSupplierId, supplierId));
  }

  const query = db
    .select({
      id: files.id,
      fileName: files.fileName,
      mimeType: files.mimeType,
      size: files.size,
      processingStatus: files.processingStatus,
      createdAt: files.createdAt,
      updatedAt: files.updatedAt,
      extraction: {
        id: documentExtractions.id,
        documentType: documentExtractions.documentType,
        overallConfidence: documentExtractions.overallConfidence,
        validationStatus: documentExtractions.validationStatus,
        extractedFields: documentExtractions.extractedFields,
      },
      supplier: {
        id: suppliers.id,
        displayName: suppliers.displayName,
        legalName: suppliers.legalName,
      },
    })
    .from(files)
    .leftJoin(documentExtractions, eq(documentExtractions.fileId, files.id))
    .leftJoin(
      suppliers,
      eq(suppliers.id, documentExtractions.matchedSupplierId),
    )
    .where(and(...baseConditions));

  const filesResult = await query.orderBy(desc(files.createdAt));

  return filesResult.map((file) => ({
    id: file.id,
    fileName: file.fileName,
    mimeType: file.mimeType,
    size: file.size,
    processingStatus: file.processingStatus,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    extraction: file.extraction?.id ? file.extraction : null,
    supplier: file.supplier?.id ? file.supplier : null,
  }));
}

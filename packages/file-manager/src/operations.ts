import { getConfig } from "@figgy/config";
import { DeduplicationService, HashUtils } from "@figgy/deduplication";
import type { CategorizeFilePayload } from "@figgy/types";
import * as searchOps from "@figgy/search";
import {
  and,
  desc,
  documentExtractions,
  eq,
  files,
  globalSuppliers,
  gte,
  inArray,
  ne,
  sql,
  suppliers,
} from "@figgy/shared-db";
import { download, remove, signedUrl, upload } from "@figgy/supabase-storage";
import { createLogger } from "@figgy/utils";
import { tasks } from "@trigger.dev/sdk/v3";
import { v4 as uuidv4 } from "uuid";
import { getClient } from "./client";
import { getDb } from "./db";
import type { CreateFileInput, ProcessingStatus } from "./types";
import { createFileSchema } from "./types";

const logger = createLogger("file-manager");

/**
 * Upload a file and create a database record with atomic transaction
 * @param file - File object to upload
 * @param input - File creation input
 * @returns Promise resolving to the created file ID
 */
export async function uploadFile(
  file: File,
  input: CreateFileInput,
): Promise<string> {
  // Validate input against schema
  const validatedInput = createFileSchema.parse(input);
  
  // Generate UUID for the file BEFORE creating DB record
  const fileId = uuidv4();
  
  // Standardized path: tenantId/files/uuid
  const standardizedPath = [validatedInput.tenantId, "files", fileId];

  // Get bucket from input or config
  const config = getConfig().getForFileManager();
  const bucket = validatedInput.bucket || config.STORAGE_BUCKET;

  logger.info("Starting atomic file upload", {
    fileId,
    fileName: file.name,
    tenantId: validatedInput.tenantId,
    source: validatedInput.source,
    bucket,
    uploadedBy: validatedInput.uploadedBy,
    standardizedPath,
  });

  // Calculate file hash for deduplication BEFORE any DB operations
  const fileBuffer = await file.arrayBuffer();
  const db = getDb();
  const deduplicationService = new DeduplicationService(db);
  const contentHash = await HashUtils.calculateFileHash(
    Buffer.from(fileBuffer),
  );

  // Check for duplicates from the same source
  const duplicateFiles = await db
    .select()
    .from(files)
    .where(
      and(
        eq(files.tenantId, validatedInput.tenantId),
        eq(files.contentHash, contentHash),
        eq(files.fileSize, file.size),
        eq(files.source, validatedInput.source),
        // For email source, also check sourceId to ensure it's from the same email
        validatedInput.source === "email" && validatedInput.sourceId
          ? eq(files.sourceId, validatedInput.sourceId)
          : sql`true`
      )
    );

  if (duplicateFiles.length > 0) {
    const existingFile = duplicateFiles[0];
    if (!existingFile) {
      throw new Error("Unexpected null duplicate file result");
    }
    logger.info("Skipping duplicate file from same source", {
      fileName: file.name,
      existingFileId: existingFile.id,
      source: validatedInput.source,
      sourceId: validatedInput.sourceId,
      contentHash,
    });
    
    // Return the existing file ID instead of creating a duplicate
    return existingFile.id;
  }

  // Still check for duplicates from other sources (for logging/awareness)
  const duplicateCheck = await deduplicationService.checkFileDuplicate(
    contentHash,
    file.size,
    validatedInput.tenantId,
  );

  if (duplicateCheck.isDuplicate) {
    logger.info("File with same content exists from different source", {
      fileName: file.name,
      duplicateFileId: duplicateCheck.duplicateFileId,
      contentHash,
      currentSource: validatedInput.source,
      note: "Allowing upload as it's from a different source",
    });
  }

  // ATOMIC OPERATION STARTS HERE
  // Step 1: Create database record with pending_upload status
  const [record] = await db
    .insert(files)
    .values({
      id: fileId, // Use pre-generated UUID
      tenantId: validatedInput.tenantId,
      uploadedBy: validatedInput.uploadedBy,
      fileName: file.name, // Store original filename
      pathTokens: standardizedPath, // Use standardized path
      mimeType: validatedInput.mimeType,
      size: validatedInput.size,
      source: validatedInput.source,
      sourceId: validatedInput.sourceId || null,
      metadata: validatedInput.metadata,
      bucket,
      contentHash,
      fileSize: file.size,
      processingStatus: "pending_upload" as ProcessingStatus, // Mark as pending upload
    })
    .returning();

  if (!record) {
    throw new Error("Failed to create file record");
  }

  logger.info("File record created with pending_upload status", {
    fileId: record.id,
    tenantId: validatedInput.tenantId,
  });

  // Step 2: Upload to storage using standardized path
  const client = getClient();
  let publicUrl: string | undefined;
  
  try {
    publicUrl = await upload(client, {
      file,
      path: standardizedPath,
      bucket,
    });
    logger.info("File uploaded to storage successfully", {
      fileId: record.id,
      publicUrl,
    });
  } catch (uploadError) {
    logger.error("Failed to upload file to storage", {
      fileId: record.id,
      error: uploadError instanceof Error ? uploadError.message : String(uploadError),
    });
    
    // Step 3a: If upload fails, update status to failed
    await db
      .update(files)
      .set({
        processingStatus: "failed" as ProcessingStatus,
        metadata: {
          ...((typeof record.metadata === "object" && record.metadata !== null) ? record.metadata : {}),
          error: "storage_upload_failed",
          errorMessage: uploadError instanceof Error ? uploadError.message : String(uploadError),
          failedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(files.id, record.id));
    
    throw new Error(`Storage upload failed: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`);
  }

  // Step 3b: If upload succeeds, update status to pending
  await db
    .update(files)
    .set({
      processingStatus: "pending" as ProcessingStatus,
      updatedAt: new Date(),
    })
    .where(eq(files.id, record.id));

  logger.info("File upload completed atomically", {
    fileId: record.id,
    publicUrl,
    tenantId: validatedInput.tenantId,
  });

  // Index file in search
  try {
    const indexData: Parameters<typeof searchOps.indexFile>[0] = {
      id: record.id,
      tenantId: record.tenantId,
      fileName: record.fileName,
      mimeType: record.mimeType,
      createdAt: record.createdAt,
    };

    if (validatedInput.metadata?.supplierName) {
      indexData.supplierName = validatedInput.metadata.supplierName as string;
    }

    if (validatedInput.metadata?.category) {
      indexData.category = validatedInput.metadata.category as string;
    }

    if (record.fileSize) {
      indexData.size = record.fileSize;
    }

    await searchOps.indexFile(indexData);
  } catch (error) {
    logger.error("Failed to index file in search", {
      fileId: record.id,
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - file is already uploaded successfully
  }

  // Trigger categorization job with tenant-based concurrency control
  try {
    await tasks.trigger(
      "categorize-file",
      {
        fileId: record.id,
        tenantId: record.tenantId,
        mimeType: record.mimeType,
        size: record.size,
        pathTokens: record.pathTokens,
        source: record.source,
      } satisfies CategorizeFilePayload,
      {
        queue: {
          name: `tenant-${record.tenantId}`,
        },
      },
    );

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

  // Trigger thumbnail generation for PDFs
  if (record.mimeType === "application/pdf") {
    try {
      await tasks.trigger(
        "generate-thumbnail",
        {
          fileId: record.id,
          tenantId: record.tenantId,
          mimeType: record.mimeType,
        },
        {
          queue: {
            name: `thumbnail-${record.tenantId}`,
          },
        },
      );

      logger.info("Thumbnail generation job triggered", {
        fileId: record.id,
        tenantId: record.tenantId,
      });
    } catch (error) {
      logger.error("Failed to trigger thumbnail generation", {
        fileId: record.id,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - thumbnail is non-critical
    }
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
  // Generate UUID for the file
  const fileId = uuidv4();
  
  // Standardized path: tenantId/files/uuid
  const standardizedPath = [input.tenantId, "files", fileId];
  const fullPath = standardizedPath.join("/");

  logger.info("Uploading file from base64", {
    fileId,
    fileName: input.fileName,
    standardizedPath,
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

  // Check for duplicates from the same source
  const duplicateFiles = await db
    .select()
    .from(files)
    .where(
      and(
        eq(files.tenantId, input.tenantId),
        eq(files.contentHash, contentHash),
        eq(files.fileSize, fileBuffer.length),
        eq(files.source, (input.source || "user_upload") as any),
        // For consistent duplicate detection
        input.metadata?.sourceId
          ? eq(files.sourceId, input.metadata.sourceId as string)
          : sql`true`
      )
    );

  if (duplicateFiles.length > 0) {
    const existingFile = duplicateFiles[0];
    if (!existingFile) {
      throw new Error("Unexpected null duplicate file result");
    }
    logger.info("Skipping duplicate file from same source", {
      fileName: input.fileName,
      existingFileId: existingFile.id,
      source: input.source || "user_upload",
      sourceId: input.metadata?.sourceId,
      contentHash,
    });
    
    // Return the existing file instead of creating a duplicate
    return {
      id: existingFile.id,
      fileName: existingFile.fileName,
      size: existingFile.size,
      mimeType: existingFile.mimeType,
      createdAt: existingFile.createdAt,
    };
  }

  // Still check for duplicates from other sources (for logging/awareness)
  const duplicateCheck = await deduplicationService.checkFileDuplicate(
    contentHash,
    fileBuffer.length,
    input.tenantId,
  );

  if (duplicateCheck.isDuplicate) {
    logger.info("File with same content exists from different source", {
      fileName: input.fileName,
      duplicateFileId: duplicateCheck.duplicateFileId,
      contentHash,
      currentSource: input.source || "user_upload",
      note: "Allowing upload as it's from a different source",
    });
  }

  // Get bucket from config
  const config = getConfig().getForFileManager();
  const bucket = config.STORAGE_BUCKET || "vault";

  logger.info("Starting atomic file upload from base64", {
    bucket,
    fullPath,
    fileSize: fileBuffer.length,
    mimeType: input.mimeType,
  });

  // ATOMIC OPERATION STARTS HERE
  // Step 1: Create database record with pending_upload status
  const insertData = {
    id: fileId, // Use pre-generated UUID
    tenantId: input.tenantId,
    uploadedBy: input.uploadedBy,
    fileName: input.fileName, // Store original filename
    pathTokens: standardizedPath, // Use standardized path
    mimeType: input.mimeType,
    size: Number(input.size), // Ensure it's a number for bigint
    source: (input.source || "user_upload") as
      | "user_upload"
      | "integration"
      | "whatsapp"
      | "slack"
      | "email",
    sourceId: input.metadata?.sourceId as string || null,
    metadata: {
      originalName: input.fileName,
      isDuplicate: duplicateCheck.isDuplicate,
      duplicateFileId: duplicateCheck.duplicateFileId,
      ...input.metadata,
    },
    bucket,
    contentHash,
    fileSize: Number(fileBuffer.length), // Ensure it's a number for bigint
    processingStatus: "pending_upload" as ProcessingStatus, // Mark as pending upload
  };

  let fileRecord;
  try {
    logger.info("Creating file record with pending_upload status", {
      fileName: input.fileName,
      originalFileName: input.fileName,
      tenantId: input.tenantId,
      uploadedBy: input.uploadedBy,
      contentHash,
      fileSize: fileBuffer.length,
    });

    const result = await db.insert(files).values(insertData).returning();
    fileRecord = result[0];

    if (!fileRecord) {
      throw new Error("Failed to create file record - no record returned");
    }
  } catch (dbError) {
    logger.error("Database insert failed", {
      error: dbError instanceof Error ? dbError.message : String(dbError),
      fileName: input.fileName,
      tenantId: input.tenantId,
    });
    throw dbError;
  }

  // Step 2: Upload to storage
  const client = getClient();
  let publicUrl: string | undefined;
  
  try {
    const { error: uploadError } = await client.storage
      .from(bucket)
      .upload(fullPath, fileBuffer, {
        contentType: input.mimeType,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: { publicUrl: url },
    } = client.storage.from(bucket).getPublicUrl(fullPath);
    
    publicUrl = url;
    
    logger.info("File uploaded to storage successfully", {
      fileId: fileRecord.id,
      publicUrl,
    });
  } catch (uploadError) {
    logger.error("Failed to upload file to storage", {
      fileId: fileRecord.id,
      error: uploadError instanceof Error ? uploadError.message : String(uploadError),
      bucket,
      path: fullPath,
    });
    
    // Step 3a: If upload fails, update status to failed
    await db
      .update(files)
      .set({
        processingStatus: "failed" as ProcessingStatus,
        metadata: {
          ...((typeof fileRecord.metadata === "object" && fileRecord.metadata !== null) ? fileRecord.metadata : {}),
          error: "storage_upload_failed",
          errorMessage: uploadError instanceof Error ? uploadError.message : String(uploadError),
          failedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(files.id, fileRecord.id));
    
    throw new Error(`Storage upload failed: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`);
  }

  // Step 3b: If upload succeeds, update status to pending and add publicUrl to metadata
  await db
    .update(files)
    .set({
      processingStatus: "pending" as ProcessingStatus,
      metadata: {
        ...((typeof fileRecord.metadata === "object" && fileRecord.metadata !== null) ? fileRecord.metadata : {}),
        publicUrl,
      },
      updatedAt: new Date(),
    })
    .where(eq(files.id, fileRecord.id));

  logger.info("File upload from base64 completed atomically", {
    fileId: fileRecord.id,
    publicUrl,
    tenantId: input.tenantId,
  });

  // Trigger categorization job with tenant-based concurrency control
  try {
    await tasks.trigger(
      "categorize-file",
      {
        fileId: fileRecord.id,
        tenantId: fileRecord.tenantId,
        mimeType: fileRecord.mimeType,
        size: fileRecord.size,
        pathTokens: fileRecord.pathTokens,
        source: fileRecord.source,
      } satisfies CategorizeFilePayload,
      {
        queue: {
          name: `tenant-${fileRecord.tenantId}`,
        },
      },
    );

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

  // Trigger thumbnail generation for PDFs
  if (fileRecord.mimeType === "application/pdf") {
    try {
      await tasks.trigger(
        "generate-thumbnail",
        {
          fileId: fileRecord.id,
          tenantId: fileRecord.tenantId,
          mimeType: fileRecord.mimeType,
        },
        {
          queue: {
            name: `thumbnail-${fileRecord.tenantId}`,
          },
        },
      );

      logger.info("Thumbnail generation job triggered", {
        fileId: fileRecord.id,
        tenantId: fileRecord.tenantId,
      });
    } catch (error) {
      logger.error("Failed to trigger thumbnail generation", {
        fileId: fileRecord.id,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - thumbnail is non-critical
    }
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
    .where(
      and(
        eq(files.tenantId, tenantId),
        eq(files.processingStatus, "completed")
      )
    )
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
    // Check if the file has been stuck in processing for more than 5 minutes
    const processingTimeout = 5 * 60 * 1000; // 5 minutes in milliseconds
    const timeSinceLastUpdate = Date.now() - file.updatedAt.getTime();
    
    if (timeSinceLastUpdate < processingTimeout) {
      logger.warn("File is already being processed", { 
        fileId, 
        tenantId,
        timeSinceLastUpdate: Math.round(timeSinceLastUpdate / 1000) + "s"
      });
      throw new Error("File is already being processed");
    }
    
    // File has been stuck for too long, allow reprocessing
    logger.warn("File stuck in processing state, allowing reprocess", { 
      fileId, 
      tenantId,
      timeSinceLastUpdate: Math.round(timeSinceLastUpdate / 1000) + "s",
      lastUpdated: file.updatedAt.toISOString()
    });
  }

  // Clean up existing data and reset status in a transaction
  await db.transaction(async (tx) => {
    // First, clear any references to extractions that will be deleted
    await tx
      .update(documentExtractions)
      .set({ duplicateCandidateId: null })
      .where(
        and(
          eq(documentExtractions.fileId, fileId),
          ne(documentExtractions.duplicateCandidateId, sql`NULL`),
        ),
      );

    // Also clear references FROM other extractions TO this file's extractions
    const fileExtractions = await tx
      .select({ id: documentExtractions.id })
      .from(documentExtractions)
      .where(eq(documentExtractions.fileId, fileId));

    for (const extraction of fileExtractions) {
      await tx
        .update(documentExtractions)
        .set({ duplicateCandidateId: null })
        .where(eq(documentExtractions.duplicateCandidateId, extraction.id));
    }

    // Now safe to delete existing document extractions
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
  const jobHandle = await tasks.trigger(
    "categorize-file",
    {
      fileId: file.id,
      tenantId: file.tenantId,
      mimeType: file.mimeType,
      size: file.size,
      pathTokens: file.pathTokens,
      source: file.source,
    } satisfies CategorizeFilePayload,
    {
      queue: {
        name: `tenant-${file.tenantId}`,
      },
    },
  );

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
 * Check and fix orphaned files stuck in processing state
 * @param tenantId - Tenant ID
 * @param timeoutMinutes - Minutes after which a file is considered orphaned (default: 5)
 * @returns Promise resolving to list of fixed file IDs
 */
export async function fixOrphanedProcessingFiles(
  tenantId: string,
  timeoutMinutes: number = 5,
): Promise<{
  fixedFiles: string[];
  errorFiles: string[];
}> {
  logger.info("Checking for orphaned processing files", { tenantId, timeoutMinutes });

  const db = getDb();
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const cutoffTime = new Date(Date.now() - timeoutMs);

  // Find files stuck in processing state
  const orphanedFiles = await db
    .select({
      id: files.id,
      fileName: files.fileName,
      updatedAt: files.updatedAt,
    })
    .from(files)
    .where(
      and(
        eq(files.tenantId, tenantId),
        eq(files.processingStatus, "processing"),
        sql`${files.updatedAt} < ${cutoffTime}`,
      ),
    );

  logger.info("Found orphaned files", {
    count: orphanedFiles.length,
    fileIds: orphanedFiles.map((f) => f.id),
  });

  const fixedFiles: string[] = [];
  const errorFiles: string[] = [];

  // Fix each orphaned file
  for (const file of orphanedFiles) {
    try {
      // Reset status to failed with explanation
      await db
        .update(files)
        .set({
          processingStatus: "failed" as ProcessingStatus,
          metadata: sql`jsonb_set(
            COALESCE(${files.metadata}, '{}'::jsonb),
            '{error}',
            '"processing_timeout"'::jsonb
          )`,
          updatedAt: new Date(),
        })
        .where(eq(files.id, file.id));

      fixedFiles.push(file.id);
      logger.info("Fixed orphaned file", {
        fileId: file.id,
        fileName: file.fileName,
        lastUpdate: file.updatedAt,
      });
    } catch (error) {
      errorFiles.push(file.id);
      logger.error("Failed to fix orphaned file", {
        fileId: file.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    fixedFiles,
    errorFiles,
  };
}

/**
 * Get files grouped by year and supplier
 * Suppliers are sorted alphabetically within each year for consistent ordering
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
          logoUrl: string | null;
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
      bucket: files.bucket,
      thumbnailPath: files.thumbnailPath,
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
        globalSupplierId: suppliers.globalSupplierId,
      },
      globalSupplier: {
        logoUrl: globalSuppliers.logoUrl,
      },
    })
    .from(files)
    .leftJoin(documentExtractions, eq(documentExtractions.fileId, files.id))
    .leftJoin(
      suppliers,
      eq(suppliers.id, documentExtractions.matchedSupplierId),
    )
    .leftJoin(
      globalSuppliers,
      eq(globalSuppliers.id, suppliers.globalSupplierId),
    )
    .where(
      and(
        eq(files.tenantId, tenantId),
        eq(files.processingStatus, "completed")
      )
    )
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
        logoUrl: file.globalSupplier?.logoUrl || null,
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
      bucket: file.bucket,
      thumbnailPath: file.thumbnailPath,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      extraction: file.extraction?.id ? file.extraction : null,
    };

    groupedData[year].suppliers[supplierName].files.push(fileData);
    groupedData[year].suppliers[supplierName].fileCount++;
    groupedData[year].totalFiles++;
  });

  // Sort suppliers alphabetically within each year
  Object.keys(groupedData).forEach((year) => {
    const suppliers = groupedData[year].suppliers;
    const sortedSupplierNames = Object.keys(suppliers).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase()),
    );

    // Create new suppliers object with sorted keys
    const sortedSuppliers: Record<string, any> = {};
    sortedSupplierNames.forEach((supplierName) => {
      sortedSuppliers[supplierName] = suppliers[supplierName];
    });

    groupedData[year].suppliers = sortedSuppliers;
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
 * Reprocess a file from dead letter queue
 * @param fileId - File ID to reprocess
 * @param tenantId - Tenant ID for security
 * @returns Promise resolving to the job handle
 */
export async function reprocessDeadLetterFile(
  fileId: string,
  tenantId: string,
): Promise<{
  jobHandle: string;
}> {
  logger.info("Reprocessing dead letter file", { fileId, tenantId });

  const db = getDb();

  // Get file details and verify it's in dead letter status
  const [file] = await db
    .select()
    .from(files)
    .where(
      and(
        eq(files.id, fileId),
        eq(files.tenantId, tenantId),
        eq(files.processingStatus, "dead_letter")
      )
    );

  if (!file) {
    logger.error("Dead letter file not found", { fileId, tenantId });
    throw new Error("Dead letter file not found");
  }

  // Reset file status and clear error metadata
  const updatedMetadata = {
    ...(typeof file.metadata === "object" && file.metadata !== null
      ? file.metadata
      : {}),
    // Clear error-related fields
    error: null,
    errorMessage: null,
    errorStack: null,
    finalFailureAt: null,
    lastError: null,
    lastFailureAt: null,
    retryCount: 0,
    // Add reprocess metadata
    reprocessedFromDeadLetter: true,
    reprocessedAt: new Date().toISOString(),
    deadLetterReprocessCount: ((file.metadata as any)?.deadLetterReprocessCount || 0) + 1,
  };

  await db
    .update(files)
    .set({
      processingStatus: "pending" as ProcessingStatus,
      metadata: updatedMetadata,
      updatedAt: new Date(),
    })
    .where(eq(files.id, fileId));

  logger.info("Dead letter file reset to pending", { fileId });

  // Trigger categorization job with tenant-based concurrency control
  const jobHandle = await tasks.trigger(
    "categorize-file",
    {
      fileId: file.id,
      tenantId: file.tenantId,
      mimeType: file.mimeType,
      size: file.size,
      pathTokens: file.pathTokens,
      source: file.source,
    } satisfies CategorizeFilePayload,
    {
      queue: {
        name: `tenant-${file.tenantId}`,
      },
    },
  );

  logger.info("Dead letter file reprocessing job triggered", {
    fileId,
    tenantId,
    jobHandle: jobHandle.id,
  });

  return {
    jobHandle: jobHandle.id,
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
    bucket: string;
    thumbnailPath: string | null;
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
    eq(files.processingStatus, "completed"),
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
      bucket: files.bucket,
      thumbnailPath: files.thumbnailPath,
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
    bucket: file.bucket,
    thumbnailPath: file.thumbnailPath,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    extraction: file.extraction?.id ? file.extraction : null,
    supplier: file.supplier?.id ? file.supplier : null,
  }));
}

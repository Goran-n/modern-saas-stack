import { upload, download, remove, signedUrl } from '@kibly/supabase-storage';
import { stripSpecialCharacters } from '@kibly/utils';
import { createLogger } from '@kibly/utils';
import { eq, and, sql, files, documentExtractions } from '@kibly/shared-db';
import type { CreateFileInput, ProcessingStatus } from './types';
import { getDb } from './db';
import { getClient } from './client';
import { tasks } from '@trigger.dev/sdk/v3';
import type { CategorizeFilePayload } from '@kibly/jobs';
import { getConfig } from '@kibly/config';

const logger = createLogger('file-manager');

/**
 * Upload a file and create a database record
 * @param file - File object to upload
 * @param input - File creation input
 * @returns Promise resolving to the created file ID
 */
export async function uploadFile(
  file: File,
  input: CreateFileInput
): Promise<string> {
  const sanitisedFileName = stripSpecialCharacters(file.name);
  const fullPath = [...input.pathTokens, sanitisedFileName];
  
  // Get bucket from input or config
  const config = getConfig().getForFileManager();
  const bucket = input.bucket || config.STORAGE_BUCKET;

  logger.info('Uploading file', { 
    fileName: file.name,
    sanitisedFileName,
    tenantId: input.tenantId,
    source: input.source,
    bucket 
  });

  // Upload to Supabase Storage
  const client = getClient();
  const publicUrl = await upload(client, {
    file,
    path: fullPath,
    bucket,
  });

  // Save to database
  const db = getDb();
  const [record] = await db.insert(files).values({
    ...input,
    sourceId: input.sourceId || null,
    fileName: sanitisedFileName,
    pathTokens: fullPath,
    bucket,
  }).returning();

  if (!record) {
    throw new Error('Failed to create file record');
  }

  logger.info('File uploaded and record created', { 
    fileId: record.id,
    publicUrl,
    tenantId: input.tenantId 
  });

  // Trigger categorization job
  try {
    await tasks.trigger('categorize-file', {
      fileId: record.id,
      tenantId: record.tenantId,
      mimeType: record.mimeType,
      size: record.size,
      pathTokens: record.pathTokens,
      source: record.source,
    } satisfies CategorizeFilePayload);

    logger.info('File categorization job triggered', {
      fileId: record.id,
      tenantId: record.tenantId,
    });
  } catch (error) {
    logger.error('Failed to trigger categorization job', {
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
 * Download a file by ID
 * @param fileId - File ID to download
 * @param tenantId - Tenant ID for security
 * @returns Promise resolving to the file blob
 */
export async function downloadFile(
  fileId: string,
  tenantId: string
): Promise<Blob> {
  logger.info('Downloading file', { fileId, tenantId });

  // Get file record
  const db = getDb();
  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.tenantId, tenantId)));

  if (!file) {
    logger.error('File not found', { fileId, tenantId });
    throw new Error('File not found');
  }

  // Download from Supabase Storage
  const client = getClient();
  const { data } = await download(client, {
    bucket: file.bucket,
    path: file.pathTokens.join('/'),
  });

  logger.info('File downloaded successfully', { fileId, tenantId, size: data.size });

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
  expiresIn: number = 3600
): Promise<string> {
  logger.info('Generating signed URL', { fileId, tenantId, expiresIn });

  // Get file record
  const db = getDb();
  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.tenantId, tenantId)));

  if (!file) {
    logger.error('File not found', { fileId, tenantId });
    throw new Error('File not found');
  }

  // Generate signed URL
  const client = getClient();
  const { data } = await signedUrl(client, {
    bucket: file.bucket,
    path: file.pathTokens.join('/'),
    expireIn: expiresIn,
  });

  logger.info('Signed URL generated', { fileId, tenantId, expiresIn });

  return data.signedUrl;
}

/**
 * Delete a file and its database record
 * @param fileId - File ID to delete
 * @param tenantId - Tenant ID for security
 * @returns Promise resolving when file is deleted
 */
export async function deleteFile(
  fileId: string,
  tenantId: string
): Promise<void> {
  logger.info('Deleting file', { fileId, tenantId });

  // Get file record
  const db = getDb();
  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.tenantId, tenantId)));

  if (!file) {
    logger.error('File not found', { fileId, tenantId });
    throw new Error('File not found');
  }

  // Delete from Supabase Storage
  const client = getClient();
  await remove(client, {
    bucket: file.bucket,
    path: file.pathTokens,
  });

  // Delete from database
  await db.delete(files).where(eq(files.id, fileId));

  logger.info('File deleted successfully', { fileId, tenantId });
}

/**
 * Update the processing status of a file
 * @param fileId - File ID
 * @param status - New processing status
 * @returns Promise resolving when status is updated
 */
export async function updateProcessingStatus(
  fileId: string,
  status: ProcessingStatus
): Promise<void> {
  logger.info('Updating processing status', { fileId, status });

  const db = getDb();
  await db
    .update(files)
    .set({
      processingStatus: status,
      updatedAt: new Date()
    })
    .where(eq(files.id, fileId));

  logger.info('Processing status updated', { fileId, status });
}

/**
 * List files in a specific path
 * @param tenantId - Tenant ID
 * @param path - Path prefix to filter files
 * @returns Promise resolving to array of files
 */
export async function listFilesByPath(
  tenantId: string,
  path: string
): Promise<Array<{
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  pathTokens: string[];
}>> {
  logger.info('Listing files by path', { tenantId, path });

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
  const matchingFiles = allFiles.filter(file => {
    const filePath = file.pathTokens.join('/');
    return filePath.includes(path);
  });

  logger.info('Files listed', { 
    tenantId, 
    path, 
    count: matchingFiles.length 
  });

  return matchingFiles;
}

/**
 * Get files that have been matched to a specific supplier
 * @param supplierId - Supplier ID to get files for
 * @returns Promise resolving to array of files with extraction metadata
 */
export async function getFilesBySupplier(
  supplierId: string
): Promise<Array<{
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
}>> {
  logger.info('Getting files for supplier', { supplierId });

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
    .orderBy(sql`${files.createdAt} DESC`);

  logger.info('Found files for supplier', { 
    supplierId, 
    fileCount: supplierFiles.length 
  });

  return supplierFiles;
}
import { z } from 'zod';
import { files as filesTable } from '@figgy/shared-db';
import { eq } from 'drizzle-orm';
import { TestFile } from './test-storage';
import { ProcessingStatus } from '../../src/types';
import { HashUtils } from '@figgy/deduplication';

// Security validation helpers
function validateFileName(fileName: string): void {
  // Path traversal detection
  if (fileName.includes('..') || fileName.includes('\\') || fileName.includes('/')) {
    throw new Error('Invalid filename: path traversal detected');
  }
  
  // Null byte injection
  if (fileName.includes('\0') || fileName.includes('\x00')) {
    throw new Error('Invalid filename: null byte detected');
  }
  
  // Length validation
  if (fileName.length > 255) {
    throw new Error('Invalid filename: too long');
  }
}

function validatePathTokens(pathTokens: string[]): void {
  for (const token of pathTokens) {
    if (token.includes('..') || token.includes('\\') || token === '.' || token === '') {
      throw new Error('Invalid path: path traversal detected');
    }
  }
}

function validateMimeType(mimeType: string, buffer: Buffer, options: { validateContent?: boolean } = {}): void {
  // Reject executable types
  const forbiddenTypes = [
    'application/x-executable',
    'application/x-msdownload',
    'application/x-sh',
    'application/x-bat',
    'text/x-shellscript',
    'application/x-powershell',
    'application/x-msdos-program',
  ];
  
  if (forbiddenTypes.includes(mimeType)) {
    throw new Error('Forbidden file type: executable files not allowed');
  }
  
  // Only do magic byte validation if content validation is enabled
  if (!options.validateContent) return;
  
  // Magic byte validation for common types
  if (mimeType === 'application/pdf' && !buffer.toString('ascii', 0, 4).startsWith('%PDF')) {
    throw new Error('MIME type validation failed: PDF magic bytes not found');
  }
  
  if (mimeType === 'image/png') {
    const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    if (!buffer.subarray(0, 8).equals(pngSignature)) {
      throw new Error('MIME type validation failed: PNG magic bytes not found');
    }
  }
  
  if (mimeType === 'image/jpeg') {
    if (!buffer.subarray(0, 4).equals(Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]))) {
      throw new Error('MIME type validation failed: JPEG magic bytes not found');
    }
  }
}

function validateFileSize(size: number, buffer: Buffer): void {
  const MAX_SIZE = 50 * 1024 * 1024; // 50MB
  
  if (size > MAX_SIZE) {
    throw new Error('File size exceeds maximum limit');
  }
  
  // Size mismatch detection (zip bomb protection)
  if (Math.abs(size - buffer.length) > 1024) { // Allow 1KB tolerance
    throw new Error('File size mismatch: suspicious compression detected');
  }
}

function scanContent(buffer: Buffer, options: { scanContent?: boolean } = {}): void {
  if (!options.scanContent) return;
  
  const content = buffer.toString('ascii');
  
  // JavaScript detection in PDFs
  if (content.includes('/JS') && content.includes('app.alert')) {
    throw new Error('Malicious content detected: JavaScript found in PDF');
  }
}

function sanitizeFileName(fileName: string, options: { sanitizeFilename?: boolean } = {}): string {
  if (!options.sanitizeFilename) {
    // For encoded filenames, always decode URL encoding
    try {
      return decodeURIComponent(fileName);
    } catch {
      return fileName; // If decoding fails, return original
    }
  }
  
  // First decode URL encoding
  let decoded;
  try {
    decoded = decodeURIComponent(fileName);
  } catch {
    decoded = fileName;
  }
  
  return decoded
    .replace(/[<>|;\/\\]/g, '') // Remove dangerous characters including path separators
    .replace(/\x00/g, '') // Remove null bytes
    .replace(/[\r\n]/g, ''); // Remove newlines
}

function stripMetadata(metadata: Record<string, any>, options: { stripMetadata?: boolean } = {}): Record<string, any> {
  if (!options.stripMetadata) return metadata;
  
  const { 'GPS-Location': gps, 'Author': author, 'Company': company, ...clean } = metadata;
  return clean;
}

/**
 * Test-friendly version of uploadFile that works with Buffer instead of File API
 */
export async function testUploadFile({
  file,
  tenantId,
  userId,
  bucket,
  path,
  metadata = {},
  db,
  storage,
  validateContent = false,
  sanitizeFilename = false,
  stripMetadata: stripMeta = false,
  maxFilenameLength = 255,
}: {
  file: TestFile;
  tenantId: string;
  userId: string;
  bucket: string;
  path: string[];
  metadata?: Record<string, any>;
  db: any;
  storage: any;
  validateContent?: boolean;
  sanitizeFilename?: boolean;
  stripMetadata?: boolean;
  maxFilenameLength?: number;
}) {
  // Process filename first to handle URL decoding and sanitization
  const processedFileName = sanitizeFileName(file.name, { sanitizeFilename });
  
  // Security validations on processed filename
  validateFileName(processedFileName);
  validatePathTokens(path);
  validateMimeType(file.type, file.buffer, { validateContent });
  validateFileSize(file.size, file.buffer);
  scanContent(file.buffer, { scanContent: validateContent });
  
  // Process metadata
  const processedMetadata = stripMetadata(metadata, { stripMetadata: stripMeta });
  
  // Length validation after sanitization
  if (processedFileName.length > maxFilenameLength) {
    throw new Error(`Filename too long: ${processedFileName.length} > ${maxFilenameLength}`);
  }
  
  // Calculate file hash for deduplication
  const fileHash = await HashUtils.calculateFileHash(file.buffer);
  
  // Check for existing file with same hash
  const existing = await db
    .select()
    .from(filesTable)
    .where(eq(filesTable.contentHash, fileHash))
    .limit(1);
  
  if (existing.length > 0) {
    return existing[0];
  }
  
  // Create database record first (atomic upload pattern)
  const [record] = await db
    .insert(filesTable)
    .values({
      tenantId,
      uploadedBy: userId,
      fileName: processedFileName,
      mimeType: file.type,
      size: file.size,
      contentHash: fileHash,
      fileSize: file.size,
      bucket,
      pathTokens: path,
      processingStatus: 'pending_upload' as ProcessingStatus,
      metadata: processedMetadata,
      source: 'user_upload',
      createdAt: new Date(),
      updatedAt: new Date()
    })
    .returning();
  
  try {
    // Upload to storage
    const fullPath = path.join('/');
    const { data, error } = await storage.uploadBuffer(bucket, fullPath, file.buffer);
    
    if (error) {
      // Update status to failed
      await db
        .update(filesTable)
        .set({ 
          processingStatus: 'failed' as ProcessingStatus,
          updatedAt: new Date()
        })
        .where(eq(filesTable.id, record.id));
      
      throw error;
    }
    
    // Update status to pending on successful upload
    const [updated] = await db
      .update(filesTable)
      .set({ 
        processingStatus: 'pending' as ProcessingStatus,
        publicUrl: data.url || `https://storage.test/${bucket}/${fullPath}`,
        updatedAt: new Date()
      })
      .where(eq(filesTable.id, record.id))
      .returning();
    
    return updated;
  } catch (error) {
    // Ensure status is failed on any error
    await db
      .update(filesTable)
      .set({ 
        processingStatus: 'failed' as ProcessingStatus,
        metadata: {
          ...processedMetadata,
          error: error instanceof Error ? error.message : 'Upload failed'
        },
        updatedAt: new Date()
      })
      .where(eq(filesTable.id, record.id));
    
    throw error;
  }
}

/**
 * Test helper to simulate file processing
 */
export async function testProcessFile(
  fileId: string,
  db: any,
  options: {
    shouldFail?: boolean;
    extractedData?: any;
    retryCount?: number;
  } = {}
) {
  const { shouldFail = false, extractedData = {}, retryCount = 0 } = options;
  
  // Update to processing
  await db
    .update(filesTable)
    .set({ 
      processingStatus: 'processing' as ProcessingStatus,
      updatedAt: new Date()
    })
    .where(eq(filesTable.id, fileId));
  
  if (shouldFail) {
    // Simulate processing failure
    const newRetryCount = retryCount + 1;
    
    if (newRetryCount >= 3) {
      // Move to dead letter
      await db
        .update(filesTable)
        .set({ 
          processingStatus: 'dead_letter' as ProcessingStatus,
          metadata: {
            error: 'Processing failed after 3 attempts',
            retryCount: newRetryCount,
            lastError: 'Simulated failure'
          },
          updatedAt: new Date()
        })
        .where(eq(filesTable.id, fileId));
    } else {
      // Mark as failed
      await db
        .update(filesTable)
        .set({ 
          processingStatus: 'failed' as ProcessingStatus,
          metadata: {
            retryCount: newRetryCount,
            lastError: 'Simulated failure'
          },
          updatedAt: new Date()
        })
        .where(eq(filesTable.id, fileId));
    }
    
    throw new Error('Simulated processing failure');
  }
  
  // Simulate successful processing
  const [updated] = await db
    .update(filesTable)
    .set({ 
      processingStatus: 'completed' as ProcessingStatus,
      metadata: {
        ...extractedData,
        processedAt: new Date().toISOString(),
        processingTime: Math.random() * 1000 + 500 // 500-1500ms
      },
      updatedAt: new Date()
    })
    .where(eq(filesTable.id, fileId))
    .returning();
  
  return { success: true, extractedData };
}
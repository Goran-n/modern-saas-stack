import { createHash } from 'crypto';

/**
 * Calculate hash of buffer content
 */
export function calculateContentHash(buffer: Buffer, algorithm: string = 'sha256'): string {
  return createHash(algorithm).update(buffer).digest('hex');
}

/**
 * Create a test file object that mimics browser File API
 */
export interface TestFile {
  name: string;
  type: string;
  size: number;
  buffer: Buffer;
  lastModified?: number;
}

export function createTestFile(
  content: string | Buffer,
  name: string,
  mimeType?: string
): TestFile {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf-8');
  const type = mimeType || inferMimeType(name);
  
  return {
    name,
    type,
    size: buffer.length,
    buffer,
    lastModified: Date.now(),
  };
}

/**
 * Infer MIME type from file extension
 */
export function inferMimeType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    xml: 'application/xml',
    zip: 'application/zip',
    tar: 'application/x-tar',
    gz: 'application/gzip',
  };
  
  return mimeTypes[extension || ''] || 'application/octet-stream';
}

/**
 * Validate file magic bytes against MIME type
 */
export function validateFileType(buffer: Buffer, expectedMimeType: string): boolean {
  const magicBytes = buffer.slice(0, 16);
  
  const signatures: Record<string, Buffer[]> = {
    'application/pdf': [Buffer.from('%PDF')],
    'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])],
    'image/jpeg': [
      Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]),
      Buffer.from([0xFF, 0xD8, 0xFF, 0xE1]),
      Buffer.from([0xFF, 0xD8, 0xFF, 0xE2]),
    ],
    'image/gif': [
      Buffer.from('GIF87a'),
      Buffer.from('GIF89a'),
    ],
    'application/zip': [Buffer.from([0x50, 0x4B, 0x03, 0x04])],
  };
  
  const expectedSignatures = signatures[expectedMimeType];
  if (!expectedSignatures) {
    return true; // No signature to check
  }
  
  return expectedSignatures.some(signature => 
    magicBytes.slice(0, signature.length).equals(signature)
  );
}

/**
 * Create corrupted file for testing error handling
 */
export function createCorruptedFile(originalBuffer: Buffer, corruptionType: 'header' | 'middle' | 'footer' = 'header'): Buffer {
  const corrupted = Buffer.from(originalBuffer);
  
  switch (corruptionType) {
    case 'header':
      // Corrupt first 10 bytes
      for (let i = 0; i < Math.min(10, corrupted.length); i++) {
        corrupted[i] = 0xFF;
      }
      break;
    case 'middle':
      // Corrupt middle section
      const middleStart = Math.floor(corrupted.length / 2);
      const middleEnd = Math.min(middleStart + 10, corrupted.length);
      for (let i = middleStart; i < middleEnd; i++) {
        corrupted[i] = 0x00;
      }
      break;
    case 'footer':
      // Corrupt last 10 bytes
      const footerStart = Math.max(0, corrupted.length - 10);
      for (let i = footerStart; i < corrupted.length; i++) {
        corrupted[i] = 0xFF;
      }
      break;
  }
  
  return corrupted;
}

/**
 * Generate test files of specific sizes
 */
export function createFilesOfSize(sizes: number[]): TestFile[] {
  return sizes.map((size, index) => {
    const content = Buffer.alloc(size, `test-content-${index}`);
    return createTestFile(content, `test-file-${size}bytes.bin`);
  });
}

/**
 * Create a zip bomb (large expanded size from small compressed size)
 */
export function createZipBomb(): TestFile {
  // Simulate a file that reports large size but has small actual content
  const smallContent = Buffer.alloc(1024, 'A'); // 1KB of 'A's
  const file = createTestFile(smallContent, 'bomb.zip', 'application/zip');
  
  // Override the size to simulate reported vs actual size mismatch
  return {
    ...file,
    size: 10 * 1024 * 1024 * 1024, // Report 10GB
  };
}

/**
 * Check if buffer contains suspicious patterns
 */
export function containsSuspiciousContent(buffer: Buffer): { suspicious: boolean; reasons: string[] } {
  const content = buffer.toString('utf-8');
  const reasons: string[] = [];
  
  // Check for executable headers
  if (buffer.slice(0, 2).equals(Buffer.from([0x4D, 0x5A]))) { // MZ header (Windows executable)
    reasons.push('Contains Windows executable header');
  }
  
  if (buffer.slice(0, 4).equals(Buffer.from([0x7F, 0x45, 0x4C, 0x46]))) { // ELF header (Linux executable)
    reasons.push('Contains Linux executable header');
  }
  
  // Check for script patterns
  if (content.includes('#!/bin/sh') || content.includes('#!/bin/bash')) {
    reasons.push('Contains shell script header');
  }
  
  if (content.includes('<script>') || content.includes('javascript:')) {
    reasons.push('Contains JavaScript code');
  }
  
  // Check for common malware patterns
  const suspiciousStrings = [
    'eval(',
    'exec(',
    'system(',
    'shell_exec(',
    'rm -rf',
    'format c:',
    'del /f /q',
  ];
  
  suspiciousStrings.forEach(pattern => {
    if (content.toLowerCase().includes(pattern.toLowerCase())) {
      reasons.push(`Contains suspicious pattern: ${pattern}`);
    }
  });
  
  return {
    suspicious: reasons.length > 0,
    reasons,
  };
}
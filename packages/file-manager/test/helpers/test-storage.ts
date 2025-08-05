import { SupabaseStorageClient } from '@figgy/supabase-storage';

export interface TestStorage {
  client: SupabaseStorageClient | MockStorageClient;
  cleanup: () => Promise<void>;
}

/**
 * Mock storage client for unit tests
 */
export class MockStorageClient {
  private storage = new Map<string, Buffer>();
  
  async uploadBuffer(bucket: string, path: string, buffer: Buffer) {
    const key = `${bucket}/${path}`;
    this.storage.set(key, buffer);
    
    return {
      data: { 
        path,
        url: `https://mock.storage/${key}`,
        id: `mock-${Date.now()}`
      },
      error: null
    };
  }
  
  async downloadBuffer(bucket: string, path: string) {
    const key = `${bucket}/${path}`;
    const buffer = this.storage.get(key);
    
    if (!buffer) {
      return {
        data: null,
        error: new Error('File not found')
      };
    }
    
    return {
      data: buffer,
      error: null
    };
  }
  
  async deleteFile(bucket: string, path: string) {
    const key = `${bucket}/${path}`;
    this.storage.delete(key);
    
    return {
      data: { message: 'File deleted' },
      error: null
    };
  }
  
  async listFiles(bucket: string, prefix?: string) {
    const files = Array.from(this.storage.keys())
      .filter(key => key.startsWith(`${bucket}/${prefix || ''}`))
      .map(key => ({
        name: key.replace(`${bucket}/`, ''),
        bucket,
        created_at: new Date().toISOString()
      }));
    
    return {
      data: files,
      error: null
    };
  }
  
  clear() {
    this.storage.clear();
  }
}

/**
 * Sets up storage client for testing
 * Uses real Supabase in integration mode, mock in unit mode
 */
export async function setupTestStorage(mode: 'unit' | 'integration' = 'unit'): Promise<TestStorage> {
  if (mode === 'integration' && process.env.TEST_SUPABASE_URL) {
    // Use real Supabase test bucket
    const client = new SupabaseStorageClient({
      url: process.env.TEST_SUPABASE_URL,
      serviceKey: process.env.TEST_SUPABASE_SERVICE_KEY!,
    });
    
    // Create test bucket if it doesn't exist
    await client.createBucket('test-invoices', { public: false });
    
    return {
      client,
      cleanup: async () => {
        // Clean up test files
        const { data: files } = await client.listFiles('test-invoices');
        if (files) {
          for (const file of files) {
            await client.deleteFile('test-invoices', file.name);
          }
        }
      }
    };
  } else {
    // Use mock storage for unit tests
    const client = new MockStorageClient();
    
    return {
      client,
      cleanup: async () => {
        client.clear();
      }
    };
  }
}

/**
 * Helper to create a file-like object for testing
 * Avoids Zod/File API issues in Node.js
 */
export interface TestFile {
  buffer: Buffer;
  name: string;
  type: string;
  size: number;
}

export function createTestFile(
  content: Buffer | string,
  name: string,
  type: string = 'application/pdf'
): TestFile {
  const buffer = typeof content === 'string' ? Buffer.from(content) : content;
  
  return {
    buffer,
    name,
    type,
    size: buffer.length
  };
}
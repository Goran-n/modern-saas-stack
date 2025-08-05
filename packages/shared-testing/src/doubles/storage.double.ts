export interface StorageFile {
  buffer: Buffer;
  path: string;
  metadata?: Record<string, any>;
}

export class StorageDouble {
  private files: Map<string, StorageFile> = new Map();
  private errors: Map<string, Error> = new Map();
  private delays: Map<string, number> = new Map();

  async uploadBuffer(
    bucket: string,
    path: string,
    buffer: Buffer,
    options?: { contentType?: string; metadata?: Record<string, any> }
  ): Promise<{ data: { url: string; path: string } | null; error: Error | null }> {
    const fullPath = `${bucket}/${path}`;
    
    // Check for configured errors
    const error = this.errors.get(fullPath) || this.errors.get('*');
    if (error) {
      return { data: null, error };
    }

    // Simulate delay if configured
    const delay = this.delays.get(fullPath) || this.delays.get('*') || 0;
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Store the file
    this.files.set(fullPath, {
      buffer,
      path,
      metadata: options?.metadata,
    });

    return {
      data: {
        url: `https://test-storage.example.com/${fullPath}`,
        path: fullPath,
      },
      error: null,
    };
  }

  async downloadBuffer(
    bucket: string,
    path: string
  ): Promise<{ data: Buffer | null; error: Error | null }> {
    const fullPath = `${bucket}/${path}`;
    
    // Check for configured errors
    const error = this.errors.get(fullPath) || this.errors.get('*');
    if (error) {
      return { data: null, error };
    }

    const file = this.files.get(fullPath);
    if (!file) {
      return { data: null, error: new Error('File not found') };
    }

    return { data: file.buffer, error: null };
  }

  async signedUrl(
    bucket: string,
    path: string,
    expiresIn: number = 3600
  ): Promise<{ data: { signedUrl: string } | null; error: Error | null }> {
    const fullPath = `${bucket}/${path}`;
    
    // Check for configured errors
    const error = this.errors.get(fullPath) || this.errors.get('*');
    if (error) {
      return { data: null, error };
    }

    const file = this.files.get(fullPath);
    if (!file) {
      return { data: null, error: new Error('File not found') };
    }

    return {
      data: {
        signedUrl: `https://test-storage.example.com/${fullPath}?token=test-token&expires=${expiresIn}`,
      },
      error: null,
    };
  }

  async deleteFile(
    bucket: string,
    path: string
  ): Promise<{ error: Error | null }> {
    const fullPath = `${bucket}/${path}`;
    
    // Check for configured errors
    const error = this.errors.get(fullPath) || this.errors.get('*');
    if (error) {
      return { error };
    }

    this.files.delete(fullPath);
    return { error: null };
  }

  // Test-specific methods
  simulateError(path: string, error: Error): void {
    this.errors.set(path, error);
  }

  simulateDelay(path: string, delayMs: number): void {
    this.delays.set(path, delayMs);
  }

  getFile(bucket: string, path: string): StorageFile | undefined {
    return this.files.get(`${bucket}/${path}`);
  }

  getAllFiles(): Map<string, StorageFile> {
    return new Map(this.files);
  }

  clear(): void {
    this.files.clear();
    this.errors.clear();
    this.delays.clear();
  }

  reset(): void {
    this.clear();
  }
}

export function createTestStorage(): StorageDouble {
  return new StorageDouble();
}
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { download, remove, signedUrl, upload } from "./operations";

export class SupabaseStorageClient {
  private client: SupabaseClient;
  private bucket: string;

  constructor(config: {
    url: string;
    serviceRoleKey: string;
    bucket: string;
  }) {
    this.client = createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
    this.bucket = config.bucket;
  }

  async upload(path: string, file: File): Promise<string> {
    return upload(this.client, {
      file,
      path: path.split("/"),
      bucket: this.bucket,
    });
  }

  async download(path: string): Promise<{ data: Blob }> {
    return download(this.client, {
      path,
      bucket: this.bucket,
    });
  }

  async remove(path: string[]): Promise<void> {
    return remove(this.client, {
      path,
      bucket: this.bucket,
    });
  }

  async signedUrl(
    path: string,
    expireIn: number,
  ): Promise<{ data: { signedUrl: string } | null; error: Error | null }> {
    try {
      const result = await signedUrl(this.client, {
        path,
        bucket: this.bucket,
        expireIn,
      });
      return { data: result.data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }
}

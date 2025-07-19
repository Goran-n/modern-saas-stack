import { createLogger } from "@kibly/utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DownloadOptions,
  RemoveOptions,
  SignedUrlOptions,
  UploadOptions,
} from "./types";

const logger = createLogger("supabase-storage");

/**
 * Upload a file to Supabase Storage
 * @param client - Supabase client instance
 * @param options - Upload options
 * @returns Promise resolving to the public URL
 */
export async function upload(
  client: SupabaseClient,
  options: UploadOptions,
): Promise<string> {
  const { file, path, bucket } = options;
  const fullPath = path.join("/");

  logger.info(`Uploading file to ${bucket}/${fullPath}`, {
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  });

  const { error } = await client.storage.from(bucket).upload(fullPath, file, {
    cacheControl: "3600",
    upsert: true,
  });

  if (error) {
    logger.error("Failed to upload file", { error, path: fullPath, bucket });
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  const { data: publicUrlData } = client.storage
    .from(bucket)
    .getPublicUrl(fullPath);

  logger.info(`File uploaded successfully`, {
    path: fullPath,
    bucket,
    publicUrl: publicUrlData.publicUrl,
  });

  return publicUrlData.publicUrl;
}

/**
 * Download a file from Supabase Storage
 * @param client - Supabase client instance
 * @param options - Download options
 * @returns Promise resolving to the file data
 */
export async function download(
  client: SupabaseClient,
  options: DownloadOptions,
): Promise<{ data: Blob }> {
  const { bucket, path } = options;

  logger.info(`Downloading file from ${bucket}/${path}`);

  const { data, error } = await client.storage.from(bucket).download(path);

  if (error) {
    logger.error("Failed to download file", { error, path, bucket });
    throw new Error(`Failed to download file: ${error.message}`);
  }

  if (!data) {
    logger.error("No data returned from download", { path, bucket });
    throw new Error("No data returned from download");
  }

  logger.info(`File downloaded successfully`, {
    path,
    bucket,
    size: data.size,
  });

  return { data };
}

/**
 * Remove a file from Supabase Storage
 * @param client - Supabase client instance
 * @param options - Remove options
 * @returns Promise resolving when file is removed
 */
export async function remove(
  client: SupabaseClient,
  options: RemoveOptions,
): Promise<void> {
  const { bucket, path } = options;
  const fullPath = path.join("/");

  logger.info(`Removing file from ${bucket}/${fullPath}`);

  const { error } = await client.storage.from(bucket).remove([fullPath]);

  if (error) {
    logger.error("Failed to remove file", { error, path: fullPath, bucket });
    throw new Error(`Failed to remove file: ${error.message}`);
  }

  logger.info(`File removed successfully`, { path: fullPath, bucket });
}

/**
 * Generate a signed URL for a file in Supabase Storage
 * @param client - Supabase client instance
 * @param options - Signed URL options
 * @returns Promise resolving to the signed URL data
 */
export async function signedUrl(
  client: SupabaseClient,
  options: SignedUrlOptions,
): Promise<{ data: { signedUrl: string } }> {
  const { bucket, path, expireIn } = options;

  logger.info(`Generating signed URL for ${bucket}/${path}`, { expireIn });

  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(path, expireIn);

  if (error) {
    logger.error("Failed to generate signed URL", { error, path, bucket });
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }

  if (!data) {
    logger.error("No data returned from signed URL generation", {
      path,
      bucket,
    });
    throw new Error("No data returned from signed URL generation");
  }

  logger.info(`Signed URL generated successfully`, { path, bucket, expireIn });

  return { data };
}

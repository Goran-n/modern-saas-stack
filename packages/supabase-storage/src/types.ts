/**
 * Options for uploading files to Supabase Storage
 */
export interface UploadOptions {
  /** The file to upload */
  file: File;
  /** Path tokens to construct the file path */
  path: string[];
  /** Storage bucket name */
  bucket: string;
}

/**
 * Options for downloading files from Supabase Storage
 */
export interface DownloadOptions {
  /** Storage bucket name */
  bucket: string;
  /** Full file path */
  path: string;
}

/**
 * Options for removing files from Supabase Storage
 */
export interface RemoveOptions {
  /** Storage bucket name */
  bucket: string;
  /** Path tokens to construct the file path */
  path: string[];
}

/**
 * Options for generating signed URLs
 */
export interface SignedUrlOptions {
  /** Storage bucket name */
  bucket: string;
  /** Full file path */
  path: string;
  /** URL expiration time in seconds */
  expireIn: number;
}
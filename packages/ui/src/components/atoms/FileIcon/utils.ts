import type { FileIconConfig } from "./types";

/**
 * Get file extension from filename
 */
const getFileExtension = (fileName: string): string => {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts[parts.length - 1]!.toLowerCase() : "";
};

/**
 * Map of supported file extensions to icon configurations
 * Only supports images and PDFs as per business requirements
 */
const fileIconMap: Record<string, FileIconConfig> = {
  // PDFs
  pdf: {
    icon: "i-heroicons-document-text",
    colorClass: "text-error-600",
    label: "PDF Document",
  },

  // Images
  jpg: {
    icon: "i-heroicons-photo",
    colorClass: "text-primary-600",
    label: "JPEG Image",
  },
  jpeg: {
    icon: "i-heroicons-photo",
    colorClass: "text-primary-600",
    label: "JPEG Image",
  },
  png: {
    icon: "i-heroicons-photo",
    colorClass: "text-primary-600",
    label: "PNG Image",
  },
  gif: {
    icon: "i-heroicons-photo",
    colorClass: "text-primary-500",
    label: "GIF Image",
  },
  svg: {
    icon: "i-heroicons-photo",
    colorClass: "text-primary-700",
    label: "SVG Image",
  },
  webp: {
    icon: "i-heroicons-photo",
    colorClass: "text-primary-600",
    label: "WebP Image",
  },
};

/**
 * MIME type to icon fallbacks for supported file types
 */
const mimeTypeMap: Record<string, FileIconConfig> = {
  "application/pdf": fileIconMap.pdf!,
  "image/jpeg": fileIconMap.jpg!,
  "image/png": fileIconMap.png!,
  "image/gif": fileIconMap.gif!,
  "image/svg+xml": fileIconMap.svg!,
  "image/webp": fileIconMap.webp!,
};

/**
 * Default icon for unsupported file types
 */
const defaultIcon: FileIconConfig = {
  icon: "i-heroicons-document",
  colorClass: "text-neutral-400",
  label: "Unsupported File",
};

/**
 * Get icon configuration for a file based on name and MIME type
 */
export const getFileIconConfig = (
  fileName: string,
  mimeType?: string,
): FileIconConfig => {
  // Try MIME type first if provided
  if (mimeType && mimeTypeMap[mimeType]) {
    return mimeTypeMap[mimeType];
  }

  // Fall back to extension
  const extension = getFileExtension(fileName);
  return fileIconMap[extension] || defaultIcon;
};

/**
 * Check if file is a supported image based on extension or MIME type
 */
export const isImageFile = (fileName: string, mimeType?: string): boolean => {
  if (mimeType?.startsWith("image/")) {
    return [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/svg+xml",
      "image/webp",
    ].includes(mimeType);
  }

  const extension = getFileExtension(fileName);
  return ["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(extension);
};

/**
 * Check if file is a PDF based on extension or MIME type
 */
export const isPDFFile = (fileName: string, mimeType?: string): boolean => {
  if (mimeType === "application/pdf") return true;

  const extension = getFileExtension(fileName);
  return extension === "pdf";
};

/**
 * Check if file type is supported (images and PDFs only)
 */
export const isSupportedFile = (
  fileName: string,
  mimeType?: string,
): boolean => {
  return isImageFile(fileName, mimeType) || isPDFFile(fileName, mimeType);
};

/**
 * Get human-readable file type label
 */
export const getFileTypeLabel = (
  fileName: string,
  mimeType?: string,
): string => {
  const config = getFileIconConfig(fileName, mimeType);
  return config.label;
};

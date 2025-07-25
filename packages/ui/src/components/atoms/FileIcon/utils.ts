import type { FileIconConfig } from "./types";

/**
 * Get file extension from filename
 */
const getFileExtension = (fileName: string): string => {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
};

/**
 * Map of file extensions to icon configurations
 * Using Figgy brand colours for consistency
 */
const fileIconMap: Record<string, FileIconConfig> = {
  // Documents
  pdf: {
    icon: "i-heroicons-document-text",
    colorClass: "text-error-600",
    label: "PDF Document",
  },
  doc: {
    icon: "i-heroicons-document",
    colorClass: "text-blue-600",
    label: "Word Document",
  },
  docx: {
    icon: "i-heroicons-document",
    colorClass: "text-blue-600",
    label: "Word Document",
  },

  // Spreadsheets
  xls: {
    icon: "i-heroicons-table-cells",
    colorClass: "text-success-600",
    label: "Excel Spreadsheet",
  },
  xlsx: {
    icon: "i-heroicons-table-cells",
    colorClass: "text-success-600",
    label: "Excel Spreadsheet",
  },
  csv: {
    icon: "i-heroicons-table-cells",
    colorClass: "text-success-500",
    label: "CSV File",
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

  // Archives
  zip: {
    icon: "i-heroicons-archive-box",
    colorClass: "text-warning-600",
    label: "ZIP Archive",
  },
  rar: {
    icon: "i-heroicons-archive-box",
    colorClass: "text-warning-600",
    label: "RAR Archive",
  },
  "7z": {
    icon: "i-heroicons-archive-box",
    colorClass: "text-warning-600",
    label: "7-Zip Archive",
  },
  tar: {
    icon: "i-heroicons-archive-box",
    colorClass: "text-warning-700",
    label: "TAR Archive",
  },
  gz: {
    icon: "i-heroicons-archive-box",
    colorClass: "text-warning-700",
    label: "GZ Archive",
  },

  // Text files
  txt: {
    icon: "i-heroicons-document-text",
    colorClass: "text-neutral-600",
    label: "Text File",
  },
  md: {
    icon: "i-heroicons-document-text",
    colorClass: "text-neutral-700",
    label: "Markdown File",
  },

  // Code files
  js: {
    icon: "i-heroicons-code-bracket",
    colorClass: "text-warning-500",
    label: "JavaScript File",
  },
  ts: {
    icon: "i-heroicons-code-bracket",
    colorClass: "text-blue-600",
    label: "TypeScript File",
  },
  json: {
    icon: "i-heroicons-code-bracket",
    colorClass: "text-neutral-600",
    label: "JSON File",
  },
  xml: {
    icon: "i-heroicons-code-bracket",
    colorClass: "text-secondary-600",
    label: "XML File",
  },

  // Presentations
  ppt: {
    icon: "i-heroicons-presentation-chart-bar",
    colorClass: "text-secondary-600",
    label: "PowerPoint",
  },
  pptx: {
    icon: "i-heroicons-presentation-chart-bar",
    colorClass: "text-secondary-600",
    label: "PowerPoint",
  },

  // Email
  eml: {
    icon: "i-heroicons-envelope",
    colorClass: "text-blue-600",
    label: "Email Message",
  },
  msg: {
    icon: "i-heroicons-envelope",
    colorClass: "text-blue-700",
    label: "Outlook Message",
  },

  // Video
  mp4: {
    icon: "i-heroicons-video-camera",
    colorClass: "text-primary-600",
    label: "MP4 Video",
  },
  avi: {
    icon: "i-heroicons-video-camera",
    colorClass: "text-primary-600",
    label: "AVI Video",
  },
  mov: {
    icon: "i-heroicons-video-camera",
    colorClass: "text-primary-600",
    label: "QuickTime Video",
  },

  // Audio
  mp3: {
    icon: "i-heroicons-musical-note",
    colorClass: "text-accent-600",
    label: "MP3 Audio",
  },
  wav: {
    icon: "i-heroicons-musical-note",
    colorClass: "text-accent-600",
    label: "WAV Audio",
  },
  flac: {
    icon: "i-heroicons-musical-note",
    colorClass: "text-accent-700",
    label: "FLAC Audio",
  },
};

/**
 * MIME type to icon fallbacks
 */
const mimeTypeMap: Record<string, FileIconConfig> = {
  "application/pdf": fileIconMap.pdf,
  "application/msword": fileIconMap.doc,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    fileIconMap.docx,
  "application/vnd.ms-excel": fileIconMap.xls,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    fileIconMap.xlsx,
  "text/csv": fileIconMap.csv,
  "image/jpeg": fileIconMap.jpg,
  "image/png": fileIconMap.png,
  "image/gif": fileIconMap.gif,
  "image/svg+xml": fileIconMap.svg,
  "image/webp": fileIconMap.webp,
  "application/zip": fileIconMap.zip,
  "application/x-rar-compressed": fileIconMap.rar,
  "text/plain": fileIconMap.txt,
  "text/markdown": fileIconMap.md,
  "application/json": fileIconMap.json,
  "application/xml": fileIconMap.xml,
  "text/xml": fileIconMap.xml,
};

/**
 * Default icon for unknown file types
 */
const defaultIcon: FileIconConfig = {
  icon: "i-heroicons-document",
  colorClass: "text-neutral-500",
  label: "Unknown File",
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
 * Check if file is an image based on extension or MIME type
 */
export const isImageFile = (fileName: string, mimeType?: string): boolean => {
  if (mimeType?.startsWith("image/")) return true;

  const extension = getFileExtension(fileName);
  return ["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp", "ico"].includes(
    extension,
  );
};

/**
 * Check if file is a document based on extension or MIME type
 */
export const isDocumentFile = (
  fileName: string,
  mimeType?: string,
): boolean => {
  const documentMimeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
  ];

  if (mimeType && documentMimeTypes.includes(mimeType)) return true;

  const extension = getFileExtension(fileName);
  return ["pdf", "doc", "docx", "txt", "md", "rtf"].includes(extension);
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

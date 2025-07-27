/**
 * Clean file name by removing common prefixes and suffixes
 * @param fileName - Original file name
 * @returns Cleaned file name
 */
export const cleanFileName = (fileName: string): string => {
  if (!fileName) return "";

  // Remove common ID prefixes (e.g., "753201611881_Invoice_24284212.pdf" -> "24284212.pdf")
  let cleaned = fileName
    .replace(/^\d+_/, "") // Remove leading digits followed by underscore
    .replace(/^Invoice_/i, "") // Remove "Invoice_" prefix (case insensitive)
    .replace(/^Receipt_/i, "") // Remove "Receipt_" prefix
    .replace(/^Document_/i, "") // Remove "Document_" prefix
    .replace(/^File_/i, ""); // Remove "File_" prefix

  // Remove file extension for display if needed
  // const nameWithoutExt = cleaned.replace(/\.[^/.]+$/, '')

  return cleaned.trim();
};

/**
 * Get a user-friendly display name for a file
 * @param file - File object with metadata
 * @returns Display name
 */
export const getFileDisplayName = (file: {
  fileName: string;
  metadata?: { displayName?: string | null };
}): string => {
  // Prefer user-defined display name
  if (file.metadata?.displayName) {
    return file.metadata.displayName;
  }

  // Otherwise clean the file name
  return cleanFileName(file.fileName);
};

/**
 * Extract file extension
 * @param fileName - File name
 * @returns File extension without dot, lowercase
 */
export const getFileExtension = (fileName: string): string => {
  const parts = fileName.split(".");
  if (parts.length > 1) {
    return parts[parts.length - 1]?.toLowerCase() || "";
  }
  return "";
};

/**
 * Check if file is a PDF
 * @param fileName - File name
 * @returns True if PDF
 */
export const isPDF = (fileName: string): boolean => {
  return getFileExtension(fileName) === "pdf";
};

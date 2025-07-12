/**
 * Validation helper functions for common use cases
 */
/**
 * Validates if a string is a valid UUID
 * @param uuid - The string to validate
 * @returns True if valid UUID, false otherwise
 */
export function isValidUuid(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}
/**
 * Validates if a string is a valid file name
 * @param fileName - The file name to validate
 * @returns True if valid file name, false otherwise
 */
export function isValidFileName(fileName) {
    // Check for reserved characters and length
    const reservedChars = /[<>:"/\\|?*\x00-\x1f]/;
    return !reservedChars.test(fileName) && fileName.length > 0 && fileName.length <= 255;
}
//# sourceMappingURL=validation.js.map
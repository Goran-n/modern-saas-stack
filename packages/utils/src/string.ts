/**
 * Strips special characters from a string, keeping only alphanumeric characters, hyphens, underscores, and dots.
 * Useful for sanitising file names and paths.
 *
 * @param input - The string to sanitise
 * @returns The sanitised string
 */
export function stripSpecialCharacters(input: string): string {
  return input.replace(/[^a-zA-Z0-9\-_.]/g, "");
}

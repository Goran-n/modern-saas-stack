import { getDb as getSharedDb } from "@figgy/shared-db";

/**
 * Get database instance
 */
export function getDb() {
  return getSharedDb();
}
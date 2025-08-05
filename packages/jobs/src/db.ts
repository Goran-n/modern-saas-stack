import { getDb as getSharedDb } from "@figgy/shared-db";

/**
 * Get database instance
 */
export function getDb() {
  return getSharedDb();
}

/**
 * Re-export for compatibility
 */
export const db = new Proxy({} as ReturnType<typeof getSharedDb>, {
  get(_, prop, receiver) {
    const dbInstance = getDb();
    return Reflect.get(dbInstance, prop, receiver);
  },
});
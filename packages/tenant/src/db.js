import { createDrizzleClient } from '@kibly/shared-db';
import { getConfig } from '@kibly/config';
let dbInstance = null;
/**
 * Get the database instance
 * Creates a new connection if one doesn't exist
 */
export function getDb() {
    if (!dbInstance) {
        const config = getConfig().getForTenant();
        dbInstance = createDrizzleClient(config.DATABASE_URL);
    }
    return dbInstance;
}
/**
 * Set a custom database instance (useful for testing)
 */
export function setDb(db) {
    dbInstance = db;
}
/**
 * Reset the database instance
 */
export function resetDb() {
    dbInstance = null;
}
//# sourceMappingURL=db.js.map
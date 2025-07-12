import { type DrizzleClient } from '@kibly/shared-db';
/**
 * Get the database instance
 * Creates a new connection if one doesn't exist
 */
export declare function getDb(): DrizzleClient;
/**
 * Set a custom database instance (useful for testing)
 */
export declare function setDb(db: DrizzleClient): void;
/**
 * Reset the database instance
 */
export declare function resetDb(): void;
//# sourceMappingURL=db.d.ts.map
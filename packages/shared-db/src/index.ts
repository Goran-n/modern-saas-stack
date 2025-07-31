import { getConfig } from "@my-app/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Export all schemas
export * from "./schemas";

// Re-export common Drizzle functions
export { eq, and, or, desc, asc, sql, inArray, isNull, isNotNull } from "drizzle-orm";

// Database connection singleton
let db: ReturnType<typeof drizzle> | null = null;
let client: ReturnType<typeof postgres> | null = null;

export function getDatabaseConnection() {
  if (!db) {
    const config = getConfig();
    client = postgres(config.DATABASE_URL);
    db = drizzle(client);
  }
  return db;
}

// Alias for convenience
export { getDatabaseConnection as db };

// Health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const db = getDatabaseConnection();
    await db.execute(sql`SELECT 1`);
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  if (client) {
    await client.end();
    client = null;
    db = null;
  }
}
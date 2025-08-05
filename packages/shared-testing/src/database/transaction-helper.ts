import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { describe, beforeEach, afterEach } from 'vitest';

export interface TransactionHelper {
  runInTransaction: <T>(
    fn: (tx: PostgresJsDatabase) => Promise<T>
  ) => Promise<T>;
  cleanup: () => Promise<void>;
}

export class PostgresTransactionHelper implements TransactionHelper {
  private sql: postgres.Sql;
  private db: PostgresJsDatabase;
  private activeTransaction: any = null;

  constructor(connectionString: string) {
    this.sql = postgres(connectionString, {
      max: 1,
      onnotice: () => {}, // Suppress notices in tests
    });
    this.db = drizzle(this.sql);
  }

  async runInTransaction<T>(
    fn: (tx: PostgresJsDatabase) => Promise<T>
  ): Promise<T> {
    // Create a savepoint for nested transactions
    const savepointName = `sp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      await this.sql`BEGIN`;
      await this.sql`SAVEPOINT ${this.sql(savepointName)}`;

      const result = await fn(this.db);

      // Always rollback in tests to keep database clean
      await this.sql`ROLLBACK TO SAVEPOINT ${this.sql(savepointName)}`;
      await this.sql`ROLLBACK`;

      return result;
    } catch (error) {
      await this.sql`ROLLBACK`;
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    await this.sql.end();
  }
}

// Factory function for creating transaction helpers
export function createTransactionHelper(
  connectionString: string
): TransactionHelper {
  return new PostgresTransactionHelper(connectionString);
}

// Test wrapper that automatically handles transactions
export function withTransaction<T extends (...args: any[]) => Promise<any>>(
  testFn: T,
  connectionString: string
): T {
  return (async (...args: Parameters<T>) => {
    const helper = createTransactionHelper(connectionString);
    try {
      return await helper.runInTransaction(async (tx) => {
        // Replace the db instance in the test context
        if (args[0] && typeof args[0] === 'object' && 'db' in args[0]) {
          args[0].db = tx;
        }
        return await testFn(...args);
      });
    } finally {
      await helper.cleanup();
    }
  }) as T;
}

// Vitest test helper
export function describeWithTransaction(
  name: string,
  fn: (getDb: () => PostgresJsDatabase) => void,
  connectionString: string
) {
  describe(name, () => {
    let helper: TransactionHelper;
    let currentDb: PostgresJsDatabase;

    beforeEach(async () => {
      helper = createTransactionHelper(connectionString);
      await helper.runInTransaction(async (tx) => {
        currentDb = tx;
      });
    });

    afterEach(async () => {
      await helper.cleanup();
    });

    fn(() => currentDb);
  });
}
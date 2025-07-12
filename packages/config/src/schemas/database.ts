import { z } from 'zod';

/**
 * Database connection environment variables schema
 */
export const databaseSchema = z.object({
  /**
   * PostgreSQL database connection string
   * @required
   * @example 'postgresql://user:password@localhost:5432/database'
   */
  DATABASE_URL: z.string().url().min(1, 'DATABASE_URL is required'),
});

export type DatabaseConfig = z.infer<typeof databaseSchema>;
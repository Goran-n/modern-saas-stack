/**
 * Test database helper for integration tests
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import type { QueryExecutor } from '../../src/infrastructure/database/query-executor'
import { DrizzleQueryExecutor } from '../../src/infrastructure/database/drizzle-query-executor'

export class TestDatabase {
  private sql: postgres.Sql
  private db: any
  public queryExecutor: QueryExecutor

  private constructor(connectionString: string) {
    this.sql = postgres(connectionString, { max: 1 })
    this.db = drizzle(this.sql)
    this.queryExecutor = new DrizzleQueryExecutor(this.db)
  }

  static async create(): Promise<TestDatabase> {
    const dbName = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const connectionString = process.env.TEST_DATABASE_URL || 'postgres://localhost:5432/kibly_test'
    
    // Create test database
    const adminSql = postgres(connectionString.replace(/\/[^/]*$/, '/postgres'), { max: 1 })
    await adminSql`CREATE DATABASE ${adminSql(dbName)}`
    await adminSql.end()

    // Connect to test database
    const testDbUrl = connectionString.replace(/\/[^/]*$/, `/${dbName}`)
    const instance = new TestDatabase(testDbUrl)
    
    // Run migrations
    await instance.migrate()
    
    return instance
  }

  async migrate() {
    // Run database migrations
    // This would normally use your migration tool
    // For now, we'll create basic tables
    await this.sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        version INTEGER NOT NULL DEFAULT 0
      )
    `

    await this.sql`
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        plan VARCHAR(50) NOT NULL DEFAULT 'trial',
        settings JSONB DEFAULT '{}',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        version INTEGER NOT NULL DEFAULT 0
      )
    `
  }

  async cleanup() {
    // Clean all data but keep schema
    const tables = await this.sql`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
    `
    
    for (const { tablename } of tables) {
      await this.sql`TRUNCATE TABLE ${this.sql(tablename)} CASCADE`
    }
  }

  async destroy() {
    // Close connection and drop database
    const dbName = this.sql.options.database
    await this.sql.end()
    
    const adminSql = postgres(this.sql.options.connectionString.replace(/\/[^\/]*$/, '/postgres'), { max: 1 })
    await adminSql`DROP DATABASE IF EXISTS ${adminSql(dbName)}`
    await adminSql.end()
  }

  // Helper methods for test data
  async seedUser(data: any) {
    const [user] = await this.sql`
      INSERT INTO users ${this.sql(data)}
      RETURNING *
    `
    return user
  }

  async seedTenant(data: any) {
    const [tenant] = await this.sql`
      INSERT INTO tenants ${this.sql(data)}
      RETURNING *
    `
    return tenant
  }
}
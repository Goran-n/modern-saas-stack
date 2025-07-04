import { eq, and } from 'drizzle-orm'
import { getDatabase } from '../database/connection'
import { accounts, type Account } from '../database/schema/accounts'
import log from '../config/logger'

export class AccountService {
  private db = getDatabase()

  async listAccounts(tenantId: string): Promise<Account[]> {
    if (!this.db) return []

    try {
      const result = await this.db
        .select()
        .from(accounts)
        .where(eq(accounts.tenantId, tenantId))
        .orderBy(accounts.code)

      log.info(`Retrieved ${result.length} accounts for tenant ${tenantId}`)
      return result
    } catch (error) {
      log.error({ error, tenantId }, 'Failed to list accounts')
      throw new Error('Failed to retrieve accounts')
    }
  }

  async getAccount(id: string, tenantId: string): Promise<Account | null> {
    if (!this.db) return null

    try {
      const [account] = await this.db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.id, id),
            eq(accounts.tenantId, tenantId)
          )
        )

      if (!account) {
        log.warn({ id, tenantId }, 'Account not found')
        return null
      }

      log.info({ id, tenantId }, 'Retrieved account details')
      return account
    } catch (error) {
      log.error({ error, id, tenantId }, 'Failed to get account')
      throw new Error('Failed to retrieve account')
    }
  }

  async getBankAccounts(tenantId: string): Promise<Account[]> {
    if (!this.db) return []

    try {
      const result = await this.db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.tenantId, tenantId),
            eq(accounts.isBankAccount, true),
            eq(accounts.isActive, true)
          )
        )
        .orderBy(accounts.name)

      log.info(`Retrieved ${result.length} bank accounts for tenant ${tenantId}`)
      return result
    } catch (error) {
      log.error({ error, tenantId }, 'Failed to list bank accounts')
      throw new Error('Failed to retrieve bank accounts')
    }
  }
}
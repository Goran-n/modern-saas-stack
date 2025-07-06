export class BankFeedService {
  constructor() {}

  async getFeeds(_tenantId: string): Promise<any[]> {
    // Stub implementation
    return []
  }

  async createFeed(data: any): Promise<any> {
    // Stub implementation
    return { id: `feed_${Date.now()}`, ...data }
  }

  async listByAccount(_accountId: string): Promise<any[]> {
    // Stub implementation
    return []
  }

  async getUnreconciledCount(_accountId: string): Promise<number> {
    // Stub implementation
    return 0
  }

  async getDateRange(_accountId: string): Promise<{ earliest: Date | null; latest: Date | null }> {
    // Stub implementation
    return { earliest: null, latest: null }
  }
}
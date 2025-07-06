export class TransactionService {
  constructor() {}

  async findById(_id: string): Promise<any> {
    // Stub implementation
    return null
  }

  async findByTenantId(_tenantId: string): Promise<any[]> {
    // Stub implementation
    return []
  }

  async create(data: any): Promise<any> {
    // Stub implementation
    return { id: `txn_${Date.now()}`, ...data }
  }

  async listByAccount(_accountId: string, _params?: {
    limit?: number
    offset?: number
    startDate?: Date
    endDate?: Date
  }): Promise<{ data: any[]; total: number }> {
    // Stub implementation
    return { data: [], total: 0 }
  }
}
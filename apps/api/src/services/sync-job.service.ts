export class SyncJobService {
  constructor() {}

  async findById(_id: string): Promise<any> {
    // Stub implementation
    return null
  }

  async findByIntegrationId(_integrationId: string): Promise<any[]> {
    // Stub implementation
    return []
  }

  async create(data: any): Promise<any> {
    // Stub implementation
    return { id: `job_${Date.now()}`, ...data }
  }

  async updateStatus(_id: string, _status: string): Promise<void> {
    // Stub implementation
  }
}
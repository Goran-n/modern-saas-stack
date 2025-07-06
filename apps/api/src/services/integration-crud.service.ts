import type { IntegrationEntity } from '../core/domain/integration'

export class IntegrationCrudService {
  constructor() {}

  async create(_data: any): Promise<IntegrationEntity> {
    // Stub implementation
    throw new Error('Not implemented')
  }

  async getById(_id: string): Promise<IntegrationEntity> {
    // Stub implementation
    throw new Error('Not implemented')
  }

  async getByTenant(_tenantId: string): Promise<IntegrationEntity[]> {
    // Stub implementation
    throw new Error('Not implemented')
  }

  async update(_id: string, _data: any): Promise<IntegrationEntity> {
    // Stub implementation
    throw new Error('Not implemented')
  }

  async delete(_id: string): Promise<void> {
    // Stub implementation
    throw new Error('Not implemented')
  }

  async completeOAuthSetup(_data: any): Promise<IntegrationEntity> {
    // Stub implementation
    throw new Error('Not implemented')
  }

  async testConnection(_id: string): Promise<boolean> {
    // Stub implementation
    return true
  }
}
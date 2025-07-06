import type { IntegrationEntity, IntegrationProvider, IntegrationType } from '../domain/integration'
import { EntityId } from '../domain/shared/value-objects/entity-id'

export interface IntegrationRepository {
  findById(id: EntityId): Promise<IntegrationEntity | null>
  findByTenant(tenantId: string): Promise<IntegrationEntity[]>
  findByTenantAndProvider(tenantId: string, provider: IntegrationProvider): Promise<IntegrationEntity | null>
  findByProvider(provider: IntegrationProvider): Promise<IntegrationEntity[]>
  findByType(type: IntegrationType): Promise<IntegrationEntity[]>
  save(integration: IntegrationEntity): Promise<IntegrationEntity>
  create(integration: IntegrationEntity): Promise<IntegrationEntity>
  update(id: EntityId, data: Partial<IntegrationEntity>): Promise<IntegrationEntity>
  delete(id: string): Promise<void>
  exists(id: string): Promise<boolean>
  existsByTenantAndProvider(tenantId: string, provider: IntegrationProvider): Promise<boolean>
  countByTenant(tenantId: string): Promise<number>
  findActive(): Promise<IntegrationEntity[]>
  findWithErrors(): Promise<IntegrationEntity[]>
  findDueForSync(): Promise<IntegrationEntity[]>
}
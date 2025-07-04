import { TenantEntity, TenantMemberEntity } from '../../src/core/domain/tenant'

export const createMockTenant = (overrides: Partial<any> = {}): TenantEntity => {
  return TenantEntity.fromDatabase({
    id: 'tenant-1',
    name: 'Test Tenant',
    slug: 'test-tenant',
    email: 'test@example.com',
    status: 'active',
    settings: {},
    subscription: {},
    metadata: {},
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    ...overrides,
  })
}

export const createMockTenantMember = (overrides: Partial<any> = {}): TenantMemberEntity => {
  return TenantMemberEntity.fromDatabase({
    id: 'member-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    role: 'member',
    permissions: {
      files: { view: true, create: true, edit: true, delete: false },
      providers: { connect: false, disconnect: false, configure: false },
      analytics: { view: true, export: false },
      team: { view: true, invite: false, remove: false, changeRoles: false },
      tenant: { view: true, edit: false, delete: false, billing: false },
    },
    status: 'active',
    invitationToken: null,
    invitationExpiresAt: null,
    joinedAt: new Date('2024-01-01'),
    lastAccessAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  })
}
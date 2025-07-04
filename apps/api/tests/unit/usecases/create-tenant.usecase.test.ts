import { describe, test, expect, beforeEach } from 'bun:test'
import { CreateTenantUseCase } from '../../../src/core/usecases/tenant/create-tenant.usecase'
import { ConflictError, BusinessRuleError } from '../../../src/shared/errors'

// Mock repositories
class MockTenantRepository {
  private tenants: any[] = []

  async save(tenant: any) { 
    this.tenants.push(tenant)
    return tenant 
  }
  
  async findByEmail(email: string) { 
    return this.tenants.find(t => t.email === email) || null 
  }
  
  async findBySlug(slug: string) { 
    return this.tenants.find(t => t.slug === slug) || null 
  }
  
  async existsBySlug(slug: string) { 
    return this.tenants.some(t => t.slug === slug) 
  }

  reset() {
    this.tenants = []
  }
}

class MockTenantMemberRepository {
  private members: any[] = []

  async save(member: any) { 
    this.members.push(member)
    return member 
  }

  reset() {
    this.members = []
  }
}

describe('CreateTenantUseCase', () => {
  let useCase: CreateTenantUseCase
  let tenantRepo: MockTenantRepository
  let memberRepo: MockTenantMemberRepository

  beforeEach(() => {
    tenantRepo = new MockTenantRepository()
    memberRepo = new MockTenantMemberRepository()
    useCase = new CreateTenantUseCase(tenantRepo as any, memberRepo as any)
  })

  test('should create tenant with owner membership', async () => {
    const input = {
      name: 'Test Tenant',
      email: 'test@example.com',
      ownerId: 'user-1',
    }

    const result = await useCase.execute(input)

    expect(result.tenant.name).toBe('Test Tenant')
    expect(result.tenant.email).toBe('test@example.com')
    expect(result.tenant.isActive()).toBe(true)
    expect(result.ownerMembership.role).toBe('owner')
    expect(result.ownerMembership.userId).toBe('user-1')
    expect(result.ownerMembership.isActive()).toBe(true)
  })

  test('should throw ConflictError if email already exists', async () => {
    // First tenant
    await useCase.execute({
      name: 'First Tenant',
      email: 'test@example.com',
      ownerId: 'user-1',
    })

    // Second tenant with same email
    const input = {
      name: 'Second Tenant',
      email: 'test@example.com',
      ownerId: 'user-2',
    }

    await expect(useCase.execute(input)).rejects.toThrow(ConflictError)
  })

  test('should throw BusinessRuleError for invalid name length', async () => {
    const input = {
      name: 'A', // Too short
      email: 'test@example.com',
      ownerId: 'user-1',
    }

    await expect(useCase.execute(input)).rejects.toThrow(BusinessRuleError)
  })

  test('should throw BusinessRuleError for invalid email format', async () => {
    const input = {
      name: 'Test Tenant',
      email: 'invalid-email',
      ownerId: 'user-1',
    }

    await expect(useCase.execute(input)).rejects.toThrow(BusinessRuleError)
  })

  test('should generate unique slug when name conflicts exist', async () => {
    // Create first tenant
    await useCase.execute({
      name: 'Test Tenant',
      email: 'test1@example.com',
      ownerId: 'user-1',
    })

    // Create second tenant with same name
    const result = await useCase.execute({
      name: 'Test Tenant',
      email: 'test2@example.com',
      ownerId: 'user-2',
    })

    expect(result.tenant.slug).toBe('test-tenant-1')
  })
})
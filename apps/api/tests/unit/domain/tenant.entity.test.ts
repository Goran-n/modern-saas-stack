import { describe, test, expect } from 'bun:test'
import { TenantEntity } from '../../../src/core/domain/tenant'

describe('TenantEntity', () => {
  describe('create', () => {
    test('should create a new tenant with default values', () => {
      const tenant = TenantEntity.create({
        name: 'Test Tenant',
        slug: 'test-tenant',
        email: 'test@example.com',
        status: 'active',
        settings: {},
        subscription: {},
        metadata: {},
      })

      expect(tenant.name).toBe('Test Tenant')
      expect(tenant.slug).toBe('test-tenant')
      expect(tenant.email).toBe('test@example.com')
      expect(tenant.status).toBe('active')
      expect(tenant.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
      expect(tenant.createdAt).toBeInstanceOf(Date)
      expect(tenant.updatedAt).toBeInstanceOf(Date)
      expect(tenant.deletedAt).toBeNull()
    })
  })

  describe('business methods', () => {
    test('isActive should return true for active tenant', () => {
      const tenant = TenantEntity.fromDatabase({
        id: 'test-id',
        name: 'Test',
        slug: 'test',
        email: 'test@example.com',
        status: 'active',
        settings: {},
        subscription: {},
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      })

      expect(tenant.isActive()).toBe(true)
    })

    test('isActive should return false for deleted tenant', () => {
      const tenant = TenantEntity.fromDatabase({
        id: 'test-id',
        name: 'Test',
        slug: 'test',
        email: 'test@example.com',
        status: 'active',
        settings: {},
        subscription: {},
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(),
      })

      expect(tenant.isActive()).toBe(false)
    })

    test('hasFeatureEnabled should return true when feature is enabled', () => {
      const tenant = TenantEntity.fromDatabase({
        id: 'test-id',
        name: 'Test',
        slug: 'test',
        email: 'test@example.com',
        status: 'active',
        settings: { enabledFeatures: ['feature1', 'feature2'] },
        subscription: {},
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      })

      expect(tenant.hasFeatureEnabled('feature1')).toBe(true)
      expect(tenant.hasFeatureEnabled('feature3')).toBe(false)
    })

    test('suspend should change status to suspended', () => {
      const tenant = TenantEntity.fromDatabase({
        id: 'test-id',
        name: 'Test',
        slug: 'test',
        email: 'test@example.com',
        status: 'active',
        settings: {},
        subscription: {},
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      })

      tenant.suspend()
      expect(tenant.isSuspended()).toBe(true)
    })
  })
})
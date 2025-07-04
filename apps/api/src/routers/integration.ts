import { z } from 'zod'
import { router, tenantProcedure } from '../lib/trpc'
import { container } from '../lib/di'
import { requirePermission } from '../middleware/permissions'
import { IntegrationNotFoundError } from '../lib/errors'

// Input validation schemas
const createIntegrationSchema = z.object({
  provider: z.string().min(1),
  name: z.string().min(1).max(255),
  integrationType: z.enum(['accounting', 'file_storage', 'communication', 'banking']),
  settings: z.record(z.unknown()).optional(),
})

const updateIntegrationSchema = z.object({
  integrationId: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  settings: z.record(z.unknown()).optional(),
  status: z.enum(['active', 'error', 'disabled', 'setup_pending']).optional(),
})

const testConnectionSchema = z.object({
  integrationId: z.string().uuid(),
})

export const integrationRouter = router({
  // List tenant integrations
  list: tenantProcedure
    .query(async ({ ctx }) => {
      const integrationService = await container.resolve('IntegrationCrudService')
      return await integrationService.getByTenant(ctx.tenantContext.tenantId)
    }),

  // Get integration by ID
  get: tenantProcedure
    .input(z.object({ integrationId: z.string().uuid() }))
    .use(requirePermission('providers', 'view'))
    .query(async ({ input, ctx }) => {
      const integrationService = await container.resolve('IntegrationCrudService')
      
      const integration = await integrationService.getById(input.integrationId)
      
      if (!integration || integration.tenantId !== ctx.tenantContext.tenantId) {
        throw new IntegrationNotFoundError(input.integrationId)
      }
      
      return integration
    }),

  // Create new integration
  create: tenantProcedure
    .input(createIntegrationSchema)
    .use(requirePermission('providers', 'create'))
    .mutation(async ({ input, ctx }) => {
      const integrationService = await container.resolve('IntegrationCrudService')
      
      const createData: any = {
        ...input,
        tenantId: ctx.tenantContext.tenantId,
      }
      
      // Remove undefined values for exactOptionalPropertyTypes compliance
      if (createData.settings === undefined) {
        delete createData.settings
      }
      
      return await integrationService.create(createData)
    }),

  // Update integration
  update: tenantProcedure
    .input(updateIntegrationSchema)
    .use(requirePermission('providers', 'edit'))
    .mutation(async ({ input, ctx }) => {
      const integrationService = await container.resolve('IntegrationCrudService')
      
      // Verify integration belongs to tenant
      const integration = await integrationService.getById(input.integrationId)
      if (!integration || integration.tenantId !== ctx.tenantContext.tenantId) {
        throw new IntegrationNotFoundError(input.integrationId)
      }
      
      const { integrationId, ...rawUpdateData } = input
      
      // Remove undefined values for exactOptionalPropertyTypes compliance
      const updateData: any = {}
      if (rawUpdateData.name !== undefined) updateData.name = rawUpdateData.name
      if (rawUpdateData.status !== undefined) updateData.status = rawUpdateData.status
      if (rawUpdateData.settings !== undefined) updateData.settings = rawUpdateData.settings
      
      return await integrationService.update(integrationId, updateData)
    }),

  // Delete integration
  delete: tenantProcedure
    .input(z.object({ integrationId: z.string().uuid() }))
    .use(requirePermission('providers', 'delete'))
    .mutation(async ({ input, ctx }) => {
      const integrationService = await container.resolve('IntegrationCrudService')
      
      // Verify integration belongs to tenant
      const integration = await integrationService.getById(input.integrationId)
      if (!integration || integration.tenantId !== ctx.tenantContext.tenantId) {
        throw new IntegrationNotFoundError(input.integrationId)
      }
      
      await integrationService.delete(input.integrationId)
      return { success: true }
    }),

  // Test integration connection
  testConnection: tenantProcedure
    .input(testConnectionSchema)
    .use(requirePermission('providers', 'testConnection'))
    .mutation(async ({ input, ctx }) => {
      const integrationService = await container.resolve('IntegrationCrudService')
      
      // Verify integration belongs to tenant
      const integration = await integrationService.getById(input.integrationId)
      if (!integration || integration.tenantId !== ctx.tenantContext.tenantId) {
        throw new IntegrationNotFoundError(input.integrationId)
      }
      
      return await integrationService.testConnection(input.integrationId)
    }),

  // Get OAuth authorization URL for provider setup
  getAuthUrl: tenantProcedure
    .input(z.object({ 
      provider: z.string(),
      redirectUri: z.string().url(),
    }))
    .use(requirePermission('providers', 'create'))
    .query(async ({ input, ctx }) => {
      const oauthService = await container.resolve('OAuthService')
      
      return await oauthService.getAuthUrl(
        input.provider,
        input.redirectUri,
        ctx.tenantContext.tenantId
      )
    }),

  // Complete OAuth authorization
  completeAuth: tenantProcedure
    .input(z.object({
      provider: z.string(),
      code: z.string(),
      state: z.string(),
    }))
    .use(requirePermission('providers', 'create'))
    .mutation(async ({ input, ctx: _ctx }) => {
      const integrationService = await container.resolve('IntegrationCrudService')
      
      return await integrationService.completeOAuthSetup({
        integrationId: 'temp-id', // This should be generated properly
        code: input.code,
        state: input.state
      })
    }),

  // Get integration sync logs
  getSyncLogs: tenantProcedure
    .input(z.object({
      integrationId: z.string().uuid(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .use(requirePermission('providers', 'view'))
    .query(async ({ input, ctx }) => {
      const integrationService = await container.resolve('IntegrationCrudService')
      const syncService = await container.resolve('SyncManagementService')
      
      // Verify integration belongs to tenant
      const integration = await integrationService.getById(input.integrationId)
      if (!integration || integration.tenantId !== ctx.tenantContext.tenantId) {
        throw new IntegrationNotFoundError(input.integrationId)
      }
      
      return await syncService.getSyncLogs(input.integrationId, {
        limit: input.limit,
        offset: input.offset
      })
    }),

  // Trigger manual sync
  triggerSync: tenantProcedure
    .input(z.object({
      integrationId: z.string().uuid(),
      syncType: z.enum(['full', 'incremental']).default('incremental'),
    }))
    .use(requirePermission('providers', 'edit'))
    .mutation(async ({ input, ctx }) => {
      const integrationService = await container.resolve('IntegrationCrudService')
      const syncService = await container.resolve('SyncManagementService')
      
      // Verify integration belongs to tenant
      const integration = await integrationService.getById(input.integrationId)
      if (!integration || integration.tenantId !== ctx.tenantContext.tenantId) {
        throw new IntegrationNotFoundError(input.integrationId)
      }
      
      return await syncService.triggerSync(input.integrationId, {
        syncType: input.syncType,
        priority: 5
      })
    }),

  // Get supported providers
  supportedProviders: tenantProcedure
    .query(async ({ ctx: _ctx }) => {
      const providerService = await container.resolve('ProviderService')
      return await providerService.getSupportedProviders()
    }),

  // Get available organisations for a provider after OAuth
  getAvailableOrganisations: tenantProcedure
    .input(z.object({
      provider: z.string(),
      code: z.string(),
      state: z.string(),
    }))
    .use(requirePermission('providers', 'create'))
    .query(async ({ input, ctx }) => {
      const oauthService = await container.resolve('OAuthService')
      
      return await oauthService.getAvailableOrganisations(
        input.provider,
        input.code,
        ctx.tenantContext.tenantId
      )
    }),

  // Complete OAuth with selected organisation
  completeAuthWithOrganisation: tenantProcedure
    .input(z.object({
      provider: z.string(),
      code: z.string(),
      state: z.string(),
      organisationId: z.string(),
      name: z.string().min(1).max(255),
      settings: z.record(z.unknown()).optional(),
      tokens: z.object({
        accessToken: z.string(),
        refreshToken: z.string().optional(),
        expiresAt: z.string(),
        scope: z.array(z.string()),
        tokenType: z.string(),
      }).optional(),
    }))
    .use(requirePermission('providers', 'create'))
    .mutation(async ({ input, ctx }) => {
      const integrationService = await container.resolve('IntegrationCrudService')
      
      return await integrationService.completeAuthWithOrganisation({
        integrationId: 'temp-id', // This should be generated properly
        code: input.code,
        state: input.state,
        tenantId: ctx.tenantContext.tenantId,
        organisationId: input.organisationId
      })
    }),
})
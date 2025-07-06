import { z } from 'zod'
import { router, tenantProcedure } from '../lib/trpc'
import { container, TOKENS } from '../shared/utils/container'
import { requirePermission } from '../middleware/permissions'
import type { IntegrationApplicationService } from '../core/application/integration.application-service'

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
      const integrationAppService = container.resolve(TOKENS.INTEGRATION_APPLICATION_SERVICE) as IntegrationApplicationService
      return await integrationAppService.listIntegrations(ctx.tenantContext.tenantId)
    }),

  // Get integration by ID
  get: tenantProcedure
    .input(z.object({ integrationId: z.string().uuid() }))
    .use(requirePermission('providers', 'view'))
    .query(async ({ input, ctx }) => {
      const integrationAppService = container.resolve(TOKENS.INTEGRATION_APPLICATION_SERVICE) as IntegrationApplicationService
      return await integrationAppService.getIntegration(input.integrationId, ctx.tenantContext.tenantId)
    }),

  // Create new integration
  create: tenantProcedure
    .input(createIntegrationSchema)
    .use(requirePermission('providers', 'create'))
    .mutation(async ({ input, ctx }) => {
      const integrationAppService = container.resolve(TOKENS.INTEGRATION_APPLICATION_SERVICE) as IntegrationApplicationService
      return await integrationAppService.createIntegration({
        provider: input.provider,
        name: input.name,
        integrationType: input.integrationType,
        tenantId: ctx.tenantContext.tenantId,
        ...(input.settings && { settings: input.settings }),
      })
    }),

  // Update integration
  update: tenantProcedure
    .input(updateIntegrationSchema)
    .use(requirePermission('providers', 'edit'))
    .mutation(async ({ input, ctx }) => {
      const integrationAppService = container.resolve(TOKENS.INTEGRATION_APPLICATION_SERVICE) as IntegrationApplicationService
      return await integrationAppService.updateIntegration({
        integrationId: input.integrationId,
        tenantId: ctx.tenantContext.tenantId,
        ...(input.name && { name: input.name }),
        ...(input.settings && { settings: input.settings }),
        ...(input.status && { status: input.status }),
      })
    }),

  // Delete integration
  delete: tenantProcedure
    .input(z.object({ integrationId: z.string().uuid() }))
    .use(requirePermission('providers', 'delete'))
    .mutation(async ({ input, ctx }) => {
      const integrationAppService = container.resolve(TOKENS.INTEGRATION_APPLICATION_SERVICE) as IntegrationApplicationService
      return await integrationAppService.deleteIntegration(input.integrationId, ctx.tenantContext.tenantId)
    }),

  // Test integration connection
  testConnection: tenantProcedure
    .input(testConnectionSchema)
    .use(requirePermission('providers', 'testConnection'))
    .mutation(async ({ input, ctx }) => {
      const integrationAppService = container.resolve(TOKENS.INTEGRATION_APPLICATION_SERVICE) as IntegrationApplicationService
      return await integrationAppService.testConnection({
        integrationId: input.integrationId,
        tenantId: ctx.tenantContext.tenantId,
      })
    }),

  // Get OAuth authorization URL for provider setup
  getAuthUrl: tenantProcedure
    .input(z.object({ 
      provider: z.string(),
      redirectUri: z.string().url(),
    }))
    .use(requirePermission('providers', 'create'))
    .query(async ({ input, ctx }) => {
      const integrationAppService = container.resolve(TOKENS.INTEGRATION_APPLICATION_SERVICE) as IntegrationApplicationService
      return await integrationAppService.getAuthUrl({
        ...input,
        tenantId: ctx.tenantContext.tenantId,
      })
    }),

  // Complete OAuth authorization
  completeAuth: tenantProcedure
    .input(z.object({
      provider: z.string(),
      code: z.string(),
      state: z.string(),
    }))
    .use(requirePermission('providers', 'create'))
    .mutation(async ({ input, ctx }) => {
      const integrationAppService = container.resolve(TOKENS.INTEGRATION_APPLICATION_SERVICE) as IntegrationApplicationService
      return await integrationAppService.completeAuth({
        ...input,
        tenantId: ctx.tenantContext.tenantId,
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
      const integrationAppService = container.resolve(TOKENS.INTEGRATION_APPLICATION_SERVICE) as IntegrationApplicationService
      return await integrationAppService.getSyncLogs({
        ...input,
        tenantId: ctx.tenantContext.tenantId,
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
      const integrationAppService = container.resolve(TOKENS.INTEGRATION_APPLICATION_SERVICE) as IntegrationApplicationService
      return await integrationAppService.triggerSync({
        ...input,
        tenantId: ctx.tenantContext.tenantId,
      })
    }),

  // Get supported providers
  supportedProviders: tenantProcedure
    .query(async ({ ctx: _ctx }) => {
      const integrationAppService = container.resolve(TOKENS.INTEGRATION_APPLICATION_SERVICE) as IntegrationApplicationService
      return await integrationAppService.getSupportedProviders()
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
      const integrationAppService = container.resolve(TOKENS.INTEGRATION_APPLICATION_SERVICE) as IntegrationApplicationService
      return await integrationAppService.getAvailableOrganisations({
        ...input,
        tenantId: ctx.tenantContext.tenantId,
      })
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
      const integrationAppService = container.resolve(TOKENS.INTEGRATION_APPLICATION_SERVICE) as IntegrationApplicationService
      const command: any = {
        provider: input.provider,
        code: input.code,
        state: input.state,
        organisationId: input.organisationId,
        name: input.name,
        tenantId: ctx.tenantContext.tenantId,
      }
      
      if (input.settings) {
        command.settings = input.settings
      }
      
      if (input.tokens) {
        command.tokens = {
          accessToken: input.tokens.accessToken,
          expiresAt: input.tokens.expiresAt,
          scope: input.tokens.scope,
          tokenType: input.tokens.tokenType,
          ...(input.tokens.refreshToken && { refreshToken: input.tokens.refreshToken }),
        }
      }
      
      return await integrationAppService.completeAuthWithOrganisation(command)
    }),
})
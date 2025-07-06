import { z } from 'zod'
import { router, tenantProcedure } from '../lib/trpc'
import { container, TOKENS } from '../shared/utils/container'
import type { OrchestrationService } from '../services/orchestration.service'
import type { AIDecisionRepository } from '../core/ports/orchestration'
import type {
  OrchestrationRequest
} from '@kibly/shared-types'
import { TRPCError } from '@trpc/server'

export const orchestrationRouter = router({
  // Send a message for AI orchestration (sync response)
  sendMessage: tenantProcedure
    .input(z.object({
      conversationId: z.string().optional(),
      message: z.string().min(1, 'Message cannot be empty'),
      attachments: z.array(z.string()).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const orchestrationService = container.resolve<OrchestrationService>(TOKENS.ORCHESTRATION_SERVICE)
        
        const request: OrchestrationRequest = {
          message: {
            content: input.message,
            mediaUrls: input.attachments || [],
            messageId: `api_${Date.now()}`,
            from: ctx.user!.id
          },
          source: 'api',
          userId: ctx.user!.id,
          tenantId: ctx.tenantContext.tenantId,
          channelId: 'api',
          mode: 'sync'
        }
        
        if (input.conversationId) {
          request.conversationId = input.conversationId
        }
        
        const response = await orchestrationService.processSync(request)
        
        return {
          conversationId: response.conversationId,
          response: response.responseText,
          actions: response.actions,
          metadata: response.metadata
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to process message'
        })
      }
    }),
  
  // Get conversation context
  getContext: tenantProcedure
    .input(z.object({
      conversationId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const orchestrationService = container.resolve<OrchestrationService>(TOKENS.ORCHESTRATION_SERVICE)
        const contextId = await orchestrationService.getOrCreateContext(
          input.conversationId,
          ctx.user!.id,
          'api'
        )
        
        return {
          contextId,
          conversationId: input.conversationId
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get context'
        })
      }
    }),
  
  // Get AI decision history
  getDecisionHistory: tenantProcedure
    .input(z.object({
      conversationId: z.string(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0)
    }))
    .query(async ({ input }) => {
      try {
        const decisionRepository = container.resolve<AIDecisionRepository>(TOKENS.AI_DECISION_REPOSITORY)
        
        const result = await decisionRepository.findByFilters({
          conversationId: input.conversationId
        }, input.limit, input.offset)
        
        return {
          decisions: result.decisions.map(d => d.toPublic()),
          total: result.total
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get decision history'
        })
      }
    }),
  
  // Get AI usage analytics
  getUsageAnalytics: tenantProcedure
    .input(z.object({
      fromDate: z.string().datetime(),
      toDate: z.string().datetime()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const decisionRepository = container.resolve<AIDecisionRepository>(TOKENS.AI_DECISION_REPOSITORY)
        
        const [tokenUsage, intentDistribution] = await Promise.all([
          decisionRepository.getTokenUsageByModel(
            ctx.tenantContext.tenantId,
            new Date(input.fromDate),
            new Date(input.toDate)
          ),
          decisionRepository.getIntentDistribution(
            ctx.tenantContext.tenantId,
            new Date(input.fromDate),
            new Date(input.toDate)
          )
        ])
        
        return {
          tokenUsage,
          intentDistribution
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get usage analytics'
        })
      }
    }),
  
  // Test intent classification (for debugging)
  classifyIntent: tenantProcedure
    .input(z.object({
      message: z.string(),
      includeContext: z.boolean().default(false)
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const orchestrationService = container.resolve<OrchestrationService>(TOKENS.ORCHESTRATION_SERVICE)
        
        // Create a test context
        await orchestrationService.getOrCreateContext(
          `test_${Date.now()}`,
          ctx.user!.id,
          'api'
        )
        
        // Create minimal request for intent classification
        const request: OrchestrationRequest = {
          message: {
            content: input.message,
            mediaUrls: [],
            messageId: `test_${Date.now()}`,
            from: ctx.user!.id
          },
          source: 'api',
          userId: ctx.user!.id,
          tenantId: ctx.tenantContext.tenantId,
          channelId: 'api',
          mode: 'sync'
        }
        
        // Process to get intent
        const response = await orchestrationService.processSync(request)
        
        return {
          intent: response.metadata.intent,
          confidence: response.metadata.confidence,
          response: response.responseText
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to classify intent'
        })
      }
    })
})
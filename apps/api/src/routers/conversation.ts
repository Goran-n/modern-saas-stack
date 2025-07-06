/**
 * Conversation router using the new type system
 * This demonstrates how to use the centralized types, DTOs, and validation
 */

import { router, tenantProcedure } from '../lib/trpc'
import { TRPCError } from '@trpc/server'
import { container, TOKENS } from '../shared/utils/container'
import type { ConversationService } from '../services/conversation.service'
import {
  // Import centralized validation schemas
  schemas,
  paginationSchema,
  // Import mappers
  EntityToDTOMapper,
  // Import enums
  ConversationStatus
} from '@kibly/shared-types'
import type {
  // Import DTOs
  ConversationDTO,
  ConversationMessageDTO,
  PaginatedResponseDTO
} from '@kibly/shared-types'
import { z } from 'zod'

// Extend base schemas for specific endpoints
const listConversationsSchema = paginationSchema.extend({
  status: z.array(z.nativeEnum(ConversationStatus)).optional(),
})

const getConversationSchema = z.object({
  conversationId: schemas.uuid,
})

const sendMessageSchema = schemas.createMessage.pick({
  conversationId: true,
  content: true,
})

const archiveConversationSchema = z.object({
  conversationId: schemas.uuid,
})

export const conversationRouter = router({
  // List user's conversations with proper typing
  list: tenantProcedure
    .input(listConversationsSchema)
    .output(z.custom<PaginatedResponseDTO<ConversationDTO>>())
    .query(async ({ ctx, input }) => {
      const conversationService = container.resolve<ConversationService>(TOKENS.CONVERSATION_SERVICE)
      
      const result = await conversationService.listUserConversations({
        userId: ctx.user!.id,
        limit: input.limit,
        offset: input.offset,
        ...(input.status && { status: input.status }),
      })
      
      // Map entities to DTOs
      const conversations = result.conversations.map(c => 
        EntityToDTOMapper.conversation(c)
      )
      
      return {
        data: conversations,
        pagination: {
          page: Math.floor(input.offset / input.limit) + 1,
          limit: input.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / input.limit),
        },
      }
    }),

  // Get conversation with messages
  get: tenantProcedure
    .input(getConversationSchema)
    .output(z.object({
      conversation: z.custom<ConversationDTO>(),
      messages: z.array(z.custom<ConversationMessageDTO>())
    }))
    .query(async ({ ctx, input }) => {
      const conversationService = container.resolve<ConversationService>(TOKENS.CONVERSATION_SERVICE)
      
      // Verify conversation exists
      
      const conversation = await conversationService.getConversation({
        conversationId: input.conversationId,
        userId: ctx.user!.id,
      })
      
      if (!conversation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Conversation not found',
        })
      }
      
      const messages = await conversationService.getConversationMessages({
        conversationId: input.conversationId,
        userId: ctx.user!.id,
        limit: 50,
        offset: 0,
      })
      
      return {
        conversation: EntityToDTOMapper.conversation(conversation),
        messages: messages.messages.map(m => EntityToDTOMapper.message(m)),
      }
    }),

  // Send message with validated input
  sendMessage: tenantProcedure
    .input(sendMessageSchema)
    .output(z.custom<ConversationMessageDTO>())
    .mutation(async ({ ctx, input }) => {
      const conversationService = container.resolve<ConversationService>(TOKENS.CONVERSATION_SERVICE)
      
      const message = await conversationService.sendMessage({
        conversationId: input.conversationId,
        userId: ctx.user!.id,
        content: input.content!,
      })
      
      return EntityToDTOMapper.message(message)
    }),

  // Archive conversation
  archive: tenantProcedure
    .input(archiveConversationSchema)
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const conversationService = container.resolve<ConversationService>(TOKENS.CONVERSATION_SERVICE)
      
      await conversationService.archiveConversation({
        conversationId: input.conversationId,
        userId: ctx.user!.id,
      })
      
      return { success: true }
    }),

  // Unarchive conversation
  unarchive: tenantProcedure
    .input(z.object({ conversationId: schemas.uuid }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const conversationService = container.resolve<ConversationService>(TOKENS.CONVERSATION_SERVICE)
      
      await conversationService.unarchiveConversation({
        conversationId: input.conversationId,
        userId: ctx.user!.id,
      })
      
      return { success: true }
    }),
})
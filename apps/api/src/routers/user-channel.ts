/**
 * User Channel router using the new type system
 * This demonstrates how to use the centralized types, DTOs, and validation
 */

import { router, tenantProcedure } from '../lib/trpc'
import { TRPCError } from '@trpc/server'
import { container, TOKENS } from '../shared/utils/container'
import type { UserChannelService } from '../services/user-channel.service'
import {
  // Import centralized validation schemas
  schemas,
  // Import mappers
  EntityToDTOMapper,
  // Import enums
  ChannelType,
  ChannelStatus
} from '@kibly/shared-types'
import type {
  // Import DTOs
  UserChannelDTO
} from '@kibly/shared-types'
import { z } from 'zod'

// Extend base schemas for specific endpoints
const registerWhatsAppSchema = z.object({
  phoneNumber: schemas.phoneNumber,
  channelName: z.string().min(1).max(100).optional(),
})

const verifyPhoneSchema = z.object({
  channelId: schemas.uuid,
  verificationCode: schemas.verificationCode,
})

const resendVerificationSchema = z.object({
  channelId: schemas.uuid,
})

const disconnectChannelSchema = z.object({
  channelId: schemas.uuid,
})

const updateChannelSettingsSchema = z.object({
  channelId: schemas.uuid,
  settings: z.object({
    autoDownloadMedia: z.boolean().optional(),
    notificationEnabled: z.boolean().optional(),
    allowedMediaTypes: z.array(z.string()).optional(),
    maxFileSizeMb: z.number().min(1).max(100).optional(),
  }),
})

export const userChannelRouter = router({
  // Register WhatsApp number
  registerWhatsApp: tenantProcedure
    .input(registerWhatsAppSchema)
    .output(z.custom<UserChannelDTO>())
    .mutation(async ({ ctx, input }) => {
      const userChannelService = container.resolve<UserChannelService>(TOKENS.USER_CHANNEL_SERVICE)
      
      const registerData: Parameters<typeof userChannelService.registerWhatsApp>[0] = {
        userId: ctx.user!.id,
        tenantId: ctx.tenantContext.tenantId,
        phoneNumber: input.phoneNumber,
      }
      
      if (input.channelName) {
        registerData.channelName = input.channelName
      }
      
      const channel = await userChannelService.registerWhatsApp(registerData)
      
      return EntityToDTOMapper.userChannel(channel)
    }),
    
  // Verify phone number
  verifyPhone: tenantProcedure
    .input(verifyPhoneSchema)
    .output(z.custom<UserChannelDTO>())
    .mutation(async ({ input }) => {
      const userChannelService = container.resolve<UserChannelService>(TOKENS.USER_CHANNEL_SERVICE)
      
      const channel = await userChannelService.verifyPhone(
        input.channelId,
        input.verificationCode
      )
      
      return EntityToDTOMapper.userChannel(channel)
    }),
    
  // Resend verification code
  resendVerification: tenantProcedure
    .input(resendVerificationSchema)
    .output(z.object({ success: z.boolean(), message: z.string() }))
    .mutation(async ({ input }) => {
      const userChannelService = container.resolve<UserChannelService>(TOKENS.USER_CHANNEL_SERVICE)
      
      await userChannelService.resendVerificationCode(
        input.channelId
      )
      
      return { 
        success: true,
        message: 'Verification code sent successfully' 
      }
    }),

  // List user's channels
  list: tenantProcedure
    .input(z.object({
      status: z.nativeEnum(ChannelStatus).optional(),
      type: z.nativeEnum(ChannelType).optional(),
    }).optional())
    .output(z.array(z.custom<UserChannelDTO>()))
    .query(async ({ ctx, input }) => {
      const userChannelService = container.resolve<UserChannelService>(TOKENS.USER_CHANNEL_SERVICE)
      
      const result = await userChannelService.listUserChannels({
        userId: ctx.user!.id,
        tenantId: ctx.tenantContext.tenantId
      })
      
      let channels = result.channels
      
      // Filter by status if provided
      if (input?.status) {
        channels = channels.filter(c => c.status === input.status)
      }
      
      // Filter by type if provided  
      if (input?.type) {
        channels = channels.filter(c => c.channelType === input.type)
      }
      
      return channels.map(channel => EntityToDTOMapper.userChannel(channel))
    }),

  // Get single channel
  get: tenantProcedure
    .input(z.object({ channelId: schemas.uuid }))
    .output(z.custom<UserChannelDTO>())
    .query(async ({ ctx, input }) => {
      const userChannelService = container.resolve<UserChannelService>(TOKENS.USER_CHANNEL_SERVICE)
      
      const channel = await userChannelService.getChannel({
        channelId: input.channelId,
        userId: ctx.user!.id
      })
      
      if (!channel) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Channel not found',
        })
      }
      
      if (channel.userId !== ctx.user!.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        })
      }
      
      return EntityToDTOMapper.userChannel(channel)
    }),

  // Update channel settings
  updateSettings: tenantProcedure
    .input(updateChannelSettingsSchema)
    .output(z.custom<UserChannelDTO>())
    .mutation(async ({ ctx, input }) => {
      const userChannelService = container.resolve<UserChannelService>(TOKENS.USER_CHANNEL_SERVICE)
      
      // Verify ownership
      const channel = await userChannelService.getChannel({
        channelId: input.channelId,
        userId: ctx.user!.id
      })
      if (!channel || channel.userId !== ctx.user!.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        })
      }
      
      const updatedChannel = await userChannelService.updateChannelSettings(
        input.channelId,
        {
          ...(input.settings.autoDownloadMedia !== undefined && { autoDownloadMedia: input.settings.autoDownloadMedia }),
          ...(input.settings.notificationEnabled !== undefined && { notificationEnabled: input.settings.notificationEnabled }),
          ...(input.settings.allowedMediaTypes !== undefined && { allowedMediaTypes: input.settings.allowedMediaTypes }),
          ...(input.settings.maxFileSizeMb !== undefined && { maxFileSizeMb: input.settings.maxFileSizeMb }),
        }
      )
      
      return EntityToDTOMapper.userChannel(updatedChannel)
    }),

  // Disconnect channel
  disconnect: tenantProcedure
    .input(disconnectChannelSchema)
    .output(z.object({ success: z.boolean(), message: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userChannelService = container.resolve<UserChannelService>(TOKENS.USER_CHANNEL_SERVICE)
      
      await userChannelService.disconnectChannel({
        channelId: input.channelId,
        userId: ctx.user!.id
      })
      
      return { 
        success: true,
        message: 'Channel disconnected successfully'
      }
    }),

  // Get channel statistics
  statistics: tenantProcedure
    .input(z.object({ channelId: schemas.uuid }))
    .output(z.object({
      totalConversations: z.number(),
      activeConversations: z.number(),
      totalMessages: z.number(),
      lastActivityAt: z.date().nullable().optional()
    }))
    .query(async ({ ctx, input }) => {
      const userChannelService = container.resolve<UserChannelService>(TOKENS.USER_CHANNEL_SERVICE)
      
      // Verify ownership
      const channel = await userChannelService.getChannel({
        channelId: input.channelId,
        userId: ctx.user!.id
      })
      if (!channel || channel.userId !== ctx.user!.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        })
      }
      
      const stats = await userChannelService.getChannelStatistics(input.channelId)
      
      return stats
    }),
})
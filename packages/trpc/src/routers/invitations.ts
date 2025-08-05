import { createEmailService } from "@figgy/communication";
import {
  acceptInvitation,
  cancelInvitation,
  getInvitationByToken,
  getInvitations,
  hasPendingInvitation,
  inviteMember,
  memberRoleSchema,
  Permission,
  setDb,
} from "@figgy/tenant";
import { createLogger } from "@figgy/utils";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../trpc";
import type { TenantContext } from "../trpc/context";
import { publicProcedure, tenantProcedure } from "../trpc/procedures";
import { requirePermission } from "../trpc/middleware/permissions";
import { tenantRateLimit } from "../trpc/middleware/rate-limit";
import { ErrorCode, createErrorResponse } from "../errors/codes";

const logger = createLogger("invitations-router");

export const invitationsRouter = createTRPCRouter({
  /**
   * Send an invitation to a new team member
   * Requires MEMBER_INVITE permission
   * Rate limited to 10 invitations per hour per tenant
   */
  send: tenantProcedure
    .use(requirePermission({ 
      permission: Permission.MEMBER_INVITE,
      errorMessage: "You don't have permission to invite members"
    }))
    .use(tenantRateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // 10 invitations per hour
      message: "Too many invitations sent. Please wait before sending more."
    }))
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
        role: memberRoleSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { tenantId, user, db } = ctx as TenantContext;
      
      logger.info("Sending invitation", {
        tenantId,
        email: input.email,
        role: input.role,
        invitedBy: user.id,
        requestId: ctx.requestId,
      });
      
      try {
        // Set the database instance for the tenant package
        setDb(db);
        
        // Check if invitation already exists
        const hasPending = await hasPendingInvitation(tenantId, input.email);
        if (hasPending) {
          const error = createErrorResponse(ErrorCode.INVITATION_ALREADY_SENT);
          throw new TRPCError({
            code: "CONFLICT",
            message: error.message,
            cause: error,
          });
        }
        
        // Create email service
        const emailService = createEmailService();
        
        // Send invitation
        const invitation = await inviteMember(
          {
            tenantId,
            email: input.email,
            name: input.email.split('@')[0] || 'User', // Default name from email
            role: input.role,
            invitedBy: user.id,
          },
          emailService
        );
        
        logger.info("Invitation sent successfully", {
          invitationId: invitation.id,
          requestId: ctx.requestId,
        });
        
        return invitation;
      } catch (error) {
        logger.error("Failed to send invitation", {
          error,
          tenantId,
          email: input.email,
          requestId: ctx.requestId,
        });
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send invitation",
          cause: error,
        });
      }
    }),

  /**
   * List pending invitations for the tenant
   * Requires MEMBER_VIEW permission
   */
  list: tenantProcedure
    .use(requirePermission({ 
      permission: Permission.MEMBER_VIEW,
      errorMessage: "You don't have permission to view invitations"
    }))
    .query(async ({ ctx }) => {
      const { tenantId, user, db } = ctx as TenantContext;
      
      logger.info("Listing invitations", {
        tenantId,
        userId: user.id,
        requestId: ctx.requestId,
      });
      
      try {
        setDb(db);
      
      const invitations = await getInvitations(tenantId, db);
      
      return invitations;
    } catch (error) {
      logger.error("Failed to list invitations", {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error,
        tenantId,
        requestId: ctx.requestId,
      });
      
      if (error instanceof TRPCError) {
        throw error;
      }
      
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to list invitations: ${error instanceof Error ? error.message : 'Unknown error'}`,
        cause: error,
      });
    }
  }),

  /**
   * Cancel a pending invitation
   * Requires MEMBER_INVITE permission
   */
  cancel: tenantProcedure
    .use(requirePermission({ 
      permission: Permission.MEMBER_INVITE,
      errorMessage: "You don't have permission to cancel invitations"
    }))
    .input(
      z.object({
        invitationId: z.string().uuid("Invalid invitation ID"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { tenantId, user, db } = ctx as TenantContext;
      
      logger.info("Cancelling invitation", {
        tenantId,
        invitationId: input.invitationId,
        userId: user.id,
        requestId: ctx.requestId,
      });
      
      try {
        setDb(db);
        
        await cancelInvitation(tenantId, input.invitationId);
        
        logger.info("Invitation cancelled successfully", {
          invitationId: input.invitationId,
          requestId: ctx.requestId,
        });
        
        return { success: true };
      } catch (error) {
        logger.error("Failed to cancel invitation", {
          error,
          invitationId: input.invitationId,
          requestId: ctx.requestId,
        });
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to cancel invitation",
          cause: error,
        });
      }
    }),

  /**
   * Resend an invitation email
   * Requires MEMBER_INVITE permission
   * Rate limited to 3 resends per invitation per hour
   */
  resend: tenantProcedure
    .use(requirePermission({ 
      permission: Permission.MEMBER_INVITE,
      errorMessage: "You don't have permission to resend invitations"
    }))
    .use(tenantRateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // 3 resends per hour per tenant
      message: "Too many resend attempts. Please wait before trying again."
    }))
    .input(
      z.object({
        invitationId: z.string().uuid("Invalid invitation ID"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { tenantId, user, db } = ctx as TenantContext;
      
      logger.info("Resending invitation", {
        tenantId,
        invitationId: input.invitationId,
        userId: user.id,
        requestId: ctx.requestId,
      });
      
      try {
        setDb(db);
        
        // Get existing invitation
        const invitations = await getInvitations(tenantId, db);
        const invitation = invitations.find(inv => inv.id === input.invitationId);
        
        if (!invitation) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invitation not found",
          });
        }
        
        // Resend email
        const emailService = createEmailService();
        const config = await import("@figgy/config").then(m => m.getConfig().get());
        const invitationBaseUrl = config.INVITATION_BASE_URL || config.BASE_URL;
        
        await emailService.sendInvitation({
          to: invitation.email,
          inviterName: invitation.inviterName || "Team Member",
          tenantName: invitation.tenantName || "Your Team",
          invitationLink: `${invitationBaseUrl}/auth/accept-invite?token=${invitation.token}`,
          expiresAt: invitation.expiresAt,
        });
        
        logger.info("Invitation resent successfully", {
          invitationId: input.invitationId,
          requestId: ctx.requestId,
        });
        
        return { success: true };
      } catch (error) {
        logger.error("Failed to resend invitation", {
          error,
          invitationId: input.invitationId,
          requestId: ctx.requestId,
        });
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to resend invitation",
          cause: error,
        });
      }
    }),

  /**
   * Get invitation details by token (public endpoint)
   */
  getByToken: publicProcedure
    .input(
      z.object({
        token: z.string().min(1, "Token is required"),
      })
    )
    .query(async ({ ctx, input }) => {
      logger.info("Getting invitation by token", {
        requestId: ctx.requestId,
      });
      
      try {
        setDb(ctx.db);
        
        const invitation = await getInvitationByToken(input.token);
        
        if (!invitation) {
          const error = createErrorResponse(ErrorCode.INVITATION_NOT_FOUND);
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
            cause: error,
          });
        }
        
        // Check if invitation is still valid
        if (invitation.expiresAt < new Date()) {
          const error = createErrorResponse(ErrorCode.INVITATION_EXPIRED);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
            cause: error,
          });
        }
        
        if (invitation.acceptedAt) {
          const error = createErrorResponse(ErrorCode.INVITATION_ALREADY_ACCEPTED);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
            cause: error,
          });
        }
        
        return {
          email: invitation.email,
          tenantName: invitation.tenantName,
          inviterName: invitation.inviterName,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
        };
      } catch (error) {
        logger.error("Failed to get invitation by token", {
          error,
          requestId: ctx.requestId,
        });
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get invitation details",
          cause: error,
        });
      }
    }),

  /**
   * Accept an invitation (requires authentication)
   */
  accept: publicProcedure
    .input(
      z.object({
        token: z.string().min(1, "Token is required"),
        name: z.string().min(1, "Name is required").optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user, db } = ctx;
      
      logger.info("Accepting invitation", {
        hasUser: !!user,
        requestId: ctx.requestId,
      });
      
      if (!user) {
        const error = createErrorResponse(ErrorCode.UNAUTHORIZED, "Please sign in to accept the invitation");
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: error.message,
          cause: error,
        });
      }
      
      try {
        setDb(db);
        
        // Get invitation details first
        const invitation = await getInvitationByToken(input.token);
        
        if (!invitation) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invalid invitation",
          });
        }
        
        // Verify email matches
        if (user.email !== invitation.email) {
          const error = createErrorResponse(ErrorCode.INVITATION_EMAIL_MISMATCH);
          throw new TRPCError({
            code: "FORBIDDEN",
            message: error.message,
            cause: error,
          });
        }
        
        // Accept the invitation
        const member = await acceptInvitation(input.token, {
          id: user.id,
          email: user.email!,
          name: input.name || user.user_metadata?.name || user.email!.split("@")[0],
          metadata: {},
        });
        
        logger.info("Invitation accepted successfully", {
          memberId: member.id,
          tenantId: member.tenantId,
          requestId: ctx.requestId,
        });
        
        return {
          success: true,
          tenantId: member.tenantId,
        };
      } catch (error) {
        logger.error("Failed to accept invitation", {
          error,
          requestId: ctx.requestId,
        });
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        if (error instanceof Error) {
          // Handle specific error cases
          if (error.message.includes("already a member")) {
            throw new TRPCError({
              code: "CONFLICT",
              message: error.message,
            });
          }
          
          if (error.message.includes("expired")) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: error.message,
            });
          }
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to accept invitation",
          cause: error,
        });
      }
    }),
});
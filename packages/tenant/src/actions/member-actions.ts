import { getConfig } from "@figgy/config";
import type { EmailService } from "@figgy/communication";
import {
  and,
  eq,
  invitations,
  isNull,
  tenantMembers,
  tenants,
  users,
} from "@figgy/shared-db";
import { createLogger } from "@figgy/utils/logger";
import { addDays } from "date-fns";
import { nanoid } from "nanoid";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db";
import type {
  CreateUserInput,
  Invitation,
  InviteMemberInput,
  TenantMember,
  UpdateMemberRoleInput,
  User,
} from "../types";
import {
  createUserSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
} from "../types";

const logger = createLogger("member-actions");

export async function inviteMember(
  input: InviteMemberInput,
  emailService?: EmailService,
): Promise<Invitation> {
  const validated = inviteMemberSchema.parse(input);

  logger.info("Inviting member", {
    tenantId: validated.tenantId,
    email: validated.email,
    role: validated.role,
  });

  const db = getDb();

  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, validated.email))
    .limit(1);

  if (existingUser) {
    const [existingMember] = await db
      .select()
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.tenantId, validated.tenantId),
          eq(tenantMembers.userId, existingUser.id),
        ),
      )
      .limit(1);

    if (existingMember) {
      throw new Error("User is already a member of this tenant");
    }
  }

  const [invitation] = await db
    .insert(invitations)
    .values({
      id: uuidv4(),
      tenantId: validated.tenantId,
      email: validated.email,
      role: validated.role,
      invitedBy: validated.invitedBy,
      token: nanoid(32),
      expiresAt: addDays(new Date(), 7),
      acceptedAt: null,
      createdAt: new Date(),
    })
    .returning();

  if (!invitation) {
    throw new Error("Failed to create invitation");
  }

  logger.info("Invitation created", { invitationId: invitation.id });

  // Send invitation email if email service is provided
  if (emailService) {
    try {
      // Get tenant details for the email
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, validated.tenantId))
        .limit(1);

      // Get inviter details
      const [inviter] = await db
        .select()
        .from(users)
        .where(eq(users.id, validated.invitedBy))
        .limit(1);

      if (tenant && inviter) {
        const config = getConfig().get();
        const invitationBaseUrl = config.INVITATION_BASE_URL || config.BASE_URL;
        
        await emailService.sendInvitation({
          to: validated.email,
          inviterName: inviter.name,
          tenantName: tenant.name,
          invitationLink: `${invitationBaseUrl}/auth/accept-invite?token=${invitation.token}`,
          expiresAt: invitation.expiresAt,
        });
        
        logger.info("Invitation email sent", {
          invitationId: invitation.id,
          email: validated.email,
        });
      }
    } catch (error) {
      // Log error but don't fail the invitation
      logger.error("Failed to send invitation email", {
        error,
        invitationId: invitation.id,
      });
    }
  }

  return invitation;
}

export async function acceptInvitation(
  token: string,
  userData: CreateUserInput,
): Promise<TenantMember> {
  const validated = createUserSchema.parse(userData);

  logger.info("Accepting invitation", { token });

  const db = getDb();

  const [invitation] = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.token, token), isNull(invitations.acceptedAt)))
    .limit(1);

  if (!invitation || invitation.expiresAt < new Date()) {
    throw new Error("Invalid or expired invitation");
  }

  let user: User;
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, invitation.email))
    .limit(1);

  if (existingUser) {
    user = existingUser as User;
  } else {
    const [newUser] = await db
      .insert(users)
      .values({
        id: validated.id,
        email: invitation.email,
        name: validated.name,
        emailVerified: true,
        phoneVerified: false,
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    user = newUser as User;
  }

  const [member] = await db
    .insert(tenantMembers)
    .values({
      id: uuidv4(),
      tenantId: invitation.tenantId,
      userId: user.id,
      role: invitation.role,
      invitedBy: invitation.invitedBy,
      joinedAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  if (!member) {
    throw new Error("Failed to create tenant member");
  }

  await db
    .update(invitations)
    .set({ acceptedAt: new Date() })
    .where(eq(invitations.id, invitation.id));

  logger.info("Invitation accepted", {
    memberId: member.id,
    tenantId: member.tenantId,
    userId: user.id,
  });

  return member;
}

export async function updateMemberRole(
  input: UpdateMemberRoleInput,
): Promise<TenantMember> {
  const validated = updateMemberRoleSchema.parse(input);

  logger.info("Updating member role", {
    memberId: validated.memberId,
    newRole: validated.role,
  });

  const db = getDb();

  if (validated.role !== "owner") {
    const owners = await db
      .select()
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.tenantId, validated.tenantId),
          eq(tenantMembers.role, "owner"),
        ),
      );

    if (owners.length === 1 && owners[0]?.id === validated.memberId) {
      throw new Error("Cannot remove the last owner");
    }
  }

  const [updated] = await db
    .update(tenantMembers)
    .set({
      role: validated.role,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(tenantMembers.id, validated.memberId),
        eq(tenantMembers.tenantId, validated.tenantId),
      ),
    )
    .returning();

  if (!updated) {
    throw new Error("Member not found");
  }

  logger.info("Member role updated", { memberId: updated.id });
  return updated;
}

export async function removeMember(
  tenantId: string,
  memberId: string,
): Promise<void> {
  logger.info("Removing member", { tenantId, memberId });

  const db = getDb();

  const [member] = await db
    .select()
    .from(tenantMembers)
    .where(eq(tenantMembers.id, memberId))
    .limit(1);

  if (member && member.role === "owner") {
    const owners = await db
      .select()
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.tenantId, tenantId),
          eq(tenantMembers.role, "owner"),
        ),
      );

    if (owners.length === 1) {
      throw new Error("Cannot remove the last owner");
    }
  }

  await db
    .delete(tenantMembers)
    .where(
      and(eq(tenantMembers.id, memberId), eq(tenantMembers.tenantId, tenantId)),
    );

  logger.info("Member removed", { memberId });
}

import { createLogger } from '@kibly/utils/logger'
import { getDb } from '../db'
import { 
  users, 
  tenantMembers,
  invitations 
} from '@kibly/shared-db/schemas/tenants'
import { eq, and, isNull } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { v4 as uuidv4 } from 'uuid'
import { addDays } from 'date-fns'
import type {
  InviteMemberInput,
  UpdateMemberRoleInput,
  CreateUserInput,
  User,
  TenantMember,
  Invitation
} from '../types'
import { 
  inviteMemberSchema, 
  updateMemberRoleSchema, 
  createUserSchema 
} from '../types'

const logger = createLogger('member-actions')

export async function inviteMember(input: InviteMemberInput): Promise<Invitation> {
  const validated = inviteMemberSchema.parse(input)
  
  logger.info('Inviting member', { 
    tenantId: validated.tenantId, 
    email: validated.email,
    role: validated.role 
  })

  const db = getDb()

  const [existingUser] = await db.select()
    .from(users)
    .where(eq(users.email, validated.email))
    .limit(1)

  if (existingUser) {
    const [existingMember] = await db.select()
      .from(tenantMembers)
      .where(and(
        eq(tenantMembers.tenantId, validated.tenantId),
        eq(tenantMembers.userId, existingUser.id)
      ))
      .limit(1)

    if (existingMember) {
      throw new Error('User is already a member of this tenant')
    }
  }

  const [invitation] = await db.insert(invitations).values({
    id: uuidv4(),
    tenantId: validated.tenantId,
    email: validated.email,
    role: validated.role,
    invitedBy: validated.invitedBy,
    token: nanoid(32),
    expiresAt: addDays(new Date(), 7),
    acceptedAt: null,
    createdAt: new Date()
  }).returning()

  logger.info('Invitation created', { invitationId: invitation.id })

  return invitation
}

export async function acceptInvitation(token: string, userData: CreateUserInput): Promise<TenantMember> {
  const validated = createUserSchema.parse(userData)
  
  logger.info('Accepting invitation', { token })

  const db = getDb()

  const [invitation] = await db.select()
    .from(invitations)
    .where(and(
      eq(invitations.token, token),
      isNull(invitations.acceptedAt)
    ))
    .limit(1)

  if (!invitation || invitation.expiresAt < new Date()) {
    throw new Error('Invalid or expired invitation')
  }

  let user: User
  const [existingUser] = await db.select()
    .from(users)
    .where(eq(users.email, invitation.email))
    .limit(1)

  if (existingUser) {
    user = existingUser as User
  } else {
    const [newUser] = await db.insert(users).values({
      id: validated.id,
      email: invitation.email,
      name: validated.name,
      emailVerified: true,
      phoneVerified: false,
      preferences: {},
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning()
    user = newUser as User
  }

  const [member] = await db.insert(tenantMembers).values({
    id: uuidv4(),
    tenantId: invitation.tenantId,
    userId: user.id,
    role: invitation.role,
    invitedBy: invitation.invitedBy,
    joinedAt: new Date(),
    updatedAt: new Date()
  }).returning()

  await db.update(invitations)
    .set({ acceptedAt: new Date() })
    .where(eq(invitations.id, invitation.id))

  logger.info('Invitation accepted', { 
    memberId: member.id,
    tenantId: member.tenantId,
    userId: user.id 
  })

  return member
}

export async function updateMemberRole(input: UpdateMemberRoleInput): Promise<TenantMember> {
  const validated = updateMemberRoleSchema.parse(input)
  
  logger.info('Updating member role', { 
    memberId: validated.memberId,
    newRole: validated.role 
  })

  const db = getDb()

  if (validated.role !== 'owner') {
    const owners = await db.select()
      .from(tenantMembers)
      .where(and(
        eq(tenantMembers.tenantId, validated.tenantId),
        eq(tenantMembers.role, 'owner')
      ))

    if (owners.length === 1 && owners[0].id === validated.memberId) {
      throw new Error('Cannot remove the last owner')
    }
  }

  const [updated] = await db.update(tenantMembers)
    .set({
      role: validated.role,
      updatedAt: new Date()
    })
    .where(and(
      eq(tenantMembers.id, validated.memberId),
      eq(tenantMembers.tenantId, validated.tenantId)
    ))
    .returning()

  if (!updated) {
    throw new Error('Member not found')
  }

  logger.info('Member role updated', { memberId: updated.id })
  return updated
}

export async function removeMember(tenantId: string, memberId: string): Promise<void> {
  logger.info('Removing member', { tenantId, memberId })

  const db = getDb()

  const [member] = await db.select()
    .from(tenantMembers)
    .where(eq(tenantMembers.id, memberId))
    .limit(1)

  if (member && member.role === 'owner') {
    const owners = await db.select()
      .from(tenantMembers)
      .where(and(
        eq(tenantMembers.tenantId, tenantId),
        eq(tenantMembers.role, 'owner')
      ))

    if (owners.length === 1) {
      throw new Error('Cannot remove the last owner')
    }
  }

  await db.delete(tenantMembers)
    .where(and(
      eq(tenantMembers.id, memberId),
      eq(tenantMembers.tenantId, tenantId)
    ))

  logger.info('Member removed', { memberId })
}
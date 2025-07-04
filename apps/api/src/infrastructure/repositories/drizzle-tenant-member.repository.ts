import { eq, desc, count, and, lt } from 'drizzle-orm'
import { TenantMemberEntity, type Role } from '../../core/domain/tenant/index'
import type { TenantMemberRepository } from '../../core/ports/tenant-member.repository'
import { tenantMembers, type TenantMember, type NewTenantMember } from '../../database/schema/tenant-members'
import { BaseRepository, type Database } from '../database/types'

export class DrizzleTenantMemberRepository extends BaseRepository implements TenantMemberRepository {
  constructor(database: Database) {
    super(database)
  }

  async save(member: TenantMemberEntity): Promise<TenantMemberEntity> {
    const data = member.toDatabase()
    
    const dbData: NewTenantMember = {
      id: data.id,
      tenantId: data.tenantId,
      userId: data.userId,
      role: data.role,
      permissions: data.permissions,
      status: data.status,
      invitationToken: data.invitationToken,
      invitationExpiresAt: data.invitationExpiresAt || undefined,
      joinedAt: data.joinedAt || undefined,
      lastAccessAt: data.lastAccessAt || undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    }

    const [result] = await (this.db as any)
      .insert(tenantMembers)
      .values(dbData)
      .onConflictDoUpdate({
        target: tenantMembers.id,
        set: {
          ...dbData,
          updatedAt: new Date(),
        },
      })
      .returning()

    return this.mapToEntity(result)
  }

  async findById(id: string): Promise<TenantMemberEntity | null> {
    const [result] = await (this.db as any)
      .select()
      .from(tenantMembers)
      .where(eq(tenantMembers.id, id))

    return result ? this.mapToEntity(result) : null
  }

  async findByUserAndTenant(userId: string, tenantId: string): Promise<TenantMemberEntity | null> {
    const [result] = await (this.db as any)
      .select()
      .from(tenantMembers)
      .where(and(
        eq(tenantMembers.tenantId, tenantId),
        eq(tenantMembers.userId, userId)
      ))

    return result ? this.mapToEntity(result) : null
  }

  async findByTenant(tenantId: string): Promise<TenantMemberEntity[]> {
    const results = await (this.db as any)
      .select()
      .from(tenantMembers)
      .where(eq(tenantMembers.tenantId, tenantId))
      .orderBy(desc(tenantMembers.createdAt))

    return results.map((result: any) => this.mapToEntity(result))
  }

  async findByUser(userId: string): Promise<TenantMemberEntity[]> {
    const results = await (this.db as any)
      .select()
      .from(tenantMembers)
      .where(eq(tenantMembers.userId, userId))
      .orderBy(desc(tenantMembers.createdAt))

    return results.map((result: any) => this.mapToEntity(result))
  }

  async findByInvitationToken(token: string): Promise<TenantMemberEntity | null> {
    const [result] = await (this.db as any)
      .select()
      .from(tenantMembers)
      .where(eq(tenantMembers.invitationToken, token))

    return result ? this.mapToEntity(result) : null
  }

  async exists(userId: string, tenantId: string): Promise<boolean> {
    const [result] = await (this.db as any)
      .select({ id: tenantMembers.id })
      .from(tenantMembers)
      .where(and(
        eq(tenantMembers.tenantId, tenantId),
        eq(tenantMembers.userId, userId)
      ))

    return !!result
  }

  async countByTenant(tenantId: string): Promise<number> {
    const [result] = await (this.db as any)
      .select({ count: count() })
      .from(tenantMembers)
      .where(eq(tenantMembers.tenantId, tenantId))

    return result.count
  }

  async countByRole(tenantId: string, role: Role): Promise<number> {
    const [result] = await (this.db as any)
      .select({ count: count() })
      .from(tenantMembers)
      .where(and(
        eq(tenantMembers.tenantId, tenantId),
        eq(tenantMembers.role, role)
      ))

    return result.count
  }

  async findPendingInvitations(tenantId: string): Promise<TenantMemberEntity[]> {
    const results = await (this.db as any)
      .select()
      .from(tenantMembers)
      .where(and(
        eq(tenantMembers.tenantId, tenantId),
        eq(tenantMembers.status, 'pending')
      ))
      .orderBy(desc(tenantMembers.createdAt))

    return results.map((result: any) => this.mapToEntity(result))
  }

  async findExpiredInvitations(): Promise<TenantMemberEntity[]> {
    const results = await (this.db as any)
      .select()
      .from(tenantMembers)
      .where(and(
        eq(tenantMembers.status, 'pending'),
        lt(tenantMembers.invitationExpiresAt, new Date())
      ))
      .orderBy(desc(tenantMembers.createdAt))

    return results.map((result: any) => this.mapToEntity(result))
  }

  async delete(id: string): Promise<void> {
    await (this.db as any)
      .delete(tenantMembers)
      .where(eq(tenantMembers.id, id))
  }

  private mapToEntity(dbMember: TenantMember): TenantMemberEntity {
    return TenantMemberEntity.fromDatabase({
      id: dbMember.id,
      tenantId: dbMember.tenantId,
      userId: dbMember.userId,
      role: dbMember.role,
      permissions: (dbMember.permissions as any) || {},
      status: dbMember.status,
      invitationToken: dbMember.invitationToken || null,
      invitationExpiresAt: dbMember.invitationExpiresAt || null,
      joinedAt: dbMember.joinedAt || null,
      lastAccessAt: dbMember.lastAccessAt || null,
      createdAt: dbMember.createdAt,
      updatedAt: dbMember.updatedAt,
    })
  }
}
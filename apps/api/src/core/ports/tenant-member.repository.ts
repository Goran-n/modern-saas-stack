import type { TenantMemberEntity, Role } from '../domain/tenant'

export interface TenantMemberRepository {
  findById(id: string): Promise<TenantMemberEntity | null>
  findByUserAndTenant(userId: string, tenantId: string): Promise<TenantMemberEntity | null>
  findByTenant(tenantId: string): Promise<TenantMemberEntity[]>
  findByUser(userId: string): Promise<TenantMemberEntity[]>
  findByInvitationToken(token: string): Promise<TenantMemberEntity | null>
  save(member: TenantMemberEntity): Promise<TenantMemberEntity>
  delete(id: string): Promise<void>
  exists(userId: string, tenantId: string): Promise<boolean>
  countByTenant(tenantId: string): Promise<number>
  countByRole(tenantId: string, role: Role): Promise<number>
  findPendingInvitations(tenantId: string): Promise<TenantMemberEntity[]>
  findExpiredInvitations(): Promise<TenantMemberEntity[]>
}
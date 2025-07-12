import type { InviteMemberInput, UpdateMemberRoleInput, CreateUserInput, TenantMember, Invitation } from '../types';
export declare function inviteMember(input: InviteMemberInput): Promise<Invitation>;
export declare function acceptInvitation(token: string, userData: CreateUserInput): Promise<TenantMember>;
export declare function updateMemberRole(input: UpdateMemberRoleInput): Promise<TenantMember>;
export declare function removeMember(tenantId: string, memberId: string): Promise<void>;
//# sourceMappingURL=member-actions.d.ts.map
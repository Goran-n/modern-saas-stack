import type { TenantMember, User } from '../types';
export declare function listMembers(tenantId: string): Promise<(TenantMember & {
    user: User;
})[]>;
//# sourceMappingURL=member-queries.d.ts.map
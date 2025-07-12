import type { Tenant, TenantMember, TenantStatus } from '../types';
export declare function getTenant(tenantId: string): Promise<Tenant | null>;
export declare function listTenants(filters?: {
    status?: TenantStatus;
}): Promise<Tenant[]>;
export declare function getUserTenants(userId: string): Promise<(TenantMember & {
    tenant: Tenant;
})[]>;
//# sourceMappingURL=tenant-queries.d.ts.map
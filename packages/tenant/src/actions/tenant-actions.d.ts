import type { CreateTenantInput, UpdateTenantInput, Tenant, TenantMember } from '../types';
export declare function createTenant(input: CreateTenantInput): Promise<{
    tenant: Tenant;
    member: TenantMember;
}>;
export declare function updateTenant(input: UpdateTenantInput): Promise<Tenant>;
//# sourceMappingURL=tenant-actions.d.ts.map
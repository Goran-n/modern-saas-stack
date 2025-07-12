import { getDb } from '../db';
import { tenants, tenantMembers } from '@kibly/shared-db/schemas/tenants';
import { eq, desc } from 'drizzle-orm';
export async function getTenant(tenantId) {
    const db = getDb();
    const [tenant] = await db.select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);
    return tenant ? {
        ...tenant,
        settings: tenant.settings,
        subscription: tenant.subscription,
        metadata: tenant.metadata
    } : null;
}
export async function listTenants(filters) {
    const db = getDb();
    const results = await db.select()
        .from(tenants)
        .where(filters?.status ? eq(tenants.status, filters.status) : undefined)
        .orderBy(desc(tenants.createdAt));
    return results.map(tenant => ({
        ...tenant,
        settings: tenant.settings,
        subscription: tenant.subscription,
        metadata: tenant.metadata
    }));
}
export async function getUserTenants(userId) {
    const db = getDb();
    const memberships = await db.select({
        member: tenantMembers,
        tenant: tenants
    })
        .from(tenantMembers)
        .innerJoin(tenants, eq(tenantMembers.tenantId, tenants.id))
        .where(eq(tenantMembers.userId, userId))
        .orderBy(desc(tenantMembers.joinedAt));
    return memberships.map(({ member, tenant }) => ({
        ...member,
        tenant: {
            ...tenant,
            settings: tenant.settings,
            subscription: tenant.subscription,
            metadata: tenant.metadata
        }
    }));
}
//# sourceMappingURL=tenant-queries.js.map
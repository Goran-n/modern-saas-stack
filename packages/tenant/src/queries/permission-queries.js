import { getDb } from '../db';
import { tenantMembers } from '@kibly/shared-db/schemas/tenants';
import { eq, and } from 'drizzle-orm';
import { checkPermissionSchema, rolePermissions } from '../types';
export async function checkPermission(input) {
    const validated = checkPermissionSchema.parse(input);
    const db = getDb();
    const [member] = await db.select()
        .from(tenantMembers)
        .where(and(eq(tenantMembers.tenantId, validated.tenantId), eq(tenantMembers.userId, validated.userId)))
        .limit(1);
    if (!member) {
        return false;
    }
    const permissions = rolePermissions[member.role];
    return permissions.includes(validated.permission);
}
export async function getUserPermissions(tenantId, userId) {
    const db = getDb();
    const [member] = await db.select()
        .from(tenantMembers)
        .where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, userId)))
        .limit(1);
    if (!member) {
        return [];
    }
    return rolePermissions[member.role];
}
//# sourceMappingURL=permission-queries.js.map
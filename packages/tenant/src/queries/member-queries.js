import { getDb } from '../db';
import { tenantMembers, users } from '@kibly/shared-db/schemas/tenants';
import { eq, desc } from 'drizzle-orm';
export async function listMembers(tenantId) {
    const db = getDb();
    const members = await db.select({
        member: tenantMembers,
        user: users
    })
        .from(tenantMembers)
        .innerJoin(users, eq(tenantMembers.userId, users.id))
        .where(eq(tenantMembers.tenantId, tenantId))
        .orderBy(desc(tenantMembers.joinedAt));
    return members.map(({ member, user }) => ({
        ...member,
        user: {
            ...user,
            preferences: user.preferences
        }
    }));
}
//# sourceMappingURL=member-queries.js.map
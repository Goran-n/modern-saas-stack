import { getDb } from '../db';
import { users } from '@kibly/shared-db/schemas/tenants';
import { eq } from 'drizzle-orm';
export async function getUser(userId) {
    const db = getDb();
    const [user] = await db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
    return user ? {
        ...user,
        preferences: user.preferences
    } : null;
}
//# sourceMappingURL=user-queries.js.map
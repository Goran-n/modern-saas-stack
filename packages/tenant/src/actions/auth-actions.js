import { createLogger } from '@kibly/utils/logger';
import { getConfig } from '@kibly/config';
import { getDb } from '../db';
import { users, tenantMembers } from '@kibly/shared-db/schemas/tenants';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { authTokenSchema } from '../types';
const logger = createLogger('auth-actions');
export async function generateTenantToken(userId, tenantId) {
    logger.info('Generating tenant token', { userId, tenantId });
    const db = getDb();
    const config = getConfig().getForTenant();
    const memberships = await db.select()
        .from(tenantMembers)
        .where(eq(tenantMembers.userId, userId));
    if (memberships.length === 0) {
        throw new Error('User has no tenant memberships');
    }
    const targetTenantId = tenantId || memberships[0].tenantId;
    const membership = memberships.find(m => m.tenantId === targetTenantId);
    if (!membership) {
        throw new Error('User is not a member of the specified tenant');
    }
    const tokenPayload = {
        userId,
        tenantId: membership.tenantId,
        role: membership.role
    };
    const token = jwt.sign(tokenPayload, config.JWT_SECRET, { expiresIn: '7d' });
    logger.info('Tenant token generated', { userId, tenantId: membership.tenantId });
    return token;
}
export async function verifyToken(token) {
    const config = getConfig().getForTenant();
    try {
        const payload = jwt.verify(token, config.JWT_SECRET);
        return authTokenSchema.parse(payload);
    }
    catch (error) {
        throw new Error('Invalid token');
    }
}
export async function updateUser(userId, updates) {
    const db = getDb();
    const [updated] = await db.update(users)
        .set({
        ...updates,
        updatedAt: new Date()
    })
        .where(eq(users.id, userId))
        .returning();
    if (!updated) {
        throw new Error('User not found');
    }
    return updated;
}
//# sourceMappingURL=auth-actions.js.map
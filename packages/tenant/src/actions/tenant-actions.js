import { createLogger } from '@kibly/utils/logger';
import { getDb } from '../db';
import { tenants, tenantMembers } from '@kibly/shared-db/schemas/tenants';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { createTenantSchema, updateTenantSchema } from '../types';
const logger = createLogger('tenant-actions');
export async function createTenant(input) {
    const validated = createTenantSchema.parse(input);
    logger.info('Creating new tenant', { name: validated.name, ownerId: validated.ownerId });
    const db = getDb();
    const result = await db.transaction(async (tx) => {
        const [tenant] = await tx.insert(tenants).values({
            name: validated.name,
            slug: validated.slug,
            email: validated.email,
            status: 'active',
            settings: validated.settings || {},
            subscription: validated.subscription || {},
            metadata: validated.metadata || {},
            createdAt: new Date(),
            updatedAt: new Date()
        }).returning();
        const [member] = await tx.insert(tenantMembers).values({
            id: uuidv4(),
            tenantId: tenant.id,
            userId: validated.ownerId,
            role: 'owner',
            invitedBy: null,
            joinedAt: new Date(),
            updatedAt: new Date()
        }).returning();
        logger.info('Tenant created successfully', {
            tenantId: tenant.id,
            userId: validated.ownerId,
            role: 'owner'
        });
        return { tenant, member };
    });
    return {
        ...result,
        tenant: {
            ...result.tenant,
            settings: result.tenant.settings,
            subscription: result.tenant.subscription,
            metadata: result.tenant.metadata
        }
    };
}
export async function updateTenant(input) {
    const validated = updateTenantSchema.parse(input);
    logger.info('Updating tenant', { tenantId: validated.tenantId });
    const db = getDb();
    const updates = {
        updatedAt: new Date()
    };
    if (validated.name !== undefined)
        updates.name = validated.name;
    if (validated.status !== undefined)
        updates.status = validated.status;
    if (validated.settings !== undefined)
        updates.settings = validated.settings;
    if (validated.subscription !== undefined)
        updates.subscription = validated.subscription;
    if (validated.metadata !== undefined)
        updates.metadata = validated.metadata;
    const [updated] = await db.update(tenants)
        .set(updates)
        .where(eq(tenants.id, validated.tenantId))
        .returning();
    if (!updated) {
        throw new Error('Tenant not found');
    }
    logger.info('Tenant updated', { tenantId: updated.id });
    return {
        ...updated,
        settings: updated.settings,
        subscription: updated.subscription,
        metadata: updated.metadata
    };
}
//# sourceMappingURL=tenant-actions.js.map
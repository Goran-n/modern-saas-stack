import { tenantMembers, tenants } from "@kibly/shared-db";
import { logger } from "@kibly/utils";
import { desc, eq } from "@kibly/shared-db";
import { getDb } from "../db";
import type { Tenant, TenantMember, TenantStatus } from "../types";

export async function getTenant(tenantId: string): Promise<Tenant | null> {
  const db = getDb();

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  return tenant
    ? ({
        ...tenant,
        settings: tenant.settings as Record<string, any>,
        subscription: tenant.subscription as Record<string, any>,
        metadata: tenant.metadata as Record<string, any>,
      } as Tenant)
    : null;
}

export async function listTenants(filters?: {
  status?: TenantStatus;
}): Promise<Tenant[]> {
  const db = getDb();

  const results = await db
    .select()
    .from(tenants)
    .where(filters?.status ? eq(tenants.status, filters.status) : undefined)
    .orderBy(desc(tenants.createdAt));

  return results.map(
    (tenant) =>
      ({
        ...tenant,
        settings: tenant.settings as Record<string, any>,
        subscription: tenant.subscription as Record<string, any>,
        metadata: tenant.metadata as Record<string, any>,
      }) as Tenant,
  );
}

export async function getUserTenants(
  userId: string,
): Promise<(TenantMember & { tenant: Tenant })[]> {
  const db = getDb();
  const startTime = Date.now();

  try {
    const memberships = await db
      .select({
        member: tenantMembers,
        tenant: tenants,
      })
      .from(tenantMembers)
      .innerJoin(tenants, eq(tenantMembers.tenantId, tenants.id))
      .where(eq(tenantMembers.userId, userId))
      .orderBy(desc(tenantMembers.joinedAt));

    const duration = Date.now() - startTime;

    if (memberships.length === 0) {
      logger.debug("No tenants found for user", { userId, duration });
    } else {
      logger.debug("getUserTenants query successful", {
        userId,
        tenantCount: memberships.length,
        duration,
      });
    }

    return memberships.map(({ member, tenant }) => ({
      ...member,
      tenant: {
        ...tenant,
        settings: tenant.settings as Record<string, any>,
        subscription: tenant.subscription as Record<string, any>,
        metadata: tenant.metadata as Record<string, any>,
      } as Tenant,
    }));
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error("getUserTenants query failed", {
      userId,
      duration,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}

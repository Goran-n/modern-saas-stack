import { tenantMembers, tenants } from "@kibly/shared-db";
import { createLogger } from "@kibly/utils/logger";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db";
import type {
  CreateTenantInput,
  Tenant,
  TenantMember,
  UpdateTenantInput,
} from "../types";
import { createTenantSchema, updateTenantSchema } from "../types";

const logger = createLogger("tenant-actions");

export async function createTenant(
  input: CreateTenantInput,
): Promise<{ tenant: Tenant; member: TenantMember }> {
  const validated = createTenantSchema.parse(input);

  logger.info("Creating new tenant", {
    name: validated.name,
    ownerId: validated.ownerId,
  });

  const db = getDb();

  const result = await db.transaction(async (tx) => {
    const [tenant] = await tx
      .insert(tenants)
      .values({
        name: validated.name,
        slug: validated.slug,
        email: validated.email,
        status: "active",
        settings: validated.settings || {},
        subscription: validated.subscription || {},
        metadata: validated.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    if (!tenant) {
      throw new Error("Failed to create tenant");
    }

    const [member] = await tx
      .insert(tenantMembers)
      .values({
        id: uuidv4(),
        tenantId: tenant.id,
        userId: validated.ownerId,
        role: "owner",
        invitedBy: null,
        joinedAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    if (!member) {
      throw new Error("Failed to create tenant member");
    }

    logger.info("Tenant created successfully", {
      tenantId: tenant.id,
      userId: validated.ownerId,
      role: "owner",
    });

    return { tenant, member };
  });

  return {
    ...result,
    tenant: {
      ...result.tenant,
      settings: result.tenant.settings as Record<string, any>,
      subscription: result.tenant.subscription as Record<string, any>,
      metadata: result.tenant.metadata as Record<string, any>,
    } as Tenant,
  };
}

export async function updateTenant(input: UpdateTenantInput): Promise<Tenant> {
  const validated = updateTenantSchema.parse(input);

  logger.info("Updating tenant", { tenantId: validated.tenantId });

  const db = getDb();

  const updates: any = {
    updatedAt: new Date(),
  };

  if (validated.name !== undefined) updates.name = validated.name;
  if (validated.status !== undefined) updates.status = validated.status;
  if (validated.settings !== undefined) updates.settings = validated.settings;
  if (validated.subscription !== undefined)
    updates.subscription = validated.subscription;
  if (validated.metadata !== undefined) updates.metadata = validated.metadata;

  const [updated] = await db
    .update(tenants)
    .set(updates)
    .where(eq(tenants.id, validated.tenantId))
    .returning();

  if (!updated) {
    throw new Error("Tenant not found");
  }

  logger.info("Tenant updated", { tenantId: updated.id });

  return {
    ...updated,
    settings: updated.settings as Record<string, any>,
    subscription: updated.subscription as Record<string, any>,
    metadata: updated.metadata as Record<string, any>,
  } as Tenant;
}

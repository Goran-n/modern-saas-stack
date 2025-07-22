import { getConfig } from "@figgy/config";
import { eq, tenantMembers, users } from "@figgy/shared-db";
import { createLogger } from "@figgy/utils/logger";
import jwt from "jsonwebtoken";
import { getDb } from "../db";
import type { AuthToken, TenantMember, User } from "../types";
import { authTokenSchema } from "../types";

const logger = createLogger("auth-actions");

export async function generateTenantToken(
  userId: string,
  tenantId?: string,
): Promise<string> {
  logger.info("Generating tenant token", { userId, tenantId });

  const db = getDb();
  const config = getConfig().getForTenant();

  const memberships = (await db
    .select()
    .from(tenantMembers)
    .where(eq(tenantMembers.userId, userId))) as TenantMember[];

  if (memberships.length === 0) {
    throw new Error("User has no tenant memberships");
  }

  const firstMembership = memberships[0]!; // Safe to use ! here as we checked length above
  const targetTenantId = tenantId || firstMembership.tenantId;
  const membership = memberships.find((m) => m.tenantId === targetTenantId);

  if (!membership) {
    throw new Error("User is not a member of the specified tenant");
  }

  const tokenPayload: AuthToken = {
    userId,
    tenantId: membership.tenantId,
    role: membership.role,
  };

  const token = jwt.sign(tokenPayload, config.JWT_SECRET, { expiresIn: "7d" });

  logger.info("Tenant token generated", {
    userId,
    tenantId: membership.tenantId,
  });

  return token;
}

export async function verifyToken(token: string): Promise<AuthToken> {
  const config = getConfig().getForTenant();

  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as AuthToken;
    return authTokenSchema.parse(payload);
  } catch (error) {
    throw new Error("Invalid token");
  }
}

export async function updateUser(
  userId: string,
  updates: Partial<User>,
): Promise<User> {
  const db = getDb();

  const [updated] = await db
    .update(users)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  if (!updated) {
    throw new Error("User not found");
  }

  return updated as User;
}

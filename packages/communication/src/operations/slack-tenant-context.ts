import {
  and,
  eq,
  slackLinkingTokens,
  slackUserMappings,
  slackWorkspaces,
  sql,
  tenantMembers,
  tenants,
  users,
} from "@figgy/shared-db";
import { createLogger } from "@figgy/utils";
import { randomBytes } from "crypto";
import { getDb } from "../db";

const logger = createLogger("slack-tenant-context");

export interface TenantContext {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  isDefault?: boolean;
}

export interface UserTenantAccess {
  userId: string;
  email: string;
  tenants: TenantContext[];
}

// Simple in-memory cache for user contexts (with TTL)
const contextCache = new Map<
  string,
  { context: TenantContext; expires: number }
>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Get user's current tenant context for a conversation
 */
export async function getUserTenantContext(
  slackUserId: string,
  workspaceId: string,
  conversationId: string,
): Promise<TenantContext | null> {
  const cacheKey = `${workspaceId}:${slackUserId}:${conversationId}`;

  // Check cache
  const cached = contextCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.context;
  }

  const db = getDb();

  // For now, get the user's first available tenant
  // In future, this could be stored in a context table
  const userMapping = await db
    .select({
      tenantId: slackUserMappings.tenantId,
      tenantName: tenants.name,
      tenantSlug: tenants.slug,
    })
    .from(slackUserMappings)
    .innerJoin(tenants, eq(slackUserMappings.tenantId, tenants.id))
    .where(
      and(
        eq(slackUserMappings.slackUserId, slackUserId),
        eq(slackUserMappings.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!userMapping[0]) {
    return null;
  }

  const context: TenantContext = {
    tenantId: userMapping[0].tenantId,
    tenantName: userMapping[0].tenantName,
    tenantSlug:
      userMapping[0].tenantSlug ||
      userMapping[0].tenantName.toLowerCase().replace(/\s+/g, ""),
    isDefault: true,
  };

  // Cache the context
  contextCache.set(cacheKey, {
    context,
    expires: Date.now() + CACHE_TTL,
  });

  return context;
}

/**
 * Set user's tenant context for a conversation
 */
export async function setUserTenantContext(
  slackUserId: string,
  workspaceId: string,
  conversationId: string,
  tenantId: string,
): Promise<boolean> {
  const db = getDb();

  // Verify user has access to this tenant
  const hasAccess = await db
    .select()
    .from(slackUserMappings)
    .where(
      and(
        eq(slackUserMappings.slackUserId, slackUserId),
        eq(slackUserMappings.workspaceId, workspaceId),
        eq(slackUserMappings.tenantId, tenantId),
      ),
    )
    .limit(1);

  if (!hasAccess[0]) {
    return false;
  }

  // Get tenant details
  const tenant = await db
    .select({
      name: tenants.name,
      slug: tenants.slug,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant[0]) {
    return false;
  }

  const context: TenantContext = {
    tenantId,
    tenantName: tenant[0].name,
    tenantSlug:
      tenant[0].slug || tenant[0].name.toLowerCase().replace(/\s+/g, ""),
  };

  // Update cache
  const cacheKey = `${workspaceId}:${slackUserId}:${conversationId}`;
  contextCache.set(cacheKey, {
    context,
    expires: Date.now() + CACHE_TTL,
  });

  logger.info(
    {
      slackUserId,
      workspaceId,
      conversationId,
      tenantId,
    },
    "Set user tenant context",
  );

  return true;
}

/**
 * Get all tenants a Slack user has access to
 */
export async function getUserAvailableTenants(
  slackUserId: string,
  workspaceId: string,
): Promise<TenantContext[]> {
  const db = getDb();

  const userTenants = await db
    .select({
      tenantId: slackUserMappings.tenantId,
      tenantName: tenants.name,
      tenantSlug: tenants.slug,
    })
    .from(slackUserMappings)
    .innerJoin(tenants, eq(slackUserMappings.tenantId, tenants.id))
    .where(
      and(
        eq(slackUserMappings.slackUserId, slackUserId),
        eq(slackUserMappings.workspaceId, workspaceId),
      ),
    );

  return userTenants.map((t) => ({
    tenantId: t.tenantId,
    tenantName: t.tenantName,
    tenantSlug: t.tenantSlug || t.tenantName.toLowerCase().replace(/\s+/g, ""),
  }));
}

/**
 * Find available tenants for a Slack user by email
 */
export async function findAvailableTenantsForSlackUser(
  slackEmail: string,
  workspaceId: string,
): Promise<UserTenantAccess | null> {
  try {
    const db = getDb();

    logger.info({ slackEmail }, "Finding user by email");

    // Find user by email
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, slackEmail))
      .limit(1);

    if (!user[0]) {
      logger.info({ slackEmail }, "No user found with email");
      return null;
    }

    logger.info({ userId: user[0].id, email: user[0].email }, "Found user");

    // Get all tenants this user belongs to through tenant memberships
    const userTenants = await db
      .select({
        tenantId: tenantMembers.tenantId,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
      })
      .from(tenantMembers)
      .innerJoin(tenants, eq(tenantMembers.tenantId, tenants.id))
      .where(eq(tenantMembers.userId, user[0].id));

    if (userTenants.length === 0) {
      return null;
    }

    // Check which workspace-tenant combinations exist
    const workspaceTenants = await db
      .select({
        tenantId: slackWorkspaces.tenantId,
      })
      .from(slackWorkspaces)
      .where(
        and(
          eq(slackWorkspaces.workspaceId, workspaceId),
          sql`${slackWorkspaces.tenantId} IN ${sql.raw(`(${userTenants.map((t) => `'${t.tenantId}'`).join(",")})`)}`,
        ),
      );

    const workspaceTenantIds = new Set(
      workspaceTenants.map((wt) => wt.tenantId),
    );

    return {
      userId: user[0].id,
      email: slackEmail,
      tenants: userTenants
        .filter((t) => workspaceTenantIds.has(t.tenantId))
        .map((t) => ({
          tenantId: t.tenantId,
          tenantName: t.tenantName,
          tenantSlug:
            t.tenantSlug || t.tenantName.toLowerCase().replace(/\s+/g, ""),
        })),
    };
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        slackEmail,
        workspaceId,
      },
      "Error finding available tenants for Slack user",
    );
    throw error;
  }
}

/**
 * Create user mapping for a specific tenant
 */
export async function createSlackUserTenantMapping(
  slackUserId: string,
  workspaceId: string,
  userId: string,
  tenantId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getDb();

    // Check if mapping already exists
    const existing = await db
      .select()
      .from(slackUserMappings)
      .where(
        and(
          eq(slackUserMappings.slackUserId, slackUserId),
          eq(slackUserMappings.workspaceId, workspaceId),
          eq(slackUserMappings.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (existing[0]) {
      return { success: true };
    }

    // Create new mapping
    await db.insert(slackUserMappings).values({
      slackUserId,
      workspaceId,
      userId,
      tenantId,
    });

    logger.info(
      {
        slackUserId,
        workspaceId,
        userId,
        tenantId,
      },
      "Created Slack user tenant mapping",
    );

    return { success: true };
  } catch (error) {
    logger.error({ error }, "Failed to create user tenant mapping");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Mapping failed",
    };
  }
}

/**
 * Generate a secure linking token for manual account connection
 */
export async function generateLinkingToken(
  slackUserId: string,
  workspaceId: string,
  slackEmail?: string,
): Promise<string> {
  try {
    const db = getDb();

    // Generate a secure random token
    const token = randomBytes(32).toString("hex");

    // Token expires in 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Store the token
    await db.insert(slackLinkingTokens).values({
      token,
      slackUserId,
      workspaceId,
      slackEmail,
      expiresAt,
    });

    logger.info(
      {
        slackUserId,
        workspaceId,
        hasEmail: !!slackEmail,
        expiresAt,
      },
      "Generated Slack linking token",
    );

    return token;
  } catch (error) {
    logger.error({ error }, "Failed to generate linking token");
    throw error;
  }
}

/**
 * Verify and consume a linking token
 */
export async function verifyLinkingToken(
  token: string,
): Promise<{
  valid: boolean;
  slackUserId?: string;
  workspaceId?: string;
  slackEmail?: string;
}> {
  try {
    const db = getDb();

    // Find the token
    const [linkingToken] = await db
      .select()
      .from(slackLinkingTokens)
      .where(eq(slackLinkingTokens.token, token))
      .limit(1);

    if (!linkingToken) {
      return { valid: false };
    }

    // Check if expired
    if (linkingToken.expiresAt < new Date()) {
      logger.warn(
        { token: token.substring(0, 10) + "..." },
        "Linking token expired",
      );
      return { valid: false };
    }

    // Check if already used
    if (linkingToken.usedAt) {
      logger.warn(
        { token: token.substring(0, 10) + "..." },
        "Linking token already used",
      );
      return { valid: false };
    }

    return {
      valid: true,
      slackUserId: linkingToken.slackUserId,
      workspaceId: linkingToken.workspaceId,
      ...(linkingToken.slackEmail
        ? { slackEmail: linkingToken.slackEmail }
        : {}),
    };
  } catch (error) {
    logger.error({ error }, "Failed to verify linking token");
    return { valid: false };
  }
}

/**
 * Mark a linking token as used
 */
export async function consumeLinkingToken(token: string): Promise<void> {
  try {
    const db = getDb();

    await db
      .update(slackLinkingTokens)
      .set({ usedAt: new Date() })
      .where(eq(slackLinkingTokens.token, token));

    logger.info(
      { token: token.substring(0, 10) + "..." },
      "Consumed linking token",
    );
  } catch (error) {
    logger.error({ error }, "Failed to consume linking token");
    throw error;
  }
}

/**
 * Clean up expired linking tokens
 */
export async function cleanupExpiredLinkingTokens(): Promise<number> {
  try {
    const db = getDb();

    const result = await db
      .delete(slackLinkingTokens)
      .where(sql`${slackLinkingTokens.expiresAt} < NOW()`);

    const count = (result as any).rowCount || 0;

    if (count > 0) {
      logger.info({ count }, "Cleaned up expired linking tokens");
    }

    return count;
  } catch (error) {
    logger.error({ error }, "Failed to cleanup expired tokens");
    return 0;
  }
}

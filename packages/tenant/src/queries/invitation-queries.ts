import {
  and,
  desc,
  eq,
  gt,
  invitations,
  isNull,
  tenants,
  users,
  type DrizzleClient,
} from "@figgy/shared-db";
import { createLogger } from "@figgy/utils/logger";
import { getDb } from "../db";
import type { Invitation } from "../types";

const logger = createLogger("invitation-queries");

export interface InvitationWithDetails extends Invitation {
  inviterName?: string | undefined;
  tenantName?: string | undefined;
}

/**
 * Get all pending invitations for a tenant
 */
export async function getInvitations(
  tenantId: string,
  db?: DrizzleClient
): Promise<InvitationWithDetails[]> {
  logger.info("Getting invitations", { tenantId });

  const database = db || getDb();

  try {
    const results = await database
      .select({
        invitation: invitations,
        inviterName: users.name,
        tenantName: tenants.name,
      })
      .from(invitations)
      .leftJoin(users, eq(invitations.invitedBy, users.id))
      .leftJoin(tenants, eq(invitations.tenantId, tenants.id))
      .where(
        and(
          eq(invitations.tenantId, tenantId),
          isNull(invitations.acceptedAt),
          gt(invitations.expiresAt, new Date())
        )
      )
      .orderBy(desc(invitations.createdAt));

    return results.map((row) => ({
      ...row.invitation,
      inviterName: row.inviterName || undefined,
      tenantName: row.tenantName || undefined,
    }));
  } catch (error) {
    logger.error("Database error in getInvitations", {
      error: error instanceof Error ? {
        message: error.message,
        code: (error as any).code,
        detail: (error as any).detail,
      } : error,
      tenantId
    });
    
    // If it's a permission error, table doesn't exist, or query error, return empty array
    if (error instanceof Error && (
      error.message.includes('permission denied') ||
      error.message.includes('does not exist') ||
      error.message.includes('row-level security') ||
      error.message.includes('Failed query')
    )) {
      logger.warn("Invitations table access issue, returning empty array", { 
        tenantId,
        errorMessage: error.message 
      });
      return [];
    }
    
    throw error;
  }
}

/**
 * Get an invitation by token
 */
export async function getInvitationByToken(
  token: string,
  db?: DrizzleClient
): Promise<InvitationWithDetails | null> {
  logger.info("Getting invitation by token");

  const database = db || getDb();

  const results = await database
    .select({
      invitation: invitations,
      inviterName: users.name,
      tenantName: tenants.name,
    })
    .from(invitations)
    .leftJoin(users, eq(invitations.invitedBy, users.id))
    .leftJoin(tenants, eq(invitations.tenantId, tenants.id))
    .where(eq(invitations.token, token))
    .limit(1);

  if (results.length === 0) {
    return null;
  }

  const row = results[0]!;
  return {
    ...row.invitation,
    inviterName: row.inviterName || undefined,
    tenantName: row.tenantName || undefined,
  };
}

/**
 * Cancel a pending invitation
 */
export async function cancelInvitation(
  tenantId: string,
  invitationId: string,
  db?: DrizzleClient
): Promise<void> {
  logger.info("Cancelling invitation", { tenantId, invitationId });

  const database = db || getDb();

  await database
    .delete(invitations)
    .where(
      and(
        eq(invitations.id, invitationId),
        eq(invitations.tenantId, tenantId),
        isNull(invitations.acceptedAt)
      )
    );
}

/**
 * Check if an email has a pending invitation for a tenant
 */
export async function hasPendingInvitation(
  tenantId: string,
  email: string,
  db?: DrizzleClient
): Promise<boolean> {
  const database = db || getDb();

  const [result] = await database
    .select({ count: invitations.id })
    .from(invitations)
    .where(
      and(
        eq(invitations.tenantId, tenantId),
        eq(invitations.email, email),
        isNull(invitations.acceptedAt),
        gt(invitations.expiresAt, new Date())
      )
    )
    .limit(1);

  return result !== undefined;
}
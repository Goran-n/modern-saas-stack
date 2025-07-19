import { tenantMembers, users } from "@kibly/shared-db";
import { desc, eq } from "@kibly/shared-db";
import { getDb } from "../db";
import type { TenantMember, User } from "../types";

export async function listMembers(
  tenantId: string,
): Promise<(TenantMember & { user: User })[]> {
  const db = getDb();

  const members = await db
    .select({
      member: tenantMembers,
      user: users,
    })
    .from(tenantMembers)
    .innerJoin(users, eq(tenantMembers.userId, users.id))
    .where(eq(tenantMembers.tenantId, tenantId))
    .orderBy(desc(tenantMembers.joinedAt));

  return members.map(({ member, user }) => ({
    ...member,
    user: {
      ...user,
      preferences: user.preferences as Record<string, any>,
    } as User,
  }));
}

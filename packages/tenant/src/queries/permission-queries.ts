import { and, eq, tenantMembers } from "@figgy/shared-db";
import { getDb } from "../db";
import type { CheckPermissionInput, Permission } from "../types";
import { checkPermissionSchema, rolePermissions } from "../types";

export async function checkPermission(
  input: CheckPermissionInput,
): Promise<boolean> {
  const validated = checkPermissionSchema.parse(input);

  const db = getDb();

  const [member] = await db
    .select()
    .from(tenantMembers)
    .where(
      and(
        eq(tenantMembers.tenantId, validated.tenantId),
        eq(tenantMembers.userId, validated.userId),
      ),
    )
    .limit(1);

  if (!member) {
    return false;
  }

  const permissions =
    rolePermissions[member.role as keyof typeof rolePermissions];
  return permissions.includes(validated.permission as Permission);
}

export async function getUserPermissions(
  tenantId: string,
  userId: string,
): Promise<Permission[]> {
  const db = getDb();

  const [member] = await db
    .select()
    .from(tenantMembers)
    .where(
      and(
        eq(tenantMembers.tenantId, tenantId),
        eq(tenantMembers.userId, userId),
      ),
    )
    .limit(1);

  if (!member) {
    return [];
  }

  return rolePermissions[member.role as keyof typeof rolePermissions];
}

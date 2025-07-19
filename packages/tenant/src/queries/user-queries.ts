import { users } from "@kibly/shared-db";
import { eq } from "@kibly/shared-db";
import { getDb } from "../db";
import type { User } from "../types";

export async function getUser(userId: string): Promise<User | null> {
  const db = getDb();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user
    ? ({
        ...user,
        preferences: user.preferences as Record<string, any>,
      } as User)
    : null;
}

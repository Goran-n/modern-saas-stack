import { getDatabaseConnection } from "@my-app/shared-db";
import type { User } from "@my-app/types";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

export interface Context {
  db: ReturnType<typeof getDatabaseConnection>;
  user?: User;
  tenantId?: string;
  requestId: string;
}

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<Context> {
  // Generate a unique request ID
  const requestId = crypto.randomUUID();

  // Get database connection
  const db = getDatabaseConnection();

  // Extract user info from headers or JWT token
  // This is where you'd implement your authentication logic
  const authHeader = opts.req.headers.get("authorization");
  const tenantId = opts.req.headers.get("x-tenant-id");

  let user: User | undefined;

  if (authHeader) {
    // TODO: Implement JWT token validation and user extraction
    // user = await validateTokenAndGetUser(authHeader);
  }

  return {
    db,
    user,
    tenantId: tenantId || undefined,
    requestId,
  };
}
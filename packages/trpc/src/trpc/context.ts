import { getConfig } from "@figgy/config";
import type { DrizzleClient } from "@figgy/shared-db";
import { getDatabaseConnection } from "@figgy/shared-db";
import type { Tenant } from "@figgy/tenant";
import { logger } from "@figgy/utils";
import type { User } from "@supabase/supabase-js";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

export interface Context {
  db: DrizzleClient;
  user: User | null;
  tenantId: string | null;
  tenant?: Tenant;
  supabase: SupabaseClient;
  requestId: string;
  headers: Headers;
}

// Context type for procedures that require authentication
export interface AuthenticatedContext extends Context {
  user: User;
}

// Context type for procedures that require tenant access
export interface TenantContext extends AuthenticatedContext {
  tenantId: string;
  tenant: Tenant;
}

export async function createContext({
  req,
}: FetchCreateContextFnOptions): Promise<Context> {
  const headers = req.headers;
  const requestId = crypto.randomUUID();
  const config = getConfig().getCore();

  const supabase = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
      },
    },
  );

  let user: User | null = null;
  let tenantId: string | null = null;

  const authorization = headers.get("authorization");
  if (authorization) {
    const token = authorization.replace("Bearer ", "");

    try {
      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.getUser(token);

      if (!error && authUser) {
        user = authUser;
        tenantId = headers.get("x-tenant-id") || null;
      }
    } catch (error) {
      logger.error("Failed to authenticate user", { error, requestId });
    }
  }

  const db = getDatabaseConnection(config.DATABASE_URL);

  return {
    db,
    user,
    tenantId,
    supabase,
    requestId,
    headers,
  };
}

import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getConfig } from "@kibly/config";
import { createDrizzleClient, type DrizzleClient } from "@kibly/shared-db";
import { logger } from "@kibly/utils";
import type { User } from "@supabase/supabase-js";
import type { Tenant } from "@kibly/tenant";

export interface Context {
  db: DrizzleClient;
  user: User | null;
  tenantId: string | null;
  tenant?: Tenant;
  supabase: SupabaseClient;
  requestId: string;
  headers: Headers;
}

export async function createContext({
  req,
}: FetchCreateContextFnOptions): Promise<Context> {
  const headers = req.headers;
  const requestId = crypto.randomUUID();
  const config = getConfig().getCore();
  
  const supabase = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
      },
    }
  );

  let user: User | null = null;
  let tenantId: string | null = null;

  const authorization = headers.get("authorization");
  if (authorization) {
    const token = authorization.replace("Bearer ", "");
    
    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser(token);
      
      if (!error && authUser) {
        user = authUser;
        tenantId = headers.get("x-tenant-id") || null;
      }
    } catch (error) {
      logger.error("Failed to authenticate user", { error, requestId });
    }
  }

  const db = createDrizzleClient(config.DATABASE_URL);

  return {
    db,
    user,
    tenantId,
    supabase,
    requestId,
    headers,
  };
}
import { createLogger } from "@kibly/utils";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

const logger = createLogger("auth");

export interface AuthConfig {
  supabase: {
    url: string;
    anonKey: string;
    jwtSecret: string;
  };
}

export interface AuthUser {
  id: string;
  email: string;
  tenantId?: string;
  role?: string;
}

interface JwtPayload {
  sub: string;
  email: string;
  role?: string;
  user_metadata?: {
    tenant_id?: string;
  };
  iat?: number;
  exp?: number;
}

export class AuthService {
  private supabase: ReturnType<typeof createClient>;

  constructor(private config: AuthConfig) {
    this.supabase = createClient(config.supabase.url, config.supabase.anonKey);
  }

  async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      const decoded = jwt.verify(
        token,
        this.config.supabase.jwtSecret,
      ) as JwtPayload;

      return {
        id: decoded.sub,
        email: decoded.email,
        ...(decoded.user_metadata?.tenant_id && {
          tenantId: decoded.user_metadata.tenant_id,
        }),
        ...(decoded.role && { role: decoded.role }),
      };
    } catch (error) {
      logger.error("Failed to verify token", String(error));
      return null;
    }
  }

  async getUser(userId: string): Promise<AuthUser | null> {
    try {
      const { data, error } =
        await this.supabase.auth.admin.getUserById(userId);

      if (error || !data.user) {
        return null;
      }

      return {
        id: data.user.id,
        email: data.user.email!,
        tenantId: data.user.user_metadata?.tenant_id,
        ...(data.user.role && { role: data.user.role }),
      };
    } catch (error) {
      logger.error("Failed to get user", String(error));
      return null;
    }
  }
}

export function createAuthService(config: AuthConfig): AuthService {
  return new AuthService(config);
}

// Export operations
export * from "./operations";

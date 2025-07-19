import { createLogger } from "@kibly/utils";
import type { SupabaseClient } from "@supabase/supabase-js";

const logger = createLogger("user-operations");

/**
 * List all users
 * @param supabase - Supabase client instance
 * @returns Promise resolving to formatted user list
 */
export async function listUsers(
  supabase: SupabaseClient,
): Promise<Array<{
  id: string;
  email: string | undefined;
  name: string;
  avatar?: string | undefined;
  createdAt: string;
  lastSignIn?: string | undefined;
  metadata?: any;
}>> {
  logger.info("Listing all users");

  try {
    const {
      data: { users },
      error,
    } = await supabase.auth.admin.listUsers();

    if (error) {
      logger.error("Failed to list users from Supabase", { error });
      throw new Error("Failed to list users");
    }

    // Format users
    const formattedUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      name:
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Unknown User",
      avatar: user.user_metadata?.avatar_url,
      createdAt: user.created_at,
      lastSignIn: user.last_sign_in_at || undefined,
      metadata: user.user_metadata,
    }));

    return formattedUsers;
  } catch (error) {
    logger.error("Failed to list users", { error });
    throw new Error("Failed to list users");
  }
}

/**
 * Get user by ID
 * @param userId - User ID
 * @returns Promise resolving to user details or null
 */
export async function getUserById(
  supabase: SupabaseClient,
  userId: string,
): Promise<{
  id: string;
  email: string | undefined;
  name: string;
  avatar?: string | undefined;
  createdAt: string;
  lastSignIn?: string | undefined;
  metadata?: any;
} | null> {
  logger.info("Getting user by ID", { userId });

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.admin.getUserById(userId);

    if (error || !user) {
      logger.warn("User not found", { userId });
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name:
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Unknown User",
      avatar: user.user_metadata?.avatar_url || undefined,
      createdAt: user.created_at,
      lastSignIn: user.last_sign_in_at || undefined,
      metadata: user.user_metadata,
    };
  } catch (error) {
    logger.error("Failed to get user by ID", { error, userId });
    throw new Error("Failed to get user");
  }
}

/**
 * Format current user data
 * @param user - User object from auth context
 * @returns Formatted user data
 */
export function formatCurrentUser(user: {
  id: string;
  email?: string;
  user_metadata?: any;
}): {
  id: string;
  email?: string | undefined;
  name: string;
  avatar?: string | undefined;
  metadata?: any;
} {
  return {
    id: user.id,
    email: user.email || undefined,
    name:
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Unknown User",
    avatar: user.user_metadata?.avatar_url || undefined,
    metadata: user.user_metadata,
  };
}
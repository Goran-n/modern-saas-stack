/**
 * Supabase client for browser extension
 *
 * Creates and manages a Supabase client instance with custom storage
 * adapter for browser extension environment.
 */

import {
  createClient,
  type Session,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { env, validateEnv } from "../config/env";
import { createLogger } from "./logger";
import {
  clearAuthStorage,
  createChromeStorageAdapter,
} from "./storage-adapter";

const logger = createLogger("supabase");

// Validate environment on module load
validateEnv();

// Storage keys
const STORAGE_KEY = "supabase.auth.token";

// Create the storage adapter
const storageAdapter = createChromeStorageAdapter();

// Create Supabase client with custom storage
let supabaseClient: SupabaseClient | null = null;

/**
 * Get or create the Supabase client instance
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: {
        storage: storageAdapter,
        storageKey: STORAGE_KEY,
        autoRefreshToken: false, // Disable to prevent infinite retry loops
        persistSession: true,
        detectSessionInUrl: true, // Enable for OAuth callback handling
      },
    });

    // Set up auth state change listener
    supabaseClient.auth.onAuthStateChange((event, session) => {
      logger.info("Auth state changed", { event, userId: session?.user?.id });

      // Handle specific auth events
      switch (event) {
        case "SIGNED_IN":
          handleSignIn(session);
          break;
        case "SIGNED_OUT":
          handleSignOut();
          break;
        case "TOKEN_REFRESHED":
          logger.debug("Token refreshed successfully");
          break;
        case "USER_UPDATED":
          logger.debug("User data updated");
          break;
      }
    });
  }

  return supabaseClient;
}

/**
 * Handle sign in event
 */
async function handleSignIn(session: Session | null) {
  if (!session) return;

  try {
    // Store tenant ID if available in user metadata
    const tenantId = session.user.user_metadata?.tenant_id;
    if (tenantId) {
      await chrome.storage.local.set({ tenantId });
      logger.info("Stored tenant ID from user metadata", { tenantId });
    }

    logger.info("User signed in successfully", { userId: session.user.id });
  } catch (error) {
    logger.error("Failed to handle sign in", { error });
  }
}

/**
 * Handle sign out event
 */
async function handleSignOut() {
  try {
    // Clear all auth-related storage
    await clearAuthStorage();

    // Clear tenant ID
    await chrome.storage.local.remove(["tenantId"]);

    logger.info("Cleared all auth data after sign out");
  } catch (error) {
    logger.error("Failed to handle sign out", { error });
  }
}

/**
 * Get the current session
 */
export async function getSession(): Promise<Session | null> {
  try {
    logger.info("Getting session from Supabase client");

    const client = getSupabaseClient();
    const {
      data: { session },
      error,
    } = await client.auth.getSession();

    if (error) {
      logger.error("Failed to get session from Supabase", { error });

      // If we get fetch/network errors, clear storage and try once more
      if (error.message?.toLowerCase().includes("fetch")) {
        logger.warn("Network error detected, clearing auth storage");
        try {
          await clearAuthStorage();
        } catch (clearError) {
          logger.warn("Failed to clear auth storage", { clearError });
        }
      }

      return null;
    }

    if (session) {
      logger.info("Session retrieved from Supabase", {
        hasSession: !!session,
        hasAccessToken: !!session.access_token,
        userEmail: session.user?.email,
        expiresAt: session.expires_at,
      });
    } else {
      logger.info("No existing session found");
    }

    return session;
  } catch (error) {
    logger.error("Exception getting session", { error });

    // Clear potentially corrupted storage on any exception
    try {
      await clearAuthStorage();
      logger.info("Cleared auth storage due to exception");
    } catch (clearError) {
      logger.warn("Failed to clear auth storage", { clearError });
    }

    return null;
  }
}

/**
 * Get the current user
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const client = getSupabaseClient();
    const {
      data: { user },
      error,
    } = await client.auth.getUser();

    if (error) {
      logger.error("Failed to get user", { error });
      return null;
    }

    return user;
  } catch (error) {
    logger.error("Failed to get user", { error });
    return null;
  }
}

/**
 * Refresh the session token
 */
export async function refreshSession(): Promise<Session | null> {
  try {
    const client = getSupabaseClient();
    const {
      data: { session },
      error,
    } = await client.auth.refreshSession();

    if (error) {
      logger.error("Failed to refresh session", { error });
      return null;
    }

    logger.info("Session refreshed successfully");
    return session;
  } catch (error) {
    logger.error("Failed to refresh session", { error });
    return null;
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  try {
    const client = getSupabaseClient();
    const { error } = await client.auth.signOut();

    if (error) {
      logger.error("Failed to sign out", { error });
      throw error;
    }

    logger.info("User signed out successfully");
  } catch (error) {
    logger.error("Failed to sign out", { error });
    throw error;
  }
}

/**
 * Initialize auth state on extension startup
 */
export async function initializeAuth(): Promise<void> {
  try {
    logger.info("Initializing auth state");

    // Get the current session
    const session = await getSession();

    if (session) {
      logger.info("Found existing session", { userId: session.user.id });

      // Check if token needs refresh (expires in less than 60 seconds)
      const expiresAt = session.expires_at;
      if (expiresAt) {
        const expiresIn = expiresAt * 1000 - Date.now();
        if (expiresIn < 60000) {
          logger.info("Token expires soon, refreshing");
          await refreshSession();
        }
      }
    } else {
      logger.info("No existing session found");
    }
  } catch (error) {
    logger.error("Failed to initialize auth", { error });
  }
}

// Export the client getter for direct access if needed
export { getSupabaseClient as supabase };

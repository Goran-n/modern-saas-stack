/**
 * Auth store for browser extension
 *
 * Manages authentication state and provides methods for
 * sign in, sign out, and session management.
 */

import type { Session, User } from "@supabase/supabase-js";
import { computed, ref } from "vue";
import { createLogger } from "../utils/logger";
import {
  getCurrentUser,
  getSession,
  getSupabaseClient,
  signOut as supabaseSignOut,
} from "../utils/supabase";

const logger = createLogger("auth-store");

// State
const currentUser = ref<User | null>(null);
const currentSession = ref<Session | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

// Computed
const isAuthenticated = computed(() => !!currentSession.value);
const userEmail = computed(() => currentUser.value?.email || null);
const userId = computed(() => currentUser.value?.id || null);
const tenantId = computed(
  () => currentUser.value?.user_metadata?.tenant_id || null,
);

/**
 * Initialize auth state
 */
export async function initAuth() {
  try {
    isLoading.value = true;
    error.value = null;

    logger.info("Starting auth initialization");

    // Debug: Check raw Chrome storage for the session data
    const rawStorage = await chrome.storage.local.get("supabase.auth.token");
    logger.info("Raw storage check for session", {
      hasKey: !!rawStorage["supabase.auth.token"],
      rawData: rawStorage["supabase.auth.token"] ? "Present" : "Missing",
    });

    // Get current session and user
    const session = await getSession();
    const user = await getCurrentUser();

    logger.info("Retrieved session and user data", {
      hasSession: !!session,
      hasUser: !!user,
      sessionAccessToken: session?.access_token ? "Present" : "Missing",
      userEmail: user?.email || "No email",
      userId: user?.id || "No ID",
    });

    currentSession.value = session;
    currentUser.value = user;

    logger.info("Auth initialized", {
      authenticated: isAuthenticated.value,
      userId: userId.value,
      userEmail: userEmail.value,
      tenantId: tenantId.value,
    });
  } catch (err) {
    logger.error("Failed to initialize auth", { error: err });
    error.value = "Failed to initialize authentication";
  } finally {
    isLoading.value = false;
  }
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  try {
    isLoading.value = true;
    error.value = null;

    const client = getSupabaseClient();
    const { data, error: signInError } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      throw signInError;
    }

    currentSession.value = data.session;
    currentUser.value = data.user;

    logger.info("User signed in", { userId: data.user?.id });
    return data;
  } catch (err: any) {
    logger.error("Sign in failed", { error: err });
    error.value = err.message || "Failed to sign in";
    throw err;
  } finally {
    isLoading.value = false;
  }
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string) {
  try {
    isLoading.value = true;
    error.value = null;

    const client = getSupabaseClient();
    const { data, error: signUpError } = await client.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      throw signUpError;
    }

    // Note: User might need to verify email before session is created
    if (data.session) {
      currentSession.value = data.session;
      currentUser.value = data.user;
    }

    logger.info("User signed up", { userId: data.user?.id });
    return data;
  } catch (err: any) {
    logger.error("Sign up failed", { error: err });
    error.value = err.message || "Failed to sign up";
    throw err;
  } finally {
    isLoading.value = false;
  }
}

/**
 * Sign in with Google OAuth - not needed for web app based auth
 */
export async function signInWithGoogle() {
  // OAuth is handled via web app, not directly in extension
  throw new Error("OAuth should be handled via web app authentication flow");
}

/**
 * Handle OAuth callback - not needed for web app based auth
 */
export async function handleOAuthCallback() {
  // OAuth callbacks are handled by web app, not extension
  throw new Error("OAuth callbacks should be handled by web app");
}

/**
 * Sign out
 */
export async function signOut() {
  try {
    isLoading.value = true;
    error.value = null;

    await supabaseSignOut();

    currentSession.value = null;
    currentUser.value = null;

    logger.info("User signed out");
  } catch (err: any) {
    logger.error("Sign out failed", { error: err });
    error.value = err.message || "Failed to sign out";
    throw err;
  } finally {
    isLoading.value = false;
  }
}

/**
 * Handle auth state changes
 */
export function onAuthStateChange() {
  const client = getSupabaseClient();

  return client.auth.onAuthStateChange((event, session) => {
    logger.debug("Auth state changed in store", { event });

    currentSession.value = session;
    currentUser.value = session?.user || null;

    // Clear error on successful auth events
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      error.value = null;
    }
  });
}

// Export store
export const useAuthStore = () => {
  return {
    // State
    currentUser,
    currentSession,
    isLoading,
    error,

    // Computed
    isAuthenticated,
    userEmail,
    userId,
    tenantId,

    // Actions
    initAuth,
    signIn,
    signUp,
    signInWithGoogle,
    handleOAuthCallback,
    signOut,
    onAuthStateChange,
  };
};

// Export alias for consistency with pb-frontend patterns
export const useAuth = useAuthStore;

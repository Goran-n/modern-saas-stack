/**
 * Chrome Storage Adapter for Supabase Auth
 *
 * Implements a custom storage adapter that uses Chrome's storage API
 * instead of localStorage, which is not available in all extension contexts.
 */

import { createLogger } from "./logger";

const logger = createLogger("storage-adapter");

export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

/**
 * Creates a storage adapter using Chrome's storage.local API
 * This persists data across browser sessions and extension restarts
 */
export function createChromeStorageAdapter(): StorageAdapter {
  return {
    async getItem(key: string): Promise<string | null> {
      try {
        logger.debug("Getting item from storage", { key });
        const result = await chrome.storage.local.get(key);
        const value = result[key];

        logger.debug("Storage result", {
          key,
          hasValue: value !== undefined && value !== null,
          valueType: typeof value,
          valueLength: typeof value === "string" ? value.length : "N/A",
          value: key === "supabase.auth.token" ? value : "[hidden]",
        });

        if (value === undefined || value === null) {
          logger.debug("No value found for key", { key });
          return null;
        }

        // Ensure we return a string
        const finalValue =
          typeof value === "string" ? value : JSON.stringify(value);
        logger.debug("Returning value from storage", {
          key,
          length: finalValue.length,
        });
        return finalValue;
      } catch (error) {
        logger.error("Failed to get item from storage", { key, error });
        return null;
      }
    },

    async setItem(key: string, value: string): Promise<void> {
      try {
        await chrome.storage.local.set({ [key]: value });
        logger.debug("Stored item in storage", { key, size: value.length });
      } catch (error) {
        logger.error("Failed to set item in storage", { key, error });
        throw error;
      }
    },

    async removeItem(key: string): Promise<void> {
      try {
        await chrome.storage.local.remove(key);
        logger.debug("Removed item from storage", { key });
      } catch (error) {
        logger.error("Failed to remove item from storage", { key, error });
        throw error;
      }
    },
  };
}

/**
 * Creates a storage adapter using Chrome's storage.session API
 * This only persists data for the duration of the browser session
 * Use this for sensitive data that shouldn't persist after browser close
 */
export function createChromeSessionStorageAdapter(): StorageAdapter {
  // Check if session storage is available (Chrome 102+)
  if (!chrome.storage.session) {
    logger.warn("Session storage not available, falling back to local storage");
    return createChromeStorageAdapter();
  }

  return {
    async getItem(key: string): Promise<string | null> {
      try {
        const result = await chrome.storage.session.get(key);
        const value = result[key];

        if (value === undefined || value === null) {
          return null;
        }

        return typeof value === "string" ? value : JSON.stringify(value);
      } catch (error) {
        logger.error("Failed to get item from session storage", { key, error });
        return null;
      }
    },

    async setItem(key: string, value: string): Promise<void> {
      try {
        await chrome.storage.session.set({ [key]: value });
        logger.debug("Stored item in session storage", {
          key,
          size: value.length,
        });
      } catch (error) {
        logger.error("Failed to set item in session storage", { key, error });
        throw error;
      }
    },

    async removeItem(key: string): Promise<void> {
      try {
        await chrome.storage.session.remove(key);
        logger.debug("Removed item from session storage", { key });
      } catch (error) {
        logger.error("Failed to remove item from session storage", {
          key,
          error,
        });
        throw error;
      }
    },
  };
}

/**
 * Helper to clear all Supabase auth data from storage
 */
export async function clearAuthStorage(): Promise<void> {
  try {
    // Get all keys that might contain auth data
    const localStorage = await chrome.storage.local.get(null);
    const authKeys = Object.keys(localStorage).filter(
      (key) =>
        key.includes("supabase") ||
        key.includes("auth") ||
        key.includes("session"),
    );

    if (authKeys.length > 0) {
      await chrome.storage.local.remove(authKeys);
      logger.info("Cleared auth storage", { keysRemoved: authKeys.length });
    }

    // Also clear session storage if available
    if (chrome.storage.session) {
      const sessionStorage = await chrome.storage.session.get(null);
      const sessionAuthKeys = Object.keys(sessionStorage).filter(
        (key) =>
          key.includes("supabase") ||
          key.includes("auth") ||
          key.includes("session"),
      );

      if (sessionAuthKeys.length > 0) {
        await chrome.storage.session.remove(sessionAuthKeys);
      }
    }
  } catch (error) {
    logger.error("Failed to clear auth storage", { error });
  }
}

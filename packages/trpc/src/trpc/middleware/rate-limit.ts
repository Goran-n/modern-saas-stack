import { TRPCError } from "@trpc/server";
import { middleware } from "../index";

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  message?: string;
  keyGenerator?: (ctx: any) => string;
}

// Simple in-memory store for rate limiting
// In production, this should use Redis or similar
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate limiting middleware for tRPC procedures
 */
export const rateLimit = (options: RateLimitOptions) => {
  const {
    windowMs,
    max,
    message = "Too many requests, please try again later",
    keyGenerator = (ctx) => ctx.user?.id || ctx.ip || "anonymous",
  } = options;

  return middleware(async ({ ctx, next }) => {
    const key = keyGenerator(ctx);
    const now = Date.now();
    const resetTime = now + windowMs;

    const current = rateLimitStore.get(key);

    if (!current || current.resetTime < now) {
      // First request or window expired
      rateLimitStore.set(key, { count: 1, resetTime });
    } else if (current.count >= max) {
      // Rate limit exceeded
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message,
      });
    } else {
      // Increment counter
      current.count++;
      rateLimitStore.set(key, current);
    }

    return next();
  });
};

/**
 * Per-tenant rate limiting
 * Limits requests per tenant to prevent one tenant from overwhelming the system
 */
export const tenantRateLimit = (options: Omit<RateLimitOptions, "keyGenerator">) => {
  return rateLimit({
    ...options,
    keyGenerator: (ctx) => `tenant:${ctx.tenantId}`,
  });
};

/**
 * Per-user rate limiting
 * Limits requests per user across all tenants
 */
export const userRateLimit = (options: Omit<RateLimitOptions, "keyGenerator">) => {
  return rateLimit({
    ...options,
    keyGenerator: (ctx) => `user:${ctx.user?.id || ctx.ip}`,
  });
};
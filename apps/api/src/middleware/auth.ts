import type { Context, Next } from 'hono'
import jwt from 'jsonwebtoken'
import { getAuthConfig } from '../config/config'
import log from '../config/logger'

const authConfig = getAuthConfig()

// Use types from context to avoid circular dependencies
import type { AuthUser } from '../lib/context'

export type { AuthUser }

export interface AuthContext {
  user: AuthUser
}

export interface SupabaseJwtPayload {
  sub: string
  aud: string
  iss: string
  iat: number
  exp: number
  email?: string
  phone?: string
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
  role?: string
  aal?: string
  amr?: Array<{ method: string; timestamp: number }>
  session_id?: string
}

/**
 * Supabase JWT Authentication middleware
 */
export async function authMiddleware(c: Context, next: Next): Promise<Response | void> {
  const authHeader = c.req.header('authorization')
  
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid authorization header' }, 401)
  }

  const token = authHeader.slice(7)

  try {
    const jwtSecret = authConfig.jwtKey || authConfig.jwtSecret
    if (!jwtSecret) {
      log.error('JWT_KEY or JWT_SECRET not configured')
      return c.json({ error: 'Server configuration error' }, 500)
    }

    // Verify Supabase JWT token
    const decoded = jwt.verify(token, jwtSecret) as SupabaseJwtPayload

    // Validate required fields
    if (!decoded.sub) {
      return c.json({ error: 'Invalid token: missing user ID' }, 401)
    }

    // Validate issuer if configured
    if (authConfig.jwtIssuer && decoded.iss !== authConfig.jwtIssuer) {
      log.warn(`JWT issuer mismatch: expected ${authConfig.jwtIssuer}, got ${decoded.iss}`)
      return c.json({ error: 'Invalid token issuer' }, 401)
    }

    // Check token expiration
    const now = Math.floor(Date.now() / 1000)
    if (decoded.exp && decoded.exp < now) {
      return c.json({ error: 'Token expired' }, 401)
    }

    // Set user context from Supabase JWT payload
    c.set('user', {
      id: decoded.sub,
      email: decoded.email,
      phone: decoded.phone,
      aud: decoded.aud,
      role: decoded.role,
      app_metadata: decoded.app_metadata,
      user_metadata: decoded.user_metadata,
      session_id: decoded.session_id,
    })

    // Also set JWT payload for advanced use cases
    c.set('jwtPayload', decoded)

    await next()
  } catch (error) {
    log.warn('Supabase JWT verification failed:', (error as Error).message)
    return c.json({ error: 'Invalid or expired token' }, 401)
  }
}

/**
 * Optional authentication middleware - allows requests with or without auth
 */
export async function optionalAuthMiddleware(c: Context, next: Next): Promise<Response | void> {
  const authHeader = c.req.header('authorization')
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    
    try {
      const jwtSecret = authConfig.jwtKey || authConfig.jwtSecret
      
      if (!jwtSecret) {
        log.error('CRITICAL: JWT secret not configured but authentication attempted')
        return c.json({ 
          error: 'Server configuration error - authentication unavailable',
          code: 'AUTH_CONFIG_ERROR'
        }, 500)
      }
      
      const decoded = jwt.verify(token, jwtSecret) as SupabaseJwtPayload

      if (decoded.sub) {
        const user = {
          id: decoded.sub,
          email: decoded.email,
          phone: decoded.phone,
          aud: decoded.aud,
          role: decoded.role,
          app_metadata: decoded.app_metadata,
          user_metadata: decoded.user_metadata,
          session_id: decoded.session_id,
        }
        c.set('user', user)
        c.set('jwtPayload', decoded)
      }
    } catch (error) {
      // For optional auth, we log the error but don't fail the request
      log.warn('JWT verification failed in optional auth:', (error as Error).message)
    }
  }

  await next()
}

/**
 * Get authenticated user from context
 */
export function getAuthUser(c: Context): AuthUser | null {
  return c.get('user') || null
}

/**
 * Require authenticated user - throws if not authenticated
 */
export function requireAuthUser(c: Context): AuthUser {
  const user = getAuthUser(c)
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}
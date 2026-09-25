// =============================================
// Auth middleware - JWT verification
// =============================================

import { Context, Next } from 'hono'
import { verifyToken } from '../utils/crypto'
import type { Bindings, JWTPayload } from '../types'

// Extend Hono context variables
declare module 'hono' {
  interface ContextVariableMap {
    user: JWTPayload
  }
}

/**
 * Require authentication via JWT Bearer token.
 * Sets `c.get('user')` with the decoded JWT payload.
 */
export async function authMiddleware(c: Context<{ Bindings: Bindings }>, next: Next) {
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Unauthorized: missing token' }, 401)
  }

  const token = authHeader.slice(7)
  const secret = c.env.JWT_SECRET

  if (!secret) {
    return c.json({ success: false, error: 'Server error: JWT_SECRET not configured' }, 500)
  }

  const payload = await verifyToken(token, secret)
  if (!payload) {
    return c.json({ success: false, error: 'Unauthorized: invalid or expired token' }, 401)
  }

  c.set('user', payload)
  await next()
}

/**
 * Require specific roles.
 * Usage: c.use('/api/*', requireRole('owner', 'editor'))
 */
export function requireRole(...roles: string[]) {
  return async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    const user = c.get('user')
    if (!user || !roles.includes(user.role)) {
      return c.json({ success: false, error: `Forbidden: requires role [${roles.join('|')}]` }, 403)
    }
    await next()
  }
}

/**
 * Optional auth - sets user if token present, but doesn't block.
 * Used for public share endpoints that may optionally have auth.
 */
export async function optionalAuthMiddleware(c: Context<{ Bindings: Bindings }>, next: Next) {
  const authHeader = c.req.header('Authorization')

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const secret = c.env.JWT_SECRET
    if (secret) {
      const payload = await verifyToken(token, secret)
      if (payload) {
        c.set('user', payload)
      }
    }
  }

  await next()
}

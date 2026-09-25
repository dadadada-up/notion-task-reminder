// =============================================
// Auth Routes - register, login, me, users
// =============================================

import { Hono } from 'hono'
import type { Bindings } from '../types'
import { authMiddleware } from '../middleware/auth'
import { createToken, hashPassword, verifyPassword, generateId } from '../utils/crypto'

const auth = new Hono<{ Bindings: Bindings }>()

// POST /auth/register - Register (only works if no users exist, or by owner)
auth.post('/register', async (c) => {
  const { username, password, displayName } = await c.req.json()

  if (!username || !password) {
    return c.json({ success: false, error: 'Username and password are required' }, 400)
  }

  // Check if any users exist
  const countRow = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>()
  const userCount = countRow?.count ?? 0

  // If users exist, require owner role to register new users
  if (userCount > 0) {
    const user = c.get('user')
    if (!user || user.role !== 'owner') {
      return c.json({ success: false, error: 'Only owner can register new users' }, 403)
    }
  }

  // Check if username already exists
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()
  if (existing) {
    return c.json({ success: false, error: 'Username already exists' }, 409)
  }

  const id = generateId()
  const passwordHash = await hashPassword(password)
  const role = userCount === 0 ? 'owner' : 'viewer'

  await c.env.DB.prepare(
    'INSERT INTO users (id, username, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, username, passwordHash, displayName || username, role).run()

  const token = await createToken({ userId: id, username, role }, c.env.JWT_SECRET)

  return c.json({
    success: true,
    data: {
      token,
      user: { id, username, displayName: displayName || username, role }
    }
  }, 201)
})

// POST /auth/login - Login
auth.post('/login', async (c) => {
  const { username, password } = await c.req.json()

  if (!username || !password) {
    return c.json({ success: false, error: 'Username and password are required' }, 400)
  }

  const user = await c.env.DB.prepare(
    'SELECT id, username, password_hash, display_name, role FROM users WHERE username = ?'
  ).bind(username).first<{
    id: string; username: string; password_hash: string; display_name: string; role: string
  }>()

  if (!user) {
    return c.json({ success: false, error: 'Invalid username or password' }, 401)
  }

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) {
    return c.json({ success: false, error: 'Invalid username or password' }, 401)
  }

  const token = await createToken(
    { userId: user.id, username: user.username, role: user.role },
    c.env.JWT_SECRET
  )

  return c.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role
      }
    }
  })
})

// GET /auth/me - Get current user info (requires auth)
auth.get('/me', authMiddleware, async (c) => {
  const jwtUser = c.get('user')

  const user = await c.env.DB.prepare(
    'SELECT id, username, display_name, avatar_url, role, created_at FROM users WHERE id = ?'
  ).bind(jwtUser.userId).first() as any

  if (!user) {
    return c.json({ success: false, error: 'User not found' }, 404)
  }

  return c.json({
    success: true,
    data: {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      role: user.role,
      createdAt: user.created_at
    }
  })
})

export default auth

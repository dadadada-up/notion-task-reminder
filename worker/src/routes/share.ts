// =============================================
// Share Routes - Share links management + public view
// =============================================

import { Hono } from 'hono'
import type { Bindings } from '../types'
import { authMiddleware } from '../middleware/auth'
import { generateId, hashPassword, verifyPassword } from '../utils/crypto'

const share = new Hono<{ Bindings: Bindings }>()

// --- Public routes (no auth) ---

// GET /share/:token - View shared content (public)
share.get('/:token', async (c) => {
  const token = c.req.param('token')
  const password = c.req.query('password')

  // Find share link
  const link = await c.env.DB.prepare(
    'SELECT * FROM share_links WHERE token = ? AND is_active = 1'
  ).bind(token).first<any>()

  if (!link) {
    return c.json({ success: false, error: '分享链接不存在或已失效' }, 404)
  }

  // Check expiration
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return c.json({ success: false, error: '分享链接已过期' }, 410)
  }

  // Check password if set
  if (link.password_hash) {
    if (!password) {
      return c.json({ success: false, error: '需要密码访问', requiresPassword: true }, 401)
    }
    const valid = await verifyPassword(password, link.password_hash)
    if (!valid) {
      return c.json({ success: false, error: '密码错误', requiresPassword: true }, 401)
    }
  }

  // Increment view count
  await c.env.DB.prepare(
    'UPDATE share_links SET view_count = view_count + 1 WHERE id = ?'
  ).bind(link.id).run()

  // Fetch resource data based on type
  const data = await fetchShareResource(c.env, link)

  return c.json({
    success: true,
    data: {
      title: link.title,
      resourceType: link.resource_type,
      resourceId: link.resource_id,
      viewCount: link.view_count + 1,
      content: data
    }
  })
})

// POST /share/:token/verify - Verify password for protected share
share.post('/:token/verify', async (c) => {
  const token = c.req.param('token')
  const { password } = await c.req.json()

  const link = await c.env.DB.prepare(
    'SELECT * FROM share_links WHERE token = ? AND is_active = 1'
  ).bind(token).first<any>()

  if (!link) {
    return c.json({ success: false, error: '分享链接不存在' }, 404)
  }

  if (!link.password_hash) {
    return c.json({ success: true, data: { verified: true } })
  }

  const valid = await verifyPassword(password, link.password_hash)
  return c.json({ success: true, data: { verified: valid } })
})

// --- Authenticated routes ---

// POST /share - Create share link
share.post('/', authMiddleware, async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const { resourceType, resourceId, title, password, expiresInDays } = body

  if (!resourceType || !['task', 'weekly_summary', 'habit_dashboard', 'board'].includes(resourceType)) {
    return c.json({ success: false, error: '无效的资源类型' }, 400)
  }

  const id = generateId()
  const token = generateId().replace(/-/g, '').substring(0, 16)
  const passwordHash = password ? await hashPassword(password) : null
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
    : null

  await c.env.DB.prepare(`
    INSERT INTO share_links (id, user_id, token, resource_type, resource_id, title, password_hash, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.userId, token, resourceType, resourceId || null, title || null, passwordHash, expiresAt).run()

  const shareUrl = `${c.req.header('Origin') || ''}/share/${token}`

  return c.json({
    success: true,
    data: {
      id,
      token,
      shareUrl,
      title,
      resourceType,
      resourceId,
      hasPassword: !!password,
      expiresAt,
      createdAt: new Date().toISOString()
    }
  }, 201)
})

// GET /share - List user's share links
share.get('/', authMiddleware, async (c) => {
  const user = c.get('user')

  const { results } = await c.env.DB.prepare(`
    SELECT id, token, resource_type, resource_id, title, expires_at, view_count, is_active, created_at
    FROM share_links
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).bind(user.userId).all()

  const links = results.map((l: any) => ({
    id: l.id,
    token: l.token,
    shareUrl: `${c.req.header('Origin') || ''}/share/${l.token}`,
    title: l.title,
    resourceType: l.resource_type,
    resourceId: l.resource_id,
    expiresAt: l.expires_at,
    viewCount: l.view_count,
    isActive: l.is_active === 1,
    createdAt: l.created_at
  }))

  return c.json({ success: true, data: links, count: links.length })
})

// PUT /share/:id - Update share link
share.put('/:id', authMiddleware, async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  const body = await c.req.json()

  // Verify ownership
  const link = await c.env.DB.prepare(
    'SELECT * FROM share_links WHERE id = ? AND user_id = ?'
  ).bind(id, user.userId).first()

  if (!link) {
    return c.json({ success: false, error: '分享链接不存在' }, 404)
  }

  const updates: string[] = []
  const values: any[] = []

  if (body.title !== undefined) { updates.push('title = ?'); values.push(body.title) }
  if (body.isActive !== undefined) { updates.push('is_active = ?'); values.push(body.isActive ? 1 : 0) }
  if (body.expiresInDays !== undefined) {
    const expiresAt = body.expiresInDays > 0
      ? new Date(Date.now() + body.expiresInDays * 86400000).toISOString()
      : null
    updates.push('expires_at = ?')
    values.push(expiresAt)
  }
  if (body.password !== undefined) {
    const passwordHash = body.password ? await hashPassword(body.password) : null
    updates.push('password_hash = ?')
    values.push(passwordHash)
  }

  if (updates.length > 0) {
    values.push(id)
    await c.env.DB.prepare(`UPDATE share_links SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run()
  }

  return c.json({ success: true, message: '分享链接已更新' })
})

// DELETE /share/:id - Delete share link
share.delete('/:id', authMiddleware, async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')

  const result = await c.env.DB.prepare(
    'DELETE FROM share_links WHERE id = ? AND user_id = ?'
  ).bind(id, user.userId).run()

  if (result.meta.changes === 0) {
    return c.json({ success: false, error: '分享链接不存在' }, 404)
  }

  return c.json({ success: true, message: '分享链接已删除' })
})

// --- Helper: Fetch resource data for sharing ---
async function fetchShareResource(env: Bindings, link: any): Promise<any> {
  const { resource_type, resource_id } = link

  if (resource_type === 'task' && resource_id) {
    const task = await env.DB.prepare(`
      SELECT id, name, status, priority, task_type, assignee, start_date, deadline, notes
      FROM tasks WHERE id = ?
    `).bind(resource_id).first()

    if (!task) return { error: '任务不存在' }
    return { task }
  }

  if (resource_type === 'weekly_summary' && resource_id) {
    // resource_id is week_start date (e.g. "2026-09-15")
    const summary = await env.DB.prepare(
      'SELECT * FROM weekly_summaries WHERE user_id = ? AND week_start = ?'
    ).bind(link.user_id, resource_id).first()

    if (summary) {
      try {
        return { summary: { ...summary, data: JSON.parse(summary.data as string) } }
      } catch {
        return { summary }
      }
    }

    // No saved summary - generate from tasks + habits
    const weekStart = resource_id
    const weekEnd = new Date(new Date(weekStart).getTime() + 6 * 86400000).toISOString().slice(0, 10)

    const { results: tasks } = await env.DB.prepare(`
      SELECT name, status, task_type, priority, deadline
      FROM tasks WHERE user_id = ?
        AND status IN ('进行中', '已完成', '待开始', '已放弃')
        AND COALESCE(start_date, deadline) <= ? AND COALESCE(deadline, start_date) >= ?
      ORDER BY status, priority DESC
    `).bind(link.user_id, weekEnd, weekStart).all()

    const completed = (tasks as any[]).filter((t: any) => t.status === '已完成')
    const inProgress = (tasks as any[]).filter((t: any) => t.status === '进行中')

    // Get habit stats for the week
    const { results: habits } = await env.DB.prepare(
      "SELECT id, name FROM habits WHERE user_id = ? AND status = '生效'"
    ).bind(link.user_id).all()

    const { results: logs } = await env.DB.prepare(
      `SELECT habit_id, log_date, completed FROM daily_logs WHERE user_id = ? AND log_date >= ? AND log_date <= ? AND completed = 1`
    ).bind(link.user_id, weekStart, weekEnd).all()

    const habitNames = (habits as any[]).map((h: any) => h.name)
    const totalChecks = (habits as any[]).length * 7
    const completedChecks = (logs as any[]).length

    return {
      summary: {
        week_start: weekStart,
        week_end: weekEnd,
        data: {
          goals: (tasks as any[]).map((t: any) => ({ task: t.name, status: t.status, type: t.task_type || '任务' })),
          habits: {
            habit_items: habitNames,
            statistics: { total: totalChecks, completed: completedChecks }
          },
          stats: {
            completed: completed.length,
            in_progress: inProgress.length,
            total: (tasks as any[]).length
          }
        }
      }
    }
  }

  if (resource_type === 'habit_dashboard') {
    // Return habits overview
    const { results: habits } = await env.DB.prepare(`
      SELECT id, name, frequency, status, monthly_target
      FROM habits WHERE user_id = ? AND status = '生效'
    `).bind(link.user_id).all()

    // Get recent logs
    const { results: recentLogs } = await env.DB.prepare(`
      SELECT habit_id, log_date, completed
      FROM daily_logs
      WHERE user_id = ? AND log_date >= date('now', '-30 days')
      ORDER BY log_date DESC LIMIT 100
    `).bind(link.user_id).all()

    return { habits, recentLogs }
  }

  if (resource_type === 'board') {
    // Return task board overview
    const { results: tasks } = await env.DB.prepare(`
      SELECT name, status, priority, task_type, deadline
      FROM tasks WHERE user_id = ? AND status IN ('进行中', '待开始')
      ORDER BY priority, deadline LIMIT 30
    `).bind(link.user_id).all()

    return { tasks }
  }

  return { message: '资源数据不可用' }
}

export default share

// =============================================
// Personal Workbench - Cloudflare Worker Entry
// Hono framework + JWT auth + D1 database
// =============================================

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Bindings } from './types'
import { authMiddleware } from './middleware/auth'
import { handleScheduled } from './cron'

// Route modules
import authRoutes from './routes/auth'
import tasksRoutes from './routes/tasks'
import dbRoutes from './routes/db'
import habitsRoutes from './routes/habits'
import dailyLogsRoutes from './routes/daily-logs'
import statsRoutes from './routes/stats'
import weeklyRoutes from './routes/weekly'
import configRoutes from './routes/config'
import uploadRoutes from './routes/upload'
import notifyRoutes from './routes/notify'
import aiRoutes from './routes/ai'
import shareRoutes from './routes/share'
import notificationCenterRoutes from './routes/notification-center'

const app = new Hono<{ Bindings: Bindings }>()

// --- Global Middleware ---
app.use('/api/*', cors({ origin: '*' }))

// --- Health Check (no auth) ---
app.get('/api/health', (c) => {
  return c.json({
    success: true,
    data: { status: 'ok', service: 'Personal Workbench', version: '2.1.0' }
  })
})

// --- Mount Route Modules ---
app.route('/api/auth', authRoutes)
app.route('/api/tasks', tasksRoutes)
app.route('/api/db', dbRoutes)
app.route('/api/habits', habitsRoutes)
app.route('/api/daily-logs', dailyLogsRoutes)
app.route('/api/stats', statsRoutes)
app.route('/api/weekly-summary', weeklyRoutes)
app.route('/api/config', configRoutes)
app.route('/api/upload', uploadRoutes)
app.route('/api/notify', notifyRoutes)
app.route('/api/ai', aiRoutes)
app.route('/api/share', shareRoutes)
app.route('/api/notification-center', notificationCenterRoutes)

// --- Standalone endpoints (path doesn't fit module prefix) ---

// GET /api/users - User list for assignee dropdown
app.get('/api/users', authMiddleware, async (c) => {
  const users = await c.env.DB.prepare(
    'SELECT id, username, display_name, role FROM users'
  ).all()
  return c.json({
    success: true,
    data: (users.results as any[]).map(u => ({
      id: u.id, username: u.username, displayName: u.display_name, role: u.role
    })),
    count: users.results.length
  })
})

// GET /api/data - Combined dashboard data (tasks + stats)
app.get('/api/data', authMiddleware, async (c) => {
  const user = c.get('user')
  const [tasksRes, statsRes, childrenRes] = await c.env.DB.batch([
    c.env.DB.prepare(
      'SELECT id, name, status, assignee, priority, task_type, parent_id, start_date, deadline, completed_time, email, unique_id, created_at, updated_at FROM tasks WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(user.userId),
    c.env.DB.prepare(`
      SELECT COUNT(*) as total,
        SUM(CASE WHEN status = '已完成' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = '进行中' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = '待开始' THEN 1 ELSE 0 END) as inbox
      FROM tasks WHERE user_id = ?
    `).bind(user.userId),
    c.env.DB.prepare(
      'SELECT id, parent_id FROM tasks WHERE user_id = ? AND parent_id IS NOT NULL'
    ).bind(user.userId),
  ])

  const stats = (statsRes as any).results?.[0] || {}
  const childrenMap: Record<string, string[]> = {}
  for (const row of (childrenRes.results || []) as any[]) {
    if (!childrenMap[row.parent_id]) childrenMap[row.parent_id] = []
    childrenMap[row.parent_id].push(row.id)
  }

  const tasks = (tasksRes.results || [] as any[]).map((t: any) => ({
    id: t.id, name: t.name, status: t.status, assignee: t.assignee,
    priority: t.priority, task_type: t.task_type,
    parent_ids: t.parent_id ? [t.parent_id] : [],
    child_ids: childrenMap[t.id] || [], blocked_by_ids: [],
    start_date: t.start_date, deadline: t.deadline, completed_time: t.completed_time,
    email: t.email, unique_id: t.unique_id, notes: undefined,
    created_time: t.created_at, last_edited_time: t.updated_at, url: null, images: []
  }))

  return c.json({
    success: true,
    data: {
      tasks,
      stats: {
        distribution: {
          total: stats?.total || 0,
          by_status: { '已完成': stats?.completed || 0, '进行中': stats?.in_progress || 0, '待开始': stats?.inbox || 0 },
          by_priority: {}, by_type: {}, by_assignee: {}
        }
      }
    }
  })
})

// --- Export for Workers + Pages Functions ---
export default {
  fetch: (request: Request, env: any, ctx: any) => app.fetch(request, env, ctx),
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    await handleScheduled(event, env)
  }
}

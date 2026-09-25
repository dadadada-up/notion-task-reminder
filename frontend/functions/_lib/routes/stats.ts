// =============================================
// Stats Route - Combined task + habit statistics
// =============================================

import { Hono } from 'hono'
import type { Bindings } from '../types'
import { authMiddleware } from '../middleware/auth'

const stats = new Hono<{ Bindings: Bindings }>()

stats.use('*', authMiddleware)

// GET /stats - Combined statistics
stats.get('/', async (c) => {
  const user = c.get('user')

  // --- Task Stats ---
  const taskTotal = await c.env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM tasks WHERE user_id = ?'
  ).bind(user.userId).first<{ cnt: number }>()

  const taskByStatus = await c.env.DB.prepare(`
    SELECT status, COUNT(*) as cnt FROM tasks WHERE user_id = ? GROUP BY status
  `).bind(user.userId).all()

  const taskByPriority = await c.env.DB.prepare(`
    SELECT priority, COUNT(*) as cnt FROM tasks WHERE user_id = ? GROUP BY priority
  `).bind(user.userId).all()

  const taskByType = await c.env.DB.prepare(`
    SELECT task_type, COUNT(*) as cnt FROM tasks WHERE user_id = ? GROUP BY task_type
  `).bind(user.userId).all()

  const taskByAssignee = await c.env.DB.prepare(`
    SELECT assignee, COUNT(*) as cnt FROM tasks WHERE user_id = ? GROUP BY assignee
  `).bind(user.userId).all()

  const total = taskTotal?.cnt ?? 0
  const statusMap: Record<string, number> = {}
  taskByStatus.results.forEach((r: any) => { statusMap[r.status] = r.cnt })

  const priorityMap: Record<string, number> = {}
  taskByPriority.results.forEach((r: any) => { priorityMap[r.priority] = r.cnt })

  const typeMap: Record<string, number> = {}
  taskByType.results.forEach((r: any) => { typeMap[r.task_type] = r.cnt })

  const assigneeMap: Record<string, number> = {}
  taskByAssignee.results.forEach((r: any) => { assigneeMap[r.assignee] = r.cnt })

  const taskStats = {
    distribution: {
      total,
      by_status: statusMap,
      by_priority: priorityMap,
      by_type: typeMap,
      by_assignee: assigneeMap
    }
  }

  // --- Habit Stats ---
  const today = new Date().toISOString().slice(0, 10)
  const now = new Date()

  const activeHabits = await c.env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM habits WHERE user_id = ? AND status = '生效'"
  ).bind(user.userId).first<{ cnt: number }>()
  const totalActive = activeHabits?.cnt ?? 0

  const todayCompleted = await c.env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM daily_logs WHERE user_id = ? AND log_date = ? AND completed = 1'
  ).bind(user.userId, today).first<{ cnt: number }>()

  // Week
  const dayOfWeek = now.getDay() || 7
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - dayOfWeek + 1)
  const weekStartStr = weekStart.toISOString().slice(0, 10)
  const weekEndStr = new Date(weekStart.getTime() + 6 * 86400000).toISOString().slice(0, 10)

  const weekCompleted = await c.env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM daily_logs WHERE user_id = ? AND completed = 1 AND log_date >= ? AND log_date <= ?'
  ).bind(user.userId, weekStartStr, weekEndStr).first<{ cnt: number }>()

  // Month
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`
  const monthCompleted = await c.env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM daily_logs WHERE user_id = ? AND completed = 1 AND log_date >= ? AND log_date <= ?'
  ).bind(user.userId, monthStart, monthEnd).first<{ cnt: number }>()

  const habitStats = {
    today: {
      total: totalActive,
      completed: todayCompleted?.cnt ?? 0,
      remaining: totalActive - (todayCompleted?.cnt ?? 0),
      completion_rate: totalActive > 0 ? Math.round(((todayCompleted?.cnt ?? 0) / totalActive) * 100) : 0
    },
    week: {
      completed: weekCompleted?.cnt ?? 0,
      target: totalActive * 7,
      remaining: (totalActive * 7) - (weekCompleted?.cnt ?? 0),
      completion_rate: totalActive * 7 > 0 ? Math.round(((weekCompleted?.cnt ?? 0) / (totalActive * 7)) * 100) : 0,
      longest_streak: 0
    },
    month: {
      completed: monthCompleted?.cnt ?? 0,
      target: totalActive * 30,
      completion_rate: totalActive * 30 > 0 ? Math.round(((monthCompleted?.cnt ?? 0) / (totalActive * 30)) * 100) : 0
    },
    habits: []
  }

  return c.json({
    success: true,
    data: {
      tasks: taskStats,
      habits: habitStats
    }
  })
})

// POST /stats/auto-transition - Auto transition tasks based on dates
stats.post('/auto-transition', async (c) => {
  const user = c.get('user')
  const today = new Date().toISOString().slice(0, 10)

  // Transition: 待开始 -> 进行中 if start_date <= today
  const toProgress = await c.env.DB.prepare(`
    UPDATE tasks SET status = '进行中', updated_at = ?
    WHERE user_id = ? AND status = '待开始' AND start_date IS NOT NULL AND start_date <= ?
  `).bind(new Date().toISOString(), user.userId, today).run()

  // Transition: 进行中 -> 已完成 if completed_time is set
  // (This is handled by the task update endpoint)

  const changes = (toProgress as any).changes ?? 0

  return c.json({
    success: true,
    data: {
      total_checked: 0,
      transitioned: changes,
      tasks: [],
      timestamp: new Date().toISOString()
    },
    message: `Auto-transitioned ${changes} tasks`
  })
})

export default stats

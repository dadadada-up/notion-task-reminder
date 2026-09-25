// =============================================
// Habits Routes - CRUD + stats
// =============================================

import { Hono } from 'hono'
import type { Bindings } from '../types'
import { authMiddleware } from '../middleware/auth'
import { generateId } from '../utils/crypto'

const habits = new Hono<{ Bindings: Bindings }>()

// All routes require auth
habits.use('*', authMiddleware)

// GET /habits - List habits
habits.get('/', async (c) => {
  const user = c.get('user')
  const status = c.req.query('status')

  let sql = 'SELECT * FROM habits WHERE user_id = ?'
  const params: any[] = [user.userId]
  if (status) { sql += ' AND status = ?'; params.push(status) }
  sql += ' ORDER BY created_at DESC'

  const { results } = await c.env.DB.prepare(sql).bind(...params).all()

  if (results.length === 0) {
    return c.json({ success: true, data: [], count: 0 })
  }

  // Batch: all log stats in 3 queries using subquery (avoid D1 param limit)
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`
  const userHabitsSub = `(SELECT id FROM habits WHERE user_id = ?)`

  const [logsRes, monthlyRes, totalRes] = await c.env.DB.batch([
    c.env.DB.prepare(
      `SELECT id, habit_id FROM daily_logs WHERE habit_id IN ${userHabitsSub}`
    ).bind(user.userId),
    c.env.DB.prepare(
      `SELECT habit_id, COUNT(*) as cnt FROM daily_logs WHERE habit_id IN ${userHabitsSub} AND completed = 1 AND log_date >= ? AND log_date <= ? GROUP BY habit_id`
    ).bind(user.userId, monthStart, monthEnd),
    c.env.DB.prepare(
      `SELECT habit_id, COUNT(*) as cnt FROM daily_logs WHERE habit_id IN ${userHabitsSub} AND completed = 1 GROUP BY habit_id`
    ).bind(user.userId),
  ])

  // Build lookup maps
  const logsByHabit: Record<string, string[]> = {}
  ;(logsRes as any).results.forEach((l: any) => {
    if (!logsByHabit[l.habit_id]) logsByHabit[l.habit_id] = []
    logsByHabit[l.habit_id].push(l.id)
  })

  const monthlyByHabit: Record<string, number> = {}
  ;(monthlyRes as any).results.forEach((r: any) => { monthlyByHabit[r.habit_id] = r.cnt })

  const totalByHabit: Record<string, number> = {}
  ;(totalRes as any).results.forEach((r: any) => { totalByHabit[r.habit_id] = r.cnt })

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

  const enriched = results.map((h: any) => {
    const monthlyCompleted = monthlyByHabit[h.id] ?? 0
    const monthlyTarget = h.monthly_target || daysInMonth
    const monthlyRate = monthlyTarget > 0 ? `${Math.round((monthlyCompleted / monthlyTarget) * 100)}%` : '0%'

    return {
      id: h.id,
      name: h.name,
      frequency: h.frequency,
      status: h.status,
      weekly_target: h.weekly_target,
      monthly_target: h.monthly_target,
      start_date: h.start_date,
      end_date: h.end_date,
      phase: h.phase,
      notes: h.notes,
      daily_log_ids: logsByHabit[h.id] || [],
      monthly_completed: monthlyCompleted,
      monthly_rate: monthlyRate,
      total_completed: totalByHabit[h.id] ?? 0,
      created_time: h.created_at,
      last_edited_time: h.updated_at,
      url: null
    }
  })

  return c.json({ success: true, data: enriched, count: enriched.length })
})

// GET /habits/stats - Habit statistics
habits.get('/stats', async (c) => {
  const user = c.get('user')
  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  const dayOfWeek = now.getDay() || 7
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - dayOfWeek + 1)
  const weekStartStr = weekStart.toISOString().slice(0, 10)
  const weekEndStr = new Date(weekStart.getTime() + 6 * 86400000).toISOString().slice(0, 10)
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

  // Single batch: all stats in one round-trip
  const [activeRes, todayRes, weekRes, monthRes, perHabitTotalRes, perHabitMonthRes] = await c.env.DB.batch([
    c.env.DB.prepare(
      "SELECT id, name FROM habits WHERE user_id = ? AND status = '生效'"
    ).bind(user.userId),
    c.env.DB.prepare(
      'SELECT COUNT(*) as cnt FROM daily_logs WHERE user_id = ? AND log_date = ? AND completed = 1'
    ).bind(user.userId, today),
    c.env.DB.prepare(
      'SELECT COUNT(*) as cnt FROM daily_logs WHERE user_id = ? AND completed = 1 AND log_date >= ? AND log_date <= ?'
    ).bind(user.userId, weekStartStr, weekEndStr),
    c.env.DB.prepare(
      'SELECT COUNT(*) as cnt FROM daily_logs WHERE user_id = ? AND completed = 1 AND log_date >= ? AND log_date <= ?'
    ).bind(user.userId, monthStart, monthEnd),
    c.env.DB.prepare(
      'SELECT habit_id, COUNT(*) as cnt FROM daily_logs WHERE user_id = ? AND completed = 1 GROUP BY habit_id'
    ).bind(user.userId),
    c.env.DB.prepare(
      'SELECT habit_id, COUNT(*) as cnt FROM daily_logs WHERE user_id = ? AND completed = 1 AND log_date >= ? AND log_date <= ? GROUP BY habit_id'
    ).bind(user.userId, monthStart, monthEnd),
  ])

  const activeHabits = (activeRes as any).results || []
  const totalActive = activeHabits.length
  // D1 batch returns { results: [...] } for all statements, including aggregates
  const completed = (todayRes as any).results?.[0]?.cnt ?? 0
  const weekCompleted = (weekRes as any).results?.[0]?.cnt ?? 0
  const monthCompleted = (monthRes as any).results?.[0]?.cnt ?? 0

  // Build per-habit lookup maps
  const totalByHabit: Record<string, number> = {}
  ;((perHabitTotalRes as any).results || []).forEach((r: any) => { totalByHabit[r.habit_id] = r.cnt })
  const monthByHabit: Record<string, number> = {}
  ;((perHabitMonthRes as any).results || []).forEach((r: any) => { monthByHabit[r.habit_id] = r.cnt })

  // Calculate current streak for each habit (consecutive days with completed=1 ending today/yesterday)
  const streakByHabit: Record<string, number> = {}
  for (const h of activeHabits as any[]) {
    streakByHabit[h.id] = 0
  }
  // Fetch recent 60 days of logs for streak calculation
  const streakStart = new Date(now.getTime() - 60 * 86400000).toISOString().slice(0, 10)
  try {
    const { results: recentLogs } = await c.env.DB.prepare(
      `SELECT habit_id, log_date, completed FROM daily_logs WHERE user_id = ? AND log_date >= ? AND completed = 1 ORDER BY log_date DESC`
    ).bind(user.userId, streakStart).all()
    
    // Group by habit
    const logsByHabit: Record<string, string[]> = {}
    for (const log of recentLogs as any[]) {
      if (!logsByHabit[log.habit_id]) logsByHabit[log.habit_id] = []
      logsByHabit[log.habit_id].push(log.log_date)
    }
    
    // Calculate streak: consecutive days ending at today or yesterday
    for (const h of activeHabits as any[]) {
      const dates = new Set(logsByHabit[h.id] || [])
      let streak = 0
      // Start from today; if today not completed, start from yesterday
      let checkDate = new Date(now)
      if (!dates.has(checkDate.toISOString().slice(0, 10))) {
        checkDate = new Date(now.getTime() - 86400000)
      }
      while (dates.has(checkDate.toISOString().slice(0, 10))) {
        streak++
        checkDate = new Date(checkDate.getTime() - 86400000)
      }
      streakByHabit[h.id] = streak
    }
  } catch { /* streak is best-effort */ }

  const habitStats = (activeHabits as any[]).map((h: any) => {
    const monthlyCompleted = monthByHabit[h.id] ?? 0
    const monthlyTarget = daysInMonth
    const completionRate = monthlyTarget > 0 ? Math.round((monthlyCompleted / monthlyTarget) * 100) : 0

    return {
      habit_id: h.id,
      habit_name: h.name,
      frequency: '每日',
      monthly_completed: monthlyCompleted,
      monthly_target: monthlyTarget,
      completion_rate: completionRate,
      current_streak: streakByHabit[h.id] ?? 0,
      total_completed: totalByHabit[h.id] ?? 0
    }
  }).sort((a: any, b: any) => b.completion_rate - a.completion_rate)

  // Longest streak across all habits
  const longestStreak = Math.max(0, ...Object.values(streakByHabit))

  return c.json({
    success: true,
    data: {
      today: {
        total: totalActive,
        completed,
        remaining: totalActive - completed,
        completion_rate: totalActive > 0 ? Math.round((completed / totalActive) * 100) : 0
      },
      week: {
        completed: weekCompleted,
        target: totalActive * 7,
        remaining: (totalActive * 7) - weekCompleted,
        completion_rate: totalActive * 7 > 0 ? Math.round((weekCompleted / (totalActive * 7)) * 100) : 0,
        longest_streak: longestStreak
      },
      month: {
        completed: monthCompleted,
        target: totalActive * daysInMonth,
        completion_rate: totalActive * daysInMonth > 0 ? Math.round((monthCompleted / (totalActive * daysInMonth)) * 100) : 0
      },
      habits: habitStats
    }
  })
})

// GET /habits/:id - Get single habit
habits.get('/:id', async (c) => {
  const id = c.req.param('id')
  const habit = await c.env.DB.prepare('SELECT * FROM habits WHERE id = ?').bind(id).first()

  if (!habit) return c.json({ success: false, error: 'Habit not found' }, 404)

  return c.json({ success: true, data: habit })
})

// POST /habits - Create habit
habits.post('/', async (c) => {
  const user = c.get('user')
  const data = await c.req.json()

  const id = generateId()
  await c.env.DB.prepare(`
    INSERT INTO habits (id, user_id, name, frequency, status, weekly_target, monthly_target, start_date, end_date, phase, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, user.userId,
    data.name || '未命名习惯',
    data.frequency || '每日',
    data.status || '生效',
    data.weekly_target ?? null,
    data.monthly_target ?? null,
    data.start_date ?? null,
    data.end_date ?? null,
    data.phase ?? null,
    data.notes ?? null
  ).run()

  const habit = await c.env.DB.prepare('SELECT * FROM habits WHERE id = ?').bind(id).first()
  return c.json({ success: true, data: habit }, 201)
})

// PUT /habits/:id - Update habit
habits.put('/:id', async (c) => {
  const id = c.req.param('id')
  const data = await c.req.json()

  const fields: string[] = []
  const values: any[] = []

  const fieldMap: Record<string, string> = {
    name: 'name', frequency: 'frequency', status: 'status',
    weekly_target: 'weekly_target', monthly_target: 'monthly_target',
    start_date: 'start_date', end_date: 'end_date', phase: 'phase', notes: 'notes'
  }

  for (const [key, col] of Object.entries(fieldMap)) {
    if (data[key] !== undefined) {
      fields.push(`${col} = ?`)
      values.push(data[key])
    }
  }

  fields.push('updated_at = ?')
  values.push(new Date().toISOString())
  values.push(id)

  if (fields.length > 2) {
    await c.env.DB.prepare(`UPDATE habits SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run()
  }

  const habit = await c.env.DB.prepare('SELECT * FROM habits WHERE id = ?').bind(id).first()
  return c.json({ success: true, data: habit })
})

// DELETE /habits/:id - Delete habit (cascade deletes daily_logs)
habits.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const user = c.get('user')

  const habit = await c.env.DB.prepare(
    'SELECT id, name FROM habits WHERE id = ? AND user_id = ?'
  ).bind(id, user.userId).first<{ id: string; name: string }>()

  if (!habit) {
    return c.json({ success: false, error: 'Habit not found' }, 404)
  }

  // Count logs for feedback
  const logCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM daily_logs WHERE habit_id = ?'
  ).bind(id).first<{ cnt: number }>()

  // Delete habit (daily_logs cascade via ON DELETE CASCADE)
  await c.env.DB.prepare('DELETE FROM habits WHERE id = ?').bind(id).run()

  return c.json({
    success: true,
    data: { id, name: habit.name, logs_deleted: logCount?.cnt ?? 0 }
  })
})

export default habits

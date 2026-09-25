// =============================================
// Daily Logs Routes - CRUD + calendar
// =============================================

import { Hono } from 'hono'
import type { Bindings } from '../types'
import { authMiddleware } from '../middleware/auth'
import { generateId } from '../utils/crypto'

const dailyLogs = new Hono<{ Bindings: Bindings }>()

dailyLogs.use('*', authMiddleware)

// GET /daily-logs - List logs with filters
dailyLogs.get('/', async (c) => {
  const user = c.get('user')
  const habitId = c.req.query('habit_id')
  const startDate = c.req.query('start_date')
  const endDate = c.req.query('end_date')
  const completed = c.req.query('completed')

  let sql = 'SELECT * FROM daily_logs WHERE user_id = ?'
  const params: any[] = [user.userId]

  if (habitId) { sql += ' AND habit_id = ?'; params.push(habitId) }
  if (startDate) { sql += ' AND log_date >= ?'; params.push(startDate) }
  if (endDate) { sql += ' AND log_date <= ?'; params.push(endDate) }
  if (completed !== null && completed !== undefined) {
    sql += ' AND completed = ?'
    params.push(completed === 'true' ? 1 : 0)
  }

  sql += ' ORDER BY log_date DESC'

  const { results } = await c.env.DB.prepare(sql).bind(...params).all()

  return c.json({
    success: true,
    data: results.map((log: any) => ({
      id: log.id,
      title: log.title || `${log.log_date}`,
      date: log.log_date,
      habit_ids: [log.habit_id],
      completed: log.completed === 1,
      notes: log.notes,
      weekday: '',
      month: log.log_date?.slice(0, 7) || '',
      created_time: log.created_at,
      last_edited_time: log.updated_at,
      url: null
    })),
    count: results.length
  })
})

// GET /daily-logs/calendar - Calendar view data
dailyLogs.get('/calendar', async (c) => {
  const user = c.get('user')
  const year = c.req.query('year')
  const month = c.req.query('month')

  const now = new Date()
  const y = year ? parseInt(year) : now.getFullYear()
  const m = month ? parseInt(month) : now.getMonth() + 1

  const startDate = `${y}-${String(m).padStart(2, '0')}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { results } = await c.env.DB.prepare(
    'SELECT * FROM daily_logs WHERE user_id = ? AND log_date >= ? AND log_date <= ? ORDER BY log_date'
  ).bind(user.userId, startDate, endDate).all()

  return c.json({
    success: true,
    data: results.map((log: any) => ({
      id: log.id,
      date: log.log_date,
      habit_id: log.habit_id,
      completed: log.completed === 1,
      notes: log.notes
    }))
  })
})

// POST /daily-logs - Create log
dailyLogs.post('/', async (c) => {
  const user = c.get('user')
  const data = await c.req.json()

  const id = generateId()
  const logDate = data.date || new Date().toISOString().slice(0, 10)
  const habitId = data.habit_id

  if (!habitId) {
    return c.json({ success: false, error: 'habit_id is required' }, 400)
  }

  // Check for duplicate (same habit + date)
  const existing = await c.env.DB.prepare(
    'SELECT id FROM daily_logs WHERE habit_id = ? AND log_date = ?'
  ).bind(habitId, logDate).first()

  if (existing) {
    // Update existing
    await c.env.DB.prepare(
      'UPDATE daily_logs SET completed = ?, notes = ?, updated_at = ? WHERE id = ?'
    ).bind(data.completed ? 1 : 0, data.notes ?? null, new Date().toISOString(), existing.id).run()

    const log = await c.env.DB.prepare('SELECT * FROM daily_logs WHERE id = ?').bind(existing.id).first()
    return c.json({ success: true, data: formatLog(log) })
  }

  await c.env.DB.prepare(`
    INSERT INTO daily_logs (id, habit_id, user_id, title, log_date, completed, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, habitId, user.userId,
    `${logDate}`, logDate,
    data.completed ? 1 : 0,
    data.notes ?? null
  ).run()

  const log = await c.env.DB.prepare('SELECT * FROM daily_logs WHERE id = ?').bind(id).first()
  return c.json({ success: true, data: formatLog(log) }, 201)
})

// PUT /daily-logs/:id - Update log
dailyLogs.put('/:id', async (c) => {
  const id = c.req.param('id')
  const data = await c.req.json()

  const fields: string[] = []
  const values: any[] = []

  if (data.completed !== undefined) { fields.push('completed = ?'); values.push(data.completed ? 1 : 0) }
  if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes) }
  if (data.date !== undefined) { fields.push('log_date = ?'); values.push(data.date) }

  fields.push('updated_at = ?')
  values.push(new Date().toISOString())
  values.push(id)

  await c.env.DB.prepare(`UPDATE daily_logs SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run()

  const log = await c.env.DB.prepare('SELECT * FROM daily_logs WHERE id = ?').bind(id).first()
  return c.json({ success: true, data: formatLog(log) })
})

function formatLog(log: any) {
  if (!log) return null
  return {
    id: log.id,
    title: log.title || `${log.log_date}`,
    date: log.log_date,
    habit_ids: [log.habit_id],
    completed: log.completed === 1,
    notes: log.notes,
    weekday: '',
    month: log.log_date?.slice(0, 7) || '',
    created_time: log.created_at,
    last_edited_time: log.updated_at,
    url: null
  }
}

export default dailyLogs

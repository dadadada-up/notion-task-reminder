// =============================================
// Config & Schedule Routes
// =============================================

import { Hono } from 'hono'
import type { Bindings } from '../types'
import { authMiddleware } from '../middleware/auth'

const config = new Hono<{ Bindings: Bindings }>()

config.use('*', authMiddleware)

// GET /config - Get app config
config.get('/', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT key, value FROM app_config').all()

  const configMap: Record<string, any> = {}
  results.forEach((r: any) => {
    try { configMap[r.key] = JSON.parse(r.value) } catch { configMap[r.key] = r.value }
  })

  return c.json({ success: true, data: configMap })
})

// PUT /config - Update app config
config.put('/', async (c) => {
  const data = await c.req.json()
  const now = new Date().toISOString()

  for (const [key, value] of Object.entries(data)) {
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value)
    await c.env.DB.prepare(`
      INSERT INTO app_config (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
    `).bind(key, valueStr, now, valueStr, now).run()
  }

  return c.json({ success: true, message: 'Config updated' })
})

// GET /schedule - Get notification schedules
config.get('/schedule', async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT key, value FROM app_config WHERE key LIKE 'schedule_%'"
  ).all()

  const schedules = results.map((r: any) => {
    try { return JSON.parse(r.value) } catch { return { key: r.key, value: r.value } }
  })

  return c.json({ success: true, data: schedules })
})

// POST /schedule - Save notification schedules
config.post('/schedule', async (c) => {
  const { schedules } = await c.req.json()
  const now = new Date().toISOString()

  // Clear old schedules
  await c.env.DB.prepare("DELETE FROM app_config WHERE key LIKE 'schedule_%'").run()

  // Save new ones
  if (Array.isArray(schedules)) {
    for (let i = 0; i < schedules.length; i++) {
      const key = `schedule_${i}`
      await c.env.DB.prepare(
        'INSERT INTO app_config (key, value, updated_at) VALUES (?, ?, ?)'
      ).bind(key, JSON.stringify(schedules[i]), now).run()
    }
  }

  return c.json({ success: true, message: 'Schedules saved' })
})

export default config

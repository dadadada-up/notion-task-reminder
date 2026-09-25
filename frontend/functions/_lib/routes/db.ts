// =============================================
// DB Management Routes (owner only)
// Read-only SQL execution + table listing
// =============================================

import { Hono } from 'hono'
import type { Bindings } from '../types'
import { authMiddleware } from '../middleware/auth'

const db = new Hono<{ Bindings: Bindings }>()

// All routes require auth + owner role
db.use('*', authMiddleware)

// Known tables in the database (D1 restricts sqlite_master access)
const KNOWN_TABLES = [
  'users', 'tasks', 'task_dependencies', 'task_images',
  'habits', 'daily_logs', 'weekly_summaries', 'share_links',
  'activity_logs', 'app_config'
]

// GET /db/tables - List all tables with row counts
db.get('/tables', async (c) => {
  try {
    const user = c.get('user')
    if (!user || user.role !== 'owner') {
      return c.json({ success: false, error: 'Owner access required' }, 403)
    }

    // Use DB.batch() for single round-trip (eliminate N+1)
    const batchResults = await c.env.DB.batch(
      KNOWN_TABLES.map(name => c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM "${name}"`))
    )
    const tables = KNOWN_TABLES.map((name, i) => ({
      name,
      row_count: (batchResults[i] as any)?.results?.[0]?.cnt ?? -1
    }))

    return c.json({ success: true, data: tables.filter(t => t.row_count >= 0) })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to fetch tables' }, 500)
  }
})

// POST /db/query - Execute read-only SQL query
db.post('/query', async (c) => {
  try {
    const user = c.get('user')
    if (!user || user.role !== 'owner') {
      return c.json({ success: false, error: 'Owner access required' }, 403)
    }

    const { sql } = await c.req.json()
    if (!sql || typeof sql !== 'string') {
      return c.json({ success: false, error: 'SQL string is required' }, 400)
    }

    // Safety: whitelist approach - only allow SELECT/WITH queries
    const upper = sql.toUpperCase().trim()
    // Strip leading comments (/* ... */ and -- ...)
    const stripped = upper.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '').trim()
    if (!stripped.startsWith('SELECT') && !stripped.startsWith('WITH')) {
      return c.json({ success: false, error: 'Only SELECT and WITH queries are allowed (read-only mode)' }, 403)
    }
    // Block multiple statements (semicolons followed by non-whitespace)
    if (/;\s*\S/.test(stripped)) {
      return c.json({ success: false, error: 'Multiple statements are not allowed' }, 403)
    }

    const start = Date.now()
    const { results } = await c.env.DB.prepare(sql).all()
    const elapsed = Date.now() - start
    return c.json({
      success: true,
      data: {
        rows: results,
        columns: results.length > 0 ? Object.keys(results[0] as any) : [],
        row_count: results.length,
        elapsed_ms: elapsed
      }
    })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Query failed' }, 400)
  }
})

export default db

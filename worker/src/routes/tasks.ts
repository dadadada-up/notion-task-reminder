// =============================================
// Tasks Routes - CRUD + auto-transition + combined data
// =============================================

import { Hono } from 'hono'
import type { Bindings } from '../types'
import { authMiddleware } from '../middleware/auth'
import { generateId } from '../utils/crypto'
import { getBeijingToday, nowISO } from '../utils/date'

const tasks = new Hono<{ Bindings: Bindings }>()

// All routes require auth
tasks.use('*', authMiddleware)

// GET /tasks - List tasks with filters
tasks.get('/', async (c) => {
  const user = c.get('user')
  const status = c.req.query('status')
  const assignee = c.req.query('assignee')
  const priority = c.req.query('priority')
  const taskType = c.req.query('type')

  let sql = 'SELECT * FROM tasks WHERE user_id = ?'
  const params: any[] = [user.userId]

  if (status) { sql += ' AND status = ?'; params.push(status) }
  if (assignee) { sql += ' AND assignee = ?'; params.push(assignee) }
  if (priority) { sql += ' AND priority = ?'; params.push(priority) }
  if (taskType) { sql += ' AND task_type = ?'; params.push(taskType) }

  sql += ' ORDER BY created_at DESC'

  const { results } = await c.env.DB.prepare(sql).bind(...params).all()

  if (results.length === 0) {
    return c.json({ success: true, data: [], count: 0 })
  }

  // Batch-fetch children, dependencies, images (eliminate N+1)
  // Use subquery instead of IN(...) to avoid D1's 100 bound-parameter limit
  const userSubQuery = `(SELECT id FROM tasks WHERE user_id = ?)`

  let childrenMap: Record<string, string[]> = {}
  let blockedMap: Record<string, string[]> = {}
  let imagesMap: Record<string, any[]> = {}

  try {
    const [childrenRes, blockedRes, imagesRes] = await c.env.DB.batch([
      c.env.DB.prepare(`SELECT id, parent_id FROM tasks WHERE parent_id IN ${userSubQuery}`).bind(user.userId),
      c.env.DB.prepare(`SELECT task_id, blocked_by_id FROM task_dependencies WHERE task_id IN ${userSubQuery}`).bind(user.userId),
      c.env.DB.prepare(`SELECT task_id, id, name, url FROM task_images WHERE task_id IN ${userSubQuery}`).bind(user.userId),
    ])

    for (const row of (childrenRes.results || []) as any[]) {
      if (!childrenMap[row.parent_id]) childrenMap[row.parent_id] = []
      childrenMap[row.parent_id].push(row.id)
    }
    for (const row of (blockedRes.results || []) as any[]) {
      if (!blockedMap[row.task_id]) blockedMap[row.task_id] = []
      blockedMap[row.task_id].push(row.blocked_by_id)
    }
    for (const row of (imagesRes.results || []) as any[]) {
      if (!imagesMap[row.task_id]) imagesMap[row.task_id] = []
      imagesMap[row.task_id].push({ name: row.name, url: row.url, type: 'file_upload' })
    }
  } catch (batchErr) {
    console.error('Batch fetch failed, using fallback:', batchErr)
    try {
      const { results: childRows } = await c.env.DB.prepare(
        `SELECT id, parent_id FROM tasks WHERE parent_id IN ${userSubQuery}`
      ).bind(user.userId).all()
      for (const row of childRows as any[]) {
        if (!childrenMap[row.parent_id]) childrenMap[row.parent_id] = []
        childrenMap[row.parent_id].push(row.id)
      }
    } catch { /* silent */ }
  }

  const taskList = (results as any[]).map((task) => ({
    id: task.id,
    name: task.name,
    status: task.status,
    assignee: task.assignee,
    priority: task.priority,
    task_type: task.task_type,
    parent_ids: task.parent_id ? [task.parent_id] : [],
    child_ids: childrenMap[task.id] || [],
    blocked_by_ids: blockedMap[task.id] || [],
    start_date: task.start_date,
    deadline: task.deadline,
    completed_time: task.completed_time,
    email: task.email,
    unique_id: task.unique_id,
    notes: task.notes,
    created_time: task.created_at,
    last_edited_time: task.updated_at,
    url: null,
    images: imagesMap[task.id] || []
  }))

  return c.json({ success: true, data: taskList, count: taskList.length })
})

// POST /tasks - Create task
tasks.post('/', async (c) => {
  const user = c.get('user')
  const data = await c.req.json()

  const id = generateId()
  const parentId = data.parent_ids && data.parent_ids.length > 0 ? data.parent_ids[0] : null
  const now = nowISO()

  // Batch all INSERTs in one round-trip
  const stmts = [
    c.env.DB.prepare(`
      INSERT INTO tasks (id, user_id, name, status, assignee, priority, task_type, parent_id, start_date, deadline, email, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, user.userId, data.name || '未命名任务',
      data.status || '待开始', data.assignee || 'dada',
      data.priority || 'P3 不重要不紧急', data.task_type || '未分类',
      parentId, data.start_date || null, data.deadline || null,
      data.email || null, data.notes || null
    )
  ]

  if (data.blocked_by_ids && data.blocked_by_ids.length > 0) {
    for (const blockedId of data.blocked_by_ids) {
      stmts.push(c.env.DB.prepare(
        'INSERT INTO task_dependencies (task_id, blocked_by_id) VALUES (?, ?)'
      ).bind(id, blockedId))
    }
  }

  const imageIds: string[] = []
  if (data.images && data.images.length > 0) {
    for (const img of data.images) {
      const imgId = generateId()
      imageIds.push(imgId)
      stmts.push(c.env.DB.prepare(
        'INSERT INTO task_images (id, task_id, name, url, r2_key) VALUES (?, ?, ?, ?, ?)'
      ).bind(imgId, id, img.name || 'image', img.url || '', img.r2_key || null))
    }
  }

  await c.env.DB.batch(stmts)

  // Return fully-formed task object (no extra SELECT needed)
  const task = {
    id,
    name: data.name || '未命名任务',
    status: data.status || '待开始',
    assignee: data.assignee || 'dada',
    priority: data.priority || 'P3 不重要不紧急',
    task_type: data.task_type || '未分类',
    parent_ids: parentId ? [parentId] : [],
    child_ids: [],
    blocked_by_ids: data.blocked_by_ids || [],
    start_date: data.start_date || null,
    deadline: data.deadline || null,
    completed_time: null,
    email: data.email || null,
    unique_id: null,
    notes: data.notes || null,
    created_time: now,
    last_edited_time: now,
    url: null,
    images: (data.images || []).map((img: any, i: number) => ({
      id: imageIds[i], name: img.name || 'image', url: img.url || '', type: 'file_upload'
    }))
  }

  return c.json({ success: true, data: task }, 201)
})

// PUT /tasks/:id - Update task
tasks.put('/:id', async (c) => {
  const id = c.req.param('id')
  const data = await c.req.json()

  const fields: string[] = []
  const values: any[] = []

  const fieldMap: Record<string, string> = {
    name: 'name', status: 'status', assignee: 'assignee',
    priority: 'priority', task_type: 'task_type', start_date: 'start_date',
    deadline: 'deadline', completed_time: 'completed_time', email: 'email', notes: 'notes'
  }

  for (const [key, col] of Object.entries(fieldMap)) {
    if (data[key] !== undefined) {
      fields.push(`${col} = ?`)
      values.push(data[key])
    }
  }

  if (data.parent_ids !== undefined) {
    fields.push('parent_id = ?')
    values.push(data.parent_ids.length > 0 ? data.parent_ids[0] : null)
  }

  fields.push('updated_at = ?')
  values.push(nowISO())
  values.push(id)

  if (fields.length > 2) {
    await c.env.DB.prepare(
      `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`
    ).bind(...values).run()
  }

  // Return updated task with full shape
  const row = await c.env.DB.prepare(
    'SELECT id, name, status, assignee, priority, task_type, parent_id, start_date, deadline, completed_time, email, unique_id, notes, created_at, updated_at FROM tasks WHERE id = ?'
  ).bind(id).first() as any

  if (!row) return c.json({ success: false, error: 'Task not found' }, 404)

  const task = {
    id: row.id, name: row.name, status: row.status, assignee: row.assignee,
    priority: row.priority, task_type: row.task_type,
    parent_ids: row.parent_id ? [row.parent_id] : [],
    child_ids: [], blocked_by_ids: [],
    start_date: row.start_date, deadline: row.deadline,
    completed_time: row.completed_time, email: row.email,
    unique_id: row.unique_id, notes: row.notes,
    created_time: row.created_at, last_edited_time: row.updated_at,
    url: null, images: []
  }

  return c.json({ success: true, data: task })
})

// DELETE /tasks/:id - Delete task (release children)
tasks.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const user = c.get('user')

  const task = await c.env.DB.prepare(
    'SELECT id, name FROM tasks WHERE id = ? AND user_id = ?'
  ).bind(id, user.userId).first<{ id: string; name: string }>()

  if (!task) {
    return c.json({ success: false, error: 'Task not found' }, 404)
  }

  // Batch all cleanup operations
  const now = nowISO()
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE tasks SET parent_id = NULL, updated_at = ? WHERE parent_id = ?').bind(now, id),
    c.env.DB.prepare('DELETE FROM task_dependencies WHERE task_id = ? OR blocked_by_id = ?').bind(id, id),
    c.env.DB.prepare('DELETE FROM task_images WHERE task_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(id),
  ])

  return c.json({
    success: true,
    data: { id, name: task.name, child_released: 0 }
  })
})

// POST /tasks/auto-transition - Auto transition tasks based on dates
tasks.post('/auto-transition', async (c) => {
  const user = c.get('user')
  const today = getBeijingToday()
  const now = nowISO()

  // Batch: 待开始 -> 进行中 (start_date <= today) + 待开始/进行中 -> 已逾期 (deadline < today)
  const [toProgress, toOverdue] = await c.env.DB.batch([
    c.env.DB.prepare(`
      UPDATE tasks SET status = '进行中', updated_at = ?
      WHERE user_id = ? AND status = '待开始' AND start_date IS NOT NULL AND start_date <= ?
        AND (deadline IS NULL OR deadline >= ?)
    `).bind(now, user.userId, today, today),
    c.env.DB.prepare(`
      UPDATE tasks SET status = '已逾期', updated_at = ?
      WHERE user_id = ? AND status IN ('待开始', '进行中') AND deadline IS NOT NULL AND deadline < ?
    `).bind(now, user.userId, today),
  ])

  const changes = ((toProgress as any).changes ?? 0) + ((toOverdue as any).changes ?? 0)

  return c.json({
    success: true,
    data: {
      total_checked: 0,
      transitioned: changes,
      tasks: [],
      timestamp: now
    },
    message: `Auto-transitioned ${changes} tasks`
  })
})

export default tasks

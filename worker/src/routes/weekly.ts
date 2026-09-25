// =============================================
// Weekly Summary Routes
// =============================================

import { Hono } from 'hono'
import type { Bindings } from '../types'
import { authMiddleware } from '../middleware/auth'
import { generateId } from '../utils/crypto'

const weekly = new Hono<{ Bindings: Bindings }>()

weekly.use('*', authMiddleware)

// Helper: get week start/end from a week param
function resolveWeek(weekParam: string): { start: string; end: string; year: number; weekNum: number } {
  const now = new Date()
  let refDate = now

  if (weekParam === 'last') {
    refDate = new Date(now.getTime() - 7 * 86400000)
  } else if (weekParam !== 'current' && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)) {
    refDate = new Date(weekParam)
  }

  const dayOfWeek = refDate.getDay() || 7
  const weekStart = new Date(refDate)
  weekStart.setDate(refDate.getDate() - dayOfWeek + 1)
  const weekEnd = new Date(weekStart.getTime() + 6 * 86400000)

  // ISO week number
  const oneJan = new Date(refDate.getFullYear(), 0, 1)
  const weekNum = Math.ceil(((refDate.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7)

  return {
    start: weekStart.toISOString().slice(0, 10),
    end: weekEnd.toISOString().slice(0, 10),
    year: refDate.getFullYear(),
    weekNum
  }
}

// GET /weekly-summary - Get weekly summary
weekly.get('/', async (c) => {
  const user = c.get('user')
  const weekParam = c.req.query('week') || 'current'
  const { start, end, year, weekNum } = resolveWeek(weekParam)

  // Try to load from DB first
  const existing = await c.env.DB.prepare(
    'SELECT * FROM weekly_summaries WHERE user_id = ? AND week_start = ?'
  ).bind(user.userId, start).first()

  if (existing) {
    return c.json({
      success: true,
      data: {
        ...(JSON.parse(existing.data as string)),
        week_start: existing.week_start,
        week_end: existing.week_end,
        year: existing.year,
        week_number: existing.week_number,
        is_editable: existing.is_editable === 1
      }
    })
  }

  // Generate from tasks
  const { results: tasks } = await c.env.DB.prepare(
    'SELECT * FROM tasks WHERE user_id = ? AND created_at <= ? ORDER BY status, priority'
  ).bind(user.userId, end).all()

  const weekTasks = tasks.filter((t: any) => {
    // 无日期的任务不纳入周报
    if (!t.start_date && !t.deadline) return false
    // 任务的时间范围与本周有交集
    const taskStart = t.start_date || t.deadline
    const taskEnd = t.deadline || t.start_date
    return taskStart <= end && taskEnd >= start
  })

  const summary = {
    week_start: start,
    week_end: end,
    year,
    week_number: weekNum,
    total_tasks: weekTasks.length,
    completed: weekTasks.filter((t: any) => t.status === '已完成').length,
    in_progress: weekTasks.filter((t: any) => t.status === '进行中').length,
    tasks: weekTasks.map((t: any) => ({
      id: t.id, name: t.name, status: t.status, priority: t.priority
    })),
    is_editable: true
  }

  return c.json({ success: true, data: summary })
})

// GET /weekly-summary/weeks - Available weeks
weekly.get('/weeks', async (c) => {
  const user = c.get('user')
  const limit = parseInt(c.req.query('limit') || '52')

  // Batch: saved summaries + distinct task weeks in one round-trip
  const [summariesRes, taskWeeksRes] = await c.env.DB.batch([
    c.env.DB.prepare(
      'SELECT week_start, week_end, year, week_number FROM weekly_summaries WHERE user_id = ? ORDER BY week_start DESC LIMIT ?'
    ).bind(user.userId, limit),
    c.env.DB.prepare(
      `SELECT DISTINCT strftime('%Y-%m-%d', created_at, 'weekday 0', '-6 days') as week_start
       FROM tasks WHERE user_id = ? ORDER BY week_start DESC LIMIT ?`
    ).bind(user.userId, limit)
  ])

  const savedWeeks = (summariesRes as any).results || []
  const taskWeekStarts = ((taskWeeksRes as any).results || []).map((r: any) => r.week_start)

  // Merge: saved summaries first, then add task-derived weeks not already covered
  const seen = new Set<string>(savedWeeks.map((w: any) => w.week_start))
  const extraWeeks = taskWeekStarts
    .filter((ws: string) => !seen.has(ws))
    .slice(0, limit)
    .map((ws: string) => {
      const w = resolveWeek(ws)
      return { week_start: w.start, week_end: w.end, year: w.year, week_number: w.weekNum }
    })

  const uniqueWeeks = [...savedWeeks, ...extraWeeks]
    .sort((a: any, b: any) => b.week_start.localeCompare(a.week_start))
    .slice(0, limit)

  return c.json({
    success: true,
    data: uniqueWeeks
  })
})

// GET /weekly-summary/markdown - Markdown format
weekly.get('/markdown', async (c) => {
  const user = c.get('user')
  const weekParam = c.req.query('week') || 'current'
  const { start, end, year, weekNum } = resolveWeek(weekParam)

  const { results: tasks } = await c.env.DB.prepare(
    'SELECT * FROM tasks WHERE user_id = ? ORDER BY status, priority'
  ).bind(user.userId).all()

  const weekTasks = tasks.filter((t: any) => {
    const created = t.created_at?.slice(0, 10)
    if (!created) return false
    return created >= start && created <= end
  })

  const completed = weekTasks.filter((t: any) => t.status === '已完成')
  const inProgress = weekTasks.filter((t: any) => t.status === '进行中')
  const inbox = weekTasks.filter((t: any) => t.status === '待开始')

  const markdown = `# 第${weekNum}周生活总结 (${start} ~ ${end})

## 本周概览
- 总任务数: ${weekTasks.length}
- 已完成: ${completed.length}
- 进行中: ${inProgress.length}
- 待开始: ${inbox.length}

## 已完成任务
${completed.map(t => `- [x] ${t.name} (${t.priority})`).join('\n') || '- 暂无'}

## 进行中任务
${inProgress.map(t => `- [ ] ${t.name} (${t.priority})`).join('\n') || '- 暂无'}

## 待开始任务
${inbox.map(t => `- [ ] ${t.name}`).join('\n') || '- 暂无'}
`

  return c.json({
    success: true,
    data: {
      markdown,
      summary: { week_start: start, week_end: end, year, week_number: weekNum, total_tasks: weekTasks.length }
    }
  })
})

// POST /weekly-summary/new-format/save - Save weekly summary
weekly.post('/new-format/save', async (c) => {
  const user = c.get('user')
  const { week, data } = await c.req.json()
  const { start, end, year, weekNum } = resolveWeek(week || 'current')

  const id = generateId()
  const dataStr = JSON.stringify(data)

  // Upsert
  const existing = await c.env.DB.prepare(
    'SELECT id FROM weekly_summaries WHERE user_id = ? AND week_start = ?'
  ).bind(user.userId, start).first()

  if (existing) {
    await c.env.DB.prepare(
      'UPDATE weekly_summaries SET data = ?, updated_at = ? WHERE id = ?'
    ).bind(dataStr, new Date().toISOString(), existing.id).run()
  } else {
    await c.env.DB.prepare(`
      INSERT INTO weekly_summaries (id, user_id, week_start, week_end, year, week_number, data)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, user.userId, start, end, year, weekNum, dataStr).run()
  }

  return c.json({ success: true, message: 'Weekly summary saved' })
})

// GET /weekly-summary/new-format - Get new format summary
weekly.get('/new-format', async (c) => {
  const user = c.get('user')
  const weekParam = c.req.query('week') || 'current'
  const { start, end, year, weekNum } = resolveWeek(weekParam)

  const existing = await c.env.DB.prepare(
    'SELECT * FROM weekly_summaries WHERE user_id = ? AND week_start = ?'
  ).bind(user.userId, start).first()

  if (existing) {
    return c.json({
      success: true,
      data: {
        ...(JSON.parse(existing.data as string)),
        week_start: existing.week_start,
        week_end: existing.week_end,
        year: existing.year,
        week_number: existing.week_number
      }
    })
  }

  // Generate basic summary from tasks - only fetch tasks overlapping with the week
  const { results: weekTasks } = await c.env.DB.prepare(
    `SELECT id, name, status, priority, task_type, notes, start_date, deadline FROM tasks 
     WHERE user_id = ? AND (start_date IS NOT NULL OR deadline IS NOT NULL)
     AND (COALESCE(start_date, deadline) <= ? AND COALESCE(deadline, start_date) >= ?)
     ORDER BY status, priority`
  ).bind(user.userId, end, start).all()

  const goals = (weekTasks as any[]).map((t: any) => ({
    type: t.task_type || '未分类',
    task: t.name,
    status: t.status,
    priority: t.priority,
    note: t.notes || ''
  }))

  // Build habits data from daily_logs - single batch query (eliminate N+1)
  const { results: activeHabits } = await c.env.DB.prepare(
    "SELECT id, name FROM habits WHERE user_id = ? AND status = '生效'"
  ).bind(user.userId).all()

  const habitItems = (activeHabits as any[]).map((h: any) => h.name)
  const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const dailyRecords: any[] = []
  const habitStats: Record<string, { completed: number; total: number }> = {}
  habitItems.forEach(h => { habitStats[h] = { completed: 0, total: 0 } })

  // Generate date range for the week
  const startDateParts = start.split('-').map(Number)
  const weekDates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDateParts[0], startDateParts[1] - 1, startDateParts[2] + i)
    weekDates.push(d.toISOString().slice(0, 10))
  }

  // Single query: fetch all logs for the week in one shot
  let logsByHabitDate: Record<string, number> = {}
  if ((activeHabits as any[]).length > 0) {
    const { results: logs } = await c.env.DB.prepare(
      `SELECT habit_id, log_date, completed FROM daily_logs WHERE habit_id IN (SELECT id FROM habits WHERE user_id = ? AND status = '生效') AND log_date >= ? AND log_date <= ?`
    ).bind(user.userId, weekDates[0], weekDates[6]).all()
    
    logs.forEach((log: any) => {
      logsByHabitDate[`${log.habit_id}_${log.log_date}`] = log.completed
    })
  }

  // Build daily records from pre-fetched data
  for (let i = 0; i < 7; i++) {
    const dateStr = weekDates[i]
    const checks: Record<string, boolean> = {}

    for (const habit of activeHabits as any[]) {
      const done = logsByHabitDate[`${habit.id}_${dateStr}`] === 1
      checks[habit.name] = done
      habitStats[habit.name].total++
      if (done) habitStats[habit.name].completed++
    }

    dailyRecords.push({ weekday: weekdays[i], date: dateStr, checks })
  }

  // Auto-generate KISS review from task + habit data
  const completedGoals = goals.filter((g: any) => g.status === '已完成')
  const inProgressGoals = goals.filter((g: any) => g.status === '进行中')
  const inboxGoals = goals.filter((g: any) => g.status === '待开始')
  const abandonedGoals = goals.filter((g: any) => g.status === '已放弃')

  // Keep: habits with high completion rate
  const keep: string[] = []
  for (const [name, stat] of Object.entries(habitStats)) {
    const s = stat as { completed: number; total: number }
    if (s.total > 0 && s.completed / s.total >= 0.7) {
      keep.push(`「${name}」坚持良好（${s.completed}/${s.total}天）`)
    }
  }
  if (completedGoals.length > 0) {
    keep.push(`本周完成 ${completedGoals.length} 项目标：${completedGoals.slice(0, 3).map((g: any) => g.task).join('、')}`)
  }

  // Stop: habits with very low completion + abandoned tasks
  const stop: string[] = []
  for (const [name, stat] of Object.entries(habitStats)) {
    const s = stat as { completed: number; total: number }
    if (s.total >= 3 && s.completed === 0) {
      stop.push(`「${name}」本周完全未打卡，需调整或暂停`)
    }
  }
  if (abandonedGoals.length > 0) {
    stop.push(`放弃 ${abandonedGoals.length} 项目标：${abandonedGoals.map((g: any) => g.task).join('、')}`)
  }

  // Improve: habits with partial completion + overdue tasks
  const improve: string[] = []
  for (const [name, stat] of Object.entries(habitStats)) {
    const s = stat as { completed: number; total: number }
    if (s.total > 0 && s.completed > 0 && s.completed / s.total < 0.7) {
      improve.push(`「${name}」完成率 ${Math.round((s.completed / s.total) * 100)}%，有提升空间`)
    }
  }
  if (inboxGoals.length > 0) {
    improve.push(`${inboxGoals.length} 项任务仍在「待开始」，需尽快规划`)
  }

  // Try: suggestions based on gaps
  const tryArr: string[] = []
  if (inProgressGoals.length > 3) {
    tryArr.push('进行中任务过多，尝试聚焦 Top 3 优先完成')
  }
  if (keep.length === 0) {
    tryArr.push('本周无亮点习惯，尝试选 1 个最小习惯重新开始')
  }
  if (stop.length === 0 && improve.length === 0) {
    tryArr.push('整体表现稳定，可尝试新增一个挑战性习惯')
  }

  // Auto-generate summary thoughts
  const totalGoals = goals.length
  const completionRate = totalGoals > 0 ? Math.round((completedGoals.length / totalGoals) * 100) : 0
  const highlights = completedGoals.length > 0
    ? `本周完成 ${completedGoals.length}/${totalGoals} 项目标（${completionRate}%），${keep[0] || '整体推进顺利'}。`
    : `本周 ${totalGoals} 项目标尚在进行中，需加快节奏。`
  const shortcomings = stop.length > 0 || improve.length > 0
    ? [...stop, ...improve].slice(0, 2).join('；') + '。'
    : ''
  const improvements = tryArr.length > 0 ? tryArr[0] : ''

  const data = {
    week_start: start,
    week_end: end,
    year,
    week_number: weekNum,
    goals,
    habits: {
      habit_items: habitItems,
      daily_records: dailyRecords,
      statistics: habitStats
    },
    kiss: { keep, stop, improve, try: tryArr },
    summary: { highlights, shortcomings, improvements },
    next_week_goals: [],
    next_week_plan: []
  }

  return c.json({ success: true, data })
})

// GET /weekly-summary/new-format/markdown
weekly.get('/new-format/markdown', async (c) => {
  const user = c.get('user')
  const weekParam = c.req.query('week') || 'current'
  const { start, end, year, weekNum } = resolveWeek(weekParam)

  const existing = await c.env.DB.prepare(
    'SELECT * FROM weekly_summaries WHERE user_id = ? AND week_start = ?'
  ).bind(user.userId, start).first()

  if (existing) {
    const data = JSON.parse(existing.data as string)
    const markdown = data.markdown || `# Week ${weekNum} Summary`
    return c.json({
      success: true,
      data: { markdown, summary: { ...data, week_start: start, week_end: end } }
    })
  }

  return c.json({ success: true, data: { markdown: '', summary: {} } })
})

// POST /weekly-summary/push - Push weekly summary via channels
weekly.post('/push', async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const { week = 'current', channels = ['dingtalk'] } = body
  const { start, end, year, weekNum } = resolveWeek(week)

  // Get or generate summary data
  const existing = await c.env.DB.prepare(
    'SELECT data FROM weekly_summaries WHERE user_id = ? AND week_start = ?'
  ).bind(user.userId, start).first<any>()

  let markdown = ''
  if (existing?.data) {
    const parsed = JSON.parse(existing.data)
    markdown = parsed.markdown || ''
  }
  if (!markdown) {
    // Build a brief markdown from goals
    const { results: tasks } = await c.env.DB.prepare(`
      SELECT name, status, task_type FROM tasks
      WHERE user_id = ? AND status IN ('进行中', '已完成', '待开始', '已放弃')
        AND COALESCE(start_date, deadline) <= ? AND COALESCE(deadline, start_date) >= ?
      ORDER BY status, priority DESC
    `).bind(user.userId, end, start).all()

    const completed = (tasks as any[]).filter((t: any) => t.status === '已完成')
    const inProgress = (tasks as any[]).filter((t: any) => t.status === '进行中')
    markdown = `### AI效能 - ${year}年第${weekNum}周总结\n\n`
    markdown += `**周期**: ${start} ~ ${end}\n\n`
    markdown += `✅ 已完成 ${completed.length} 项 | 🔄 进行中 ${inProgress.length} 项\n\n`
    if (completed.length > 0) {
      markdown += `**本周完成:**\n`
      completed.slice(0, 5).forEach((t: any) => { markdown += `- ${t.name}\n` })
      markdown += '\n'
    }
    if (inProgress.length > 0) {
      markdown += `**进行中:**\n`
      inProgress.slice(0, 5).forEach((t: any) => { markdown += `- ${t.name}\n` })
    }
  }

  const results: Record<string, any> = {}

  // Send via DingTalk
  if (channels.includes('dingtalk')) {
    const webhook = c.env.DINGTALK_WEBHOOK
    if (!webhook) {
      results.dingtalk = { success: false, error: 'DINGTALK_WEBHOOK 未配置' }
    } else {
      try {
        const title = `AI效能 - ${year}年第${weekNum}周总结`
        const resp = await fetch(webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ msgtype: 'markdown', markdown: { title, text: markdown || title } })
        })
        const data = await resp.json() as any
        results.dingtalk = { success: data.errcode === 0, data }
      } catch (err: any) {
        results.dingtalk = { success: false, error: err.message }
      }
    }
  }

  // Send via Email (legacy)
  if (channels.includes('email')) {
    results.email = { success: false, error: '邮件推送已停用，请使用钉钉' }
  }

  const allSuccess = Object.values(results).every((r: any) => r.success)
  return c.json({ success: allSuccess, data: results, message: allSuccess ? '推送成功' : '部分渠道推送失败' })
})

export default weekly

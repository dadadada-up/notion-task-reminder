// =============================================
// Cron Handlers - scheduled tasks
// Triggered by Cloudflare Worker cron triggers
// =============================================

import type { Bindings } from '../types'
import { getBeijingToday, nowISO } from '../utils/date'

/**
 * Cron entry point - dispatches based on cron expression
 * UTC 00:00 = Beijing 08:00 (morning reminder)
 * UTC 01:00 = Beijing 09:00 (auto-transition only)
 * UTC 14:00 = Beijing 22:00 (auto-transition + evening summary)
 */
export async function handleScheduled(event: ScheduledEvent, env: Bindings) {
  console.log(`[Cron] Triggered at ${new Date().toISOString()}, cron: ${event.cron}`)

  if (event.cron === '0 0 * * *') {
    await sendMorningReminder(env)
  }

  if (event.cron === '0 1 * * *') {
    await runAutoTransition(env)
  }

  if (event.cron === '0 14 * * *') {
    await runAutoTransition(env)
    await sendEveningSummary(env)
  }
}

// --- Auto-transition (shared by 09:00 and 22:00) ---
async function runAutoTransition(env: Bindings) {
  const today = getBeijingToday()
  const now = nowISO()

  // Single UPDATE: 进行中/待开始 + deadline < today → 已逾期
  const overdueResult = await env.DB.prepare(`
    UPDATE tasks SET status = '已逾期', updated_at = ?
    WHERE status IN ('进行中', '待开始') AND deadline IS NOT NULL AND deadline < ?
  `).bind(now, today).run()

  // Single UPDATE: 待开始 + start_date <= today + 未过期 → 进行中
  const progressResult = await env.DB.prepare(`
    UPDATE tasks SET status = '进行中', updated_at = ?
    WHERE status = '待开始' AND start_date IS NOT NULL AND start_date <= ?
      AND (deadline IS NULL OR deadline >= ?)
  `).bind(now, today, today).run()

  const overdue = (overdueResult as any).changes ?? 0
  const progressed = (progressResult as any).changes ?? 0
  console.log(`[Cron] Auto-transition: ${overdue} → 已逾期, ${progressed} → 进行中`)
}

// --- Morning Reminder (08:00 Beijing) ---
async function sendMorningReminder(env: Bindings) {
  console.log('[Cron] Morning reminder started')

  if (!env.PUSHPLUS_TOKEN) {
    console.log('[Cron] PUSHPLUS_TOKEN not configured, skipping')
    return
  }

  // Single query: all active users' pending tasks (eliminate N+1)
  const { results: tasks } = await env.DB.prepare(`
    SELECT t.user_id, u.username, t.name, t.priority, t.deadline, t.status
    FROM tasks t
    JOIN users u ON u.id = t.user_id
    WHERE u.role IN ('owner', 'editor') AND t.status IN ('进行中', '待开始', '已逾期')
    ORDER BY t.user_id, t.priority
  `).all() as { results: any[] }

  if (!tasks || tasks.length === 0) {
    console.log('[Cron] No pending tasks, skipping morning reminder')
    return
  }

  // Group by user in memory
  const byUser: Record<string, { username: string; tasks: any[] }> = {}
  for (const t of tasks) {
    if (!byUser[t.user_id]) byUser[t.user_id] = { username: t.username, tasks: [] }
    if (byUser[t.user_id].tasks.length < 15) byUser[t.user_id].tasks.push(t)
  }

  // Send notifications in parallel
  const sends = Object.values(byUser).map(async ({ username, tasks: userTasks }) => {
    const title = `☀️ 早安！今日 ${userTasks.length} 个待办任务`
    let html = '<ul>'
    for (const t of userTasks) {
      const p = t.priority ? `[${t.priority.split(' ')[0]}]` : ''
      const dl = t.deadline ? ` (截止: ${t.deadline})` : ''
      const overdue = t.status === '已逾期' ? ' ⚠️逾期' : ''
      html += `<li>${p} ${t.name}${dl}${overdue}</li>`
    }
    html += '</ul>'

    try {
      await fetch('https://www.pushplus.plus/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: env.PUSHPLUS_TOKEN, title, content: html, template: 'html' })
      })
      console.log(`[Cron] Morning reminder sent to ${username}`)
    } catch (err) {
      console.error(`[Cron] Failed to send morning reminder to ${username}:`, err)
    }
  })

  await Promise.all(sends)
}

// --- Evening Summary (22:00 Beijing) ---
async function sendEveningSummary(env: Bindings) {
  console.log('[Cron] Evening summary started')

  if (!env.PUSHPLUS_TOKEN) {
    console.log('[Cron] PUSHPLUS_TOKEN not configured, skipping')
    return
  }

  const today = getBeijingToday()

  // Single query: today's completed tasks for all active users (eliminate N+1)
  const { results: doneTasks } = await env.DB.prepare(`
    SELECT t.user_id, u.username, t.name, t.priority
    FROM tasks t
    JOIN users u ON u.id = t.user_id
    WHERE u.role IN ('owner', 'editor') AND t.status = '已完成' AND DATE(t.completed_time) = ?
    ORDER BY t.user_id
  `).bind(today).all() as { results: any[] }

  if (!doneTasks || doneTasks.length === 0) {
    console.log('[Cron] No completed tasks today, skipping evening summary')
    return
  }

  // Group by user in memory
  const byUser: Record<string, { username: string; tasks: any[] }> = {}
  for (const t of doneTasks) {
    if (!byUser[t.user_id]) byUser[t.user_id] = { username: t.username, tasks: [] }
    byUser[t.user_id].tasks.push(t)
  }

  const sends = Object.values(byUser).map(async ({ username, tasks: userTasks }) => {
    const title = `🌙 今日完成 ${userTasks.length} 个任务`
    let html = '<ul>'
    for (const t of userTasks) {
      html += `<li>✅ ${t.name}</li>`
    }
    html += '</ul>'

    try {
      await fetch('https://www.pushplus.plus/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: env.PUSHPLUS_TOKEN, title, content: html, template: 'html' })
      })
      console.log(`[Cron] Evening summary sent to ${username}`)
    } catch (err) {
      console.error(`[Cron] Failed to send evening summary to ${username}:`, err)
    }
  })

  await Promise.all(sends)
  console.log(`[Cron] Evening summary done. Total completed today: ${doneTasks.length}`)
}

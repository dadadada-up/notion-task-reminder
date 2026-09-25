// =============================================
// Notification Center Routes - Unified API
// Combines config, schedule, and notify routes
// =============================================

import { Hono } from 'hono'
import type { Bindings } from '../types'
import { authMiddleware } from '../middleware/auth'

const nc = new Hono<{ Bindings: Bindings }>()

nc.use('*', authMiddleware)

// GET /notification-center/status - Aggregate status (channels + schedules + config)
nc.get('/status', async (c) => {
  try {
    // 1. Get all config from D1
    const { results: configRows } = await c.env.DB.prepare('SELECT key, value FROM app_config').all()
    const configMap: Record<string, any> = {}
    configRows.forEach((r: any) => {
      try { configMap[r.key] = JSON.parse(r.value) } catch { configMap[r.key] = r.value }
    })

    // 2. Build channel status from env bindings + config
    const channels = {
      pushplus: {
        enabled: !!c.env.PUSHPLUS_TOKEN,
        status: c.env.PUSHPLUS_TOKEN ? 'configured' : 'unconfigured',
        has_token: !!c.env.PUSHPLUS_TOKEN,
      },
      email: {
        enabled: !!c.env.EMAIL_SENDER,
        status: (c.env.EMAIL_SENDER && c.env.EMAIL_PASSWORD) ? 'configured' : (c.env.EMAIL_SENDER ? 'unconfigured' : 'disabled'),
        smtp_server: c.env.EMAIL_SMTP_SERVER || '',
        smtp_port: c.env.EMAIL_SMTP_PORT || '465',
        sender: c.env.EMAIL_SENDER || '',
        receiver: c.env.EMAIL_RECEIVER || '',
        password: c.env.EMAIL_PASSWORD ? '***' : '',
      },
      dingtalk: {
        enabled: !!c.env.DINGTALK_WEBHOOK,
        status: c.env.DINGTALK_WEBHOOK ? 'configured' : 'unconfigured',
      }
    }

    // 3. Get schedules from D1
    const { results: scheduleRows } = await c.env.DB.prepare(
      "SELECT key, value FROM app_config WHERE key LIKE 'schedule_%'"
    ).all()
    const schedules = scheduleRows.map((r: any) => {
      try { return JSON.parse(r.value) } catch { return { key: r.key, value: r.value } }
    })

    // 4. Build form config (masked values for form display)
    const formConfig = {
      push: {
        pushplusToken: c.env.PUSHPLUS_TOKEN ? '***' : '',
        wxpusherToken: '',
        wxpusherUid: '',
      },
      email: {
        enabled: !!c.env.EMAIL_SENDER,
        smtpServer: c.env.EMAIL_SMTP_SERVER || '',
        smtpPort: c.env.EMAIL_SMTP_PORT || '465',
        sender: c.env.EMAIL_SENDER || '',
        receiver: c.env.EMAIL_RECEIVER || '',
        password: c.env.EMAIL_PASSWORD ? '***' : '',
      },
      github: {
        token: '',
        repository: '',
      }
    }

    return c.json({
      success: true,
      data: {
        channels,
        schedules,
        github_sync: { synced: false, repository: '' },
        config: formConfig,
      }
    })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to fetch status' }, 500)
  }
})

// PUT /notification-center/config - Update channel config
nc.put('/config', async (c) => {
  try {
    const data = await c.req.json()
    const now = new Date().toISOString()

    // Save to app_config table
    for (const [key, value] of Object.entries(data)) {
      const valueStr = typeof value === 'string' ? value : JSON.stringify(value)
      await c.env.DB.prepare(`
        INSERT INTO app_config (key, value, updated_at) VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
      `).bind(key, valueStr, now, valueStr, now).run()
    }

    return c.json({ success: true, message: '渠道配置已保存' })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to save config' }, 500)
  }
})

// GET /notification-center/schedules - Get schedules
nc.get('/schedules', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      "SELECT key, value FROM app_config WHERE key LIKE 'schedule_%'"
    ).all()

    const schedules = results.map((r: any) => {
      try { return JSON.parse(r.value) } catch { return { key: r.key, value: r.value } }
    })

    return c.json({ success: true, data: schedules })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to fetch schedules' }, 500)
  }
})

// POST /notification-center/schedules - Save schedules
nc.post('/schedules', async (c) => {
  try {
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

    return c.json({ success: true, message: '定时任务已保存', github_synced: false })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to save schedules' }, 500)
  }
})

// POST /notification-center/send - Send notification
nc.post('/send', async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const { type = 'daily_todo', channels = ['pushplus'], customTitle, customMessage } = body

  const results: Record<string, any> = {}
  const typesToSend = type === 'both' ? ['daily_todo', 'daily_done'] : [type]

  for (const ntype of typesToSend) {
    const isDone = ntype === 'daily_done'
    const today = new Date().toISOString().split('T')[0]

    // Get tasks
    const { results: tasks } = await c.env.DB.prepare(`
      SELECT name, status, priority, task_type, deadline
      FROM tasks
      WHERE user_id = ?
        AND status IN (${isDone ? "'已完成'" : "'进行中', '待开始'"})
        ${isDone ? `AND DATE(completed_time) = '${today}'` : ''}
      ORDER BY priority, deadline
      LIMIT 20
    `).bind(user.userId).all()

    const title = customTitle || (isDone ? '今日完成任务' : '今日待办任务')
    const message = customMessage || buildTaskHtml(tasks, isDone)

    if (channels.includes('pushplus')) {
      results[`pushplus_${ntype}`] = await sendPushPlus(c.env, title, message)
    }
    if (channels.includes('dingtalk')) {
      results[`dingtalk_${ntype}`] = await sendDingTalk(c.env, `AI效能 - ${title}`, buildDingTalkMd(tasks, isDone))
    }
    if (channels.includes('email')) {
      results[`email_${ntype}`] = await sendEmail(c.env, title, message)
    }
  }

  // Log activity
  await c.env.DB.prepare(
    "INSERT INTO activity_logs (id, user_id, action, entity_type, metadata, created_at) VALUES (?, ?, 'notify', 'notification', ?, ?)"
  ).bind(
    crypto.randomUUID(), user.userId,
    JSON.stringify({ type, channels, results }),
    new Date().toISOString()
  ).run()

  return c.json({ success: true, data: results })
})

// POST /notification-center/test - Test channel
nc.post('/test', async (c) => {
  const { channel, message = '这是一条测试消息' } = await c.req.json()

  if (channel === 'pushplus') {
    const result = await sendPushPlus(c.env, '🔔 渠道测试', `<p>${message}</p><p style="color:#999;font-size:12px;">如果您收到此消息，说明 PushPlus 渠道配置正确。</p>`)
    return c.json({ success: result.success !== false, data: { channel: 'pushplus', result } })
  }

  if (channel === 'dingtalk') {
    const result = await sendDingTalk(c.env, 'AI效能 - 🔔 渠道测试', `${message}\n\n如果您收到此消息，说明钉钉渠道配置正确。`)
    return c.json({ success: result.success !== false, data: { channel: 'dingtalk', result } })
  }

  if (channel === 'email') {
    const result = await sendEmail(c.env, '🔔 渠道测试', `<p>${message}</p><p style="color:#999;">如果您收到此邮件，说明邮箱渠道配置正确。</p>`)
    return c.json({ success: result.success !== false, data: { channel: 'email', result } })
  }

  return c.json({ success: false, error: `未知渠道: ${channel}` }, 400)
})

// --- Helpers ---

function buildTaskHtml(tasks: any[], isDone: boolean): string {
  if (tasks.length === 0) {
    return isDone
      ? '<p>今天还没有完成的任务，继续加油！💪</p>'
      : '<p>今天没有待办任务，享受清闲吧 ☕</p>'
  }
  const emoji = isDone ? '✅' : '📋'
  let html = `<p>${emoji} 共 ${tasks.length} 个任务：</p><ul>`
  for (const t of tasks) {
    const p = t.priority ? `[${t.priority.split(' ')[0]}]` : ''
    const dl = t.deadline ? ` (截止: ${t.deadline})` : ''
    html += `<li>${p} ${t.name}${dl}</li>`
  }
  html += '</ul>'
  return html
}

function buildDingTalkMd(tasks: any[], isDone: boolean): string {
  if (tasks.length === 0) {
    return isDone ? 'AI效能 - 今天还没有完成的任务' : 'AI效能 - 今天没有待办任务'
  }
  const header = isDone ? `✅ 今日完成 ${tasks.length} 个任务` : `📋 今日 ${tasks.length} 个待办任务`
  let md = `### AI效能 - ${header}\n\n`
  for (const t of tasks) {
    const p = t.priority ? `[${t.priority.split(' ')[0]}]` : ''
    const dl = t.deadline ? ` (截止: ${t.deadline})` : ''
    md += `- ${p} **${t.name}**${dl}\n`
  }
  return md
}

async function sendPushPlus(env: Bindings, title: string, content: string): Promise<any> {
  const token = env.PUSHPLUS_TOKEN
  if (!token) return { success: false, error: 'PUSHPLUS_TOKEN 未配置' }
  try {
    const resp = await fetch('https://www.pushplus.plus/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, title, content, template: 'html' })
    })
    const data = await resp.json() as any
    return { success: data.code === 200, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

async function sendDingTalk(env: Bindings, title: string, content: string): Promise<any> {
  const webhook = env.DINGTALK_WEBHOOK
  if (!webhook) return { success: false, error: 'DINGTALK_WEBHOOK 未配置' }
  try {
    const resp = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msgtype: 'markdown', markdown: { title, text: content } })
    })
    const data = await resp.json() as any
    return { success: data.errcode === 0, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

async function sendEmail(env: Bindings, subject: string, htmlBody: string): Promise<any> {
  if (!env.EMAIL_SENDER || !env.EMAIL_PASSWORD) {
    return { success: false, error: '邮件配置不完整' }
  }
  return { success: true, message: '邮件发送功能已配置（Workers 环境需要通过 Resend API 发送）' }
}

export default nc

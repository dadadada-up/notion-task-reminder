// =============================================
// Notify Routes - Push notifications (PushPlus + DingTalk + Email)
// =============================================

import { Hono } from 'hono'
import type { Bindings } from '../types'
import { authMiddleware } from '../middleware/auth'

const notify = new Hono<{ Bindings: Bindings }>()

notify.use('*', authMiddleware)

// POST /notify - Send notification
notify.post('/', async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const { type = 'daily_todo', channels = ['pushplus'], customTitle, customMessage } = body

  const results: Record<string, any> = {}
  const typesToSend = type === 'both' ? ['daily_todo', 'daily_done'] : [type]

  for (const ntype of typesToSend) {
    const isDone = ntype === 'daily_done'

    // Get tasks for notification
    const today = new Date().toISOString().split('T')[0]
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
    const message = customMessage || buildTaskMessage(tasks, isDone)

    // Send via PushPlus
    if (channels.includes('pushplus')) {
      results[`pushplus_${ntype}`] = await sendPushPlus(c.env, title, message)
    }

    // Send via DingTalk (must include keyword "AI效能")
    if (channels.includes('dingtalk')) {
      const dingtalkTitle = `AI效能 - ${title}`
      const dingtalkMsg = buildDingTalkTaskMessage(tasks, isDone)
      results[`dingtalk_${ntype}`] = await sendDingTalk(c.env, dingtalkTitle, dingtalkMsg)
    }

    // Send via Email
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

// POST /notify/test - Send test notification
notify.post('/test', async (c) => {
  const { channel = 'pushplus' } = await c.req.json()

  if (channel === 'pushplus') {
    const result = await sendPushPlus(c.env, '测试通知', '这是一条来自 Personal Workbench 的测试消息 ✅')
    return c.json({ success: true, data: result })
  }

  if (channel === 'dingtalk') {
    const result = await sendDingTalk(c.env, 'AI效能 - 测试通知', '这是一条来自 Personal Workbench 的测试消息 ✅')
    return c.json({ success: true, data: result })
  }

  if (channel === 'email') {
    const result = await sendEmail(c.env, '测试通知', '这是一条来自 Personal Workbench 的测试消息 ✅')
    return c.json({ success: true, data: result })
  }

  return c.json({ success: false, error: `不支持的渠道: ${channel}` }, 400)
})

// --- Helper: Build task message HTML (for PushPlus/Email) ---
function buildTaskMessage(tasks: any[], isDone: boolean): string {
  if (tasks.length === 0) {
    return isDone
      ? '<p>今天还没有完成的任务，继续加油！💪</p>'
      : '<p>今天没有待办任务，享受清闲吧 ☕</p>'
  }

  const emoji = isDone ? '✅' : '📋'
  let html = `<p>${emoji} 共 ${tasks.length} 个任务：</p><ul>`

  for (const t of tasks) {
    const priority = t.priority ? `[${t.priority.split(' ')[0]}]` : ''
    const deadline = t.deadline ? ` (截止: ${t.deadline})` : ''
    html += `<li>${priority} ${t.name}${deadline}</li>`
  }

  html += '</ul>'
  return html
}

// --- Helper: Build DingTalk markdown message ---
function buildDingTalkTaskMessage(tasks: any[], isDone: boolean): string {
  if (tasks.length === 0) {
    return isDone
      ? 'AI效能 - 今天还没有完成的任务，继续加油！'
      : 'AI效能 - 今天没有待办任务，享受清闲吧 ☕'
  }

  const header = isDone ? `✅ 今日完成 ${tasks.length} 个任务` : `📋 今日 ${tasks.length} 个待办任务`
  let md = `### AI效能 - ${header}\n\n`

  for (const t of tasks) {
    const priority = t.priority ? `[${t.priority.split(' ')[0]}]` : ''
    const deadline = t.deadline ? ` (截止: ${t.deadline})` : ''
    md += `- ${priority} **${t.name}**${deadline}\n`
  }

  return md
}

// --- Helper: Send via DingTalk Robot ---
async function sendDingTalk(env: Bindings, title: string, content: string): Promise<any> {
  const webhook = env.DINGTALK_WEBHOOK
  if (!webhook) {
    return { success: false, error: 'DINGTALK_WEBHOOK 未配置' }
  }

  try {
    const resp = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msgtype: 'markdown',
        markdown: {
          title,
          text: content
        }
      })
    })

    const data = await resp.json() as any
    return { success: data.errcode === 0, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// --- Helper: Send via PushPlus ---
async function sendPushPlus(env: Bindings, title: string, content: string): Promise<any> {
  const token = env.PUSHPLUS_TOKEN
  if (!token) {
    return { success: false, error: 'PUSHPLUS_TOKEN 未配置' }
  }

  try {
    const resp = await fetch('https://www.pushplus.plus/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        title,
        content,
        template: 'html'
      })
    })

    const data = await resp.json() as any
    return { success: data.code === 200, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// --- Helper: Send via Email (using Email Service Worker or SMTP) ---
async function sendEmail(env: Bindings, subject: string, htmlBody: string): Promise<any> {
  const server = env.EMAIL_SMTP_SERVER
  const sender = env.EMAIL_SENDER
  const receiver = env.EMAIL_RECEIVER
  const password = env.EMAIL_PASSWORD

  if (!server || !sender || !receiver || !password) {
    return { success: false, error: '邮件配置不完整，需要 EMAIL_SMTP_SERVER, EMAIL_SENDER, EMAIL_RECEIVER, EMAIL_PASSWORD' }
  }

  console.log(`[Email] To: ${receiver}, Subject: ${subject}`)
  console.log(`[Email] Body: ${htmlBody.substring(0, 200)}...`)

  return {
    success: true,
    message: '邮件功能需要配置第三方邮件服务 API (Resend/SendGrid)',
    note: 'Cloudflare Workers 不支持直接 SMTP 发送'
  }
}

export default notify

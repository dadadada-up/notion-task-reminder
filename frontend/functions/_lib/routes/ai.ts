// =============================================
// AI Routes - DeepSeek integration for weekly summary
// =============================================

import { Hono } from 'hono'
import type { Bindings } from '../types'
import { authMiddleware } from '../middleware/auth'

const ai = new Hono<{ Bindings: Bindings }>()

ai.use('*', authMiddleware)

// POST /ai/optimize - AI optimize text content
ai.post('/optimize', async (c) => {
  const apiKey = c.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return c.json({ success: false, error: 'AI 服务未启用，请设置 DEEPSEEK_API_KEY' }, 400)
  }

  const body = await c.req.json()
  const { section, data, context = {} } = body

  if (!section || !data) {
    return c.json({ success: false, error: '缺少必要参数: section, data' }, 400)
  }

  try {
    let result: any

    if (section === 'kiss') {
      result = await optimizeKissReflection(apiKey, data, context)
    } else if (section === 'summary') {
      result = await generateWeeklySummary(apiKey, context.tasks_data || {}, context.habits_data || {}, data)
    } else if (section === 'next_week_plan') {
      result = await suggestNextWeekPlan(apiKey, context.history_data || {}, data)
    } else {
      return c.json({ success: false, error: `不支持的 section: ${section}` }, 400)
    }

    return c.json({ success: true, data: result })
  } catch (err: any) {
    console.error('[AI] Optimization failed:', err)
    return c.json({ success: false, error: `AI 处理失败: ${err.message}` }, 500)
  }
})

// POST /ai/chat - General AI chat for workbench
ai.post('/chat', async (c) => {
  const apiKey = c.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return c.json({ success: false, error: 'AI 服务未启用' }, 400)
  }

  const { message, systemPrompt } = await c.req.json()
  if (!message) {
    return c.json({ success: false, error: '消息不能为空' }, 400)
  }

  try {
    const result = await callDeepSeek(apiKey, [
      { role: 'system', content: systemPrompt || '你是一个个人工作效率助手，帮助用户总结任务、规划工作。' },
      { role: 'user', content: message }
    ])

    return c.json({ success: true, data: { reply: result } })
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

// --- DeepSeek API call ---
async function callDeepSeek(apiKey: string, messages: any[]): Promise<string> {
  const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: 0.7,
      max_tokens: 2000
    })
  })

  if (!resp.ok) {
    const errText = await resp.text()
    throw new Error(`DeepSeek API ${resp.status}: ${errText}`)
  }

  const data = await resp.json() as any
  return data.choices?.[0]?.message?.content || ''
}

// --- KISS Reflection Optimization ---
async function optimizeKissReflection(apiKey: string, data: any, context: any): Promise<string> {
  const tasksSummary = `完成了 ${context.total_tasks || 0} 项任务`
  const prompt = `作为个人效率教练，请基于以下周回顾数据，优化 KISS 反思内容：

${tasksSummary}

当前反思内容：
${JSON.stringify(data, null, 2)}

请优化以下内容，使其更加具体、可执行、有洞察力：
- Keep（继续保持）：提炼值得保持的好习惯
- Improve（需要改进）：指出具体的改进方向
- Stop（应该停止）：识别低效或有害的行为
- Start（建议开始）：推荐新的有效做法

请直接输出优化后的内容，保持 JSON 格式。`

  return callDeepSeek(apiKey, [
    { role: 'system', content: '你是一个专业的个人效率教练，擅长 KISS 反思方法论。' },
    { role: 'user', content: prompt }
  ])
}

// --- Weekly Summary Generation ---
async function generateWeeklySummary(apiKey: string, tasksData: any, habitsData: any, currentData: any): Promise<string> {
  const prompt = `请基于以下数据生成一份精炼的周工作总结：

任务数据：${JSON.stringify(tasksData).substring(0, 1000)}
习惯数据：${JSON.stringify(habitsData).substring(0, 500)}
当前总结草稿：${JSON.stringify(currentData).substring(0, 800)}

要求：
1. 总结本周核心成果（3-5 个要点）
2. 分析任务完成率和效率趋势
3. 识别本周亮点和待改进项
4. 语言简洁有力，适合周报场景

请直接输出优化后的周总结。`

  return callDeepSeek(apiKey, [
    { role: 'system', content: '你是一个专业的工作总结助手，擅长撰写简洁有力的周报。' },
    { role: 'user', content: prompt }
  ])
}

// --- Next Week Plan Suggestion ---
async function suggestNextWeekPlan(apiKey: string, historyData: any, currentData: any): Promise<string> {
  const prompt = `请基于历史数据和当前情况，建议下周工作计划：

历史数据：${JSON.stringify(historyData).substring(0, 800)}
当前计划草稿：${JSON.stringify(currentData).substring(0, 500)}

要求：
1. 基于本周未完成项和趋势给出建议
2. 优先级排序（重要紧急 > 重要不紧急 > 其他）
3. 每个建议包含：任务名、优先级、预估工作量
4. 保持务实，不超过 8 个建议

请直接输出下周计划建议。`

  return callDeepSeek(apiKey, [
    { role: 'system', content: '你是一个专业的工作规划助手，擅长制定务实的周计划。' },
    { role: 'user', content: prompt }
  ])
}

export default ai

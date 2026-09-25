// =============================================
// Migration Script: Notion → D1
// Run: npx tsx scripts/migrate-from-notion.ts
// =============================================

import https from 'https'

// --- Config ---
// NOTION_TOKEN must be provided via environment variable.
// Example: NOTION_TOKEN=ntn_xxx npx tsx scripts/migrate-from-notion.ts
const NOTION_TOKEN = process.env.NOTION_TOKEN
if (!NOTION_TOKEN) {
  console.error('❌ NOTION_TOKEN environment variable is required.')
  console.error('   Get a token at https://www.notion.so/my-integrations')
  console.error('   Then run: NOTION_TOKEN=ntn_xxx npx tsx scripts/migrate-from-notion.ts')
  process.exit(1)
}
const TASKS_DB_ID = '192ed4b7aaea81859bbbf3ad4ea54b56'
const HABITS_DB_ID = '2caed4b7-aaea-809a-9044-ec31020e6b3e'
const DAILY_LOGS_DB_ID = '2caed4b7-aaea-8090-952f-f1a72166a90c'
const USER_ID = process.env.USER_ID || '' // Will be fetched from D1

// --- Notion API helpers ---
function notionRequest(endpoint: string, body: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const options = {
      hostname: 'api.notion.com',
      path: `/v1/${endpoint}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }
    const req = https.request(options, (res) => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Notion API ${res.statusCode}: ${body}`))
          return
        }
        resolve(JSON.parse(body))
      })
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

async function queryAllPages(databaseId: string): Promise<any[]> {
  const allResults: any[] = []
  let cursor: string | undefined = undefined

  do {
    const body: any = { page_size: 100 }
    if (cursor) body.start_cursor = cursor

    const response = await notionRequest(`databases/${databaseId}/query`, body)
    allResults.push(...response.results)
    cursor = response.has_more ? response.next_cursor : undefined
    console.log(`  Fetched ${allResults.length} pages so far...`)
  } while (cursor)

  return allResults
}

// --- Data extractors ---
function extractTitle(properties: any, propName: string): string {
  const prop = properties[propName]
  if (!prop?.title?.length) return ''
  return prop.title.map((t: any) => t.plain_text).join('')
}

function extractSelect(properties: any, propName: string): string | null {
  const prop = properties[propName]
  if (!prop) return null
  // Handle both 'select' and 'status' types
  if (prop.select) return prop.select.name
  if (prop.status) return prop.status.name
  return null
}

function extractDate(properties: any, propName: string): string | null {
  return properties[propName]?.date?.start || null
}

function extractNumber(properties: any, propName: string): number | null {
  return properties[propName]?.number ?? null
}

function extractCheckbox(properties: any, propName: string): boolean {
  return properties[propName]?.checkbox || false
}

function extractRichText(properties: any, propName: string): string | null {
  const texts = properties[propName]?.rich_text
  if (!texts?.length) return null
  return texts.map((t: any) => t.plain_text).join('')
}

function extractRelation(properties: any, propName: string): string[] {
  const rels = properties[propName]?.relation
  if (!rels?.length) return []
  return rels.map((r: any) => r.id)
}

function extractEmail(properties: any, propName: string): string | null {
  const prop = properties[propName]
  if (!prop) return null
  return prop.email || null
}

function extractPeople(properties: any, propName: string): string[] {
  const people = properties[propName]?.people
  if (!people?.length) return []
  return people.map((p: any) => p.name || p.id)
}

// --- Task transformation ---
function transformTask(page: any): any {
  const props = page.properties

  return {
    id: page.id.replace(/-/g, ''),
    name: extractTitle(props, '任务名称') || extractTitle(props, 'Name') || '未命名任务',
    status: extractSelect(props, '状态') || extractSelect(props, 'Status') || '待开始',
    assignee: extractSelect(props, '负责人') || extractSelect(props, 'Assignee') || 'dada',
    priority: extractSelect(props, '四象限') || extractSelect(props, 'Priority') || 'P2 紧急不重要',
    task_type: extractSelect(props, '任务类型') || extractSelect(props, 'Type') || '未分类',
    parent_ids: extractRelation(props, '上级 项目') || extractRelation(props, 'Parent Task') || [],
    blocked_by_ids: extractRelation(props, '被阻止') || extractRelation(props, 'Blocked By') || [],
    start_date: extractDate(props, '开始日期') || extractDate(props, 'Start Date'),
    deadline: extractDate(props, '截止日期') || extractDate(props, 'Deadline'),
    completed_time: extractDate(props, '任务完成时间') || extractDate(props, 'Completed Time'),
    email: extractEmail(props, '电子邮件') || extractEmail(props, 'Email'),
    notes: extractRichText(props, '备注') || extractRichText(props, 'Notes'),
    created_at: page.created_time,
    updated_at: page.last_edited_time
  }
}

// --- Habit transformation ---
function transformHabit(page: any): any {
  const props = page.properties

  return {
    id: page.id.replace(/-/g, ''),
    name: extractTitle(props, '名称') || extractTitle(props, 'Name') || '未命名习惯',
    frequency: extractSelect(props, '频率') || extractSelect(props, 'Frequency') || '每日',
    status: extractSelect(props, '生效状态') || extractSelect(props, 'Status') || '生效',
    weekly_target: extractNumber(props, '每周目标'),
    monthly_target: extractNumber(props, '每月目标'),
    start_date: extractDate(props, '开始日期'),
    end_date: extractDate(props, '结束日期'),
    phase: extractSelect(props, '阶段/周期') || extractSelect(props, 'Phase'),
    notes: extractRichText(props, '备注') || extractRichText(props, 'Notes'),
    created_at: page.created_time,
    updated_at: page.last_edited_time
  }
}

// --- Daily Log transformation ---
function transformDailyLog(page: any): any {
  const props = page.properties

  return {
    id: page.id.replace(/-/g, ''),
    title: extractTitle(props, 'Daily Logs') || extractTitle(props, 'Title') || '',
    date: extractDate(props, 'Date') || extractDate(props, '日期'),
    habit_ids: extractRelation(props, 'Habit') || extractRelation(props, '习惯') || [],
    completed: extractCheckbox(props, 'Completed') || extractCheckbox(props, '完成'),
    notes: extractRichText(props, 'Notes') || extractRichText(props, '备注'),
    created_at: page.created_time,
    updated_at: page.last_edited_time
  }
}

// --- SQL generation ---
function escapeSql(str: string | null): string {
  if (str === null || str === undefined) return 'NULL'
  return `'${str.replace(/'/g, "''")}'`
}

function generateTaskSQL(tasks: any[], userId: string): { tasks: string; deps: string } {
  const taskLines: string[] = []
  const depLines: string[] = []

  for (const t of tasks) {
    taskLines.push(`INSERT OR IGNORE INTO tasks (id, user_id, name, status, assignee, priority, task_type, parent_id, start_date, deadline, completed_time, email, notes, created_at, updated_at) VALUES (${escapeSql(t.id)}, ${escapeSql(userId)}, ${escapeSql(t.name)}, ${escapeSql(t.status)}, ${escapeSql(t.assignee)}, ${escapeSql(t.priority)}, ${escapeSql(t.task_type)}, ${t.parent_ids.length > 0 ? escapeSql(t.parent_ids[0].replace(/-/g, '')) : 'NULL'}, ${escapeSql(t.start_date)}, ${escapeSql(t.deadline)}, ${escapeSql(t.completed_time)}, ${escapeSql(t.email)}, ${escapeSql(t.notes)}, ${escapeSql(t.created_at)}, ${escapeSql(t.updated_at)});`)

    // blocked_by relations (collected separately)
    for (const blockedId of t.blocked_by_ids) {
      depLines.push(`INSERT OR IGNORE INTO task_dependencies (task_id, blocked_by_id) VALUES (${escapeSql(t.id)}, ${escapeSql(blockedId.replace(/-/g, ''))});`)
    }
  }

  return { tasks: taskLines.join('\n'), deps: depLines.join('\n') }
}

function generateHabitSQL(habits: any[], userId: string): string {
  return habits.map(h =>
    `INSERT OR IGNORE INTO habits (id, user_id, name, frequency, status, weekly_target, monthly_target, start_date, end_date, phase, notes, created_at, updated_at) VALUES (${escapeSql(h.id)}, ${escapeSql(userId)}, ${escapeSql(h.name)}, ${escapeSql(h.frequency)}, ${escapeSql(h.status)}, ${h.weekly_target ?? 'NULL'}, ${h.monthly_target ?? 'NULL'}, ${escapeSql(h.start_date)}, ${escapeSql(h.end_date)}, ${escapeSql(h.phase)}, ${escapeSql(h.notes)}, ${escapeSql(h.created_at)}, ${escapeSql(h.updated_at)});`
  ).join('\n')
}

function generateDailyLogSQL(logs: any[], userId: string): string {
  return logs.map(l => {
    const habitId = l.habit_ids.length > 0 ? l.habit_ids[0].replace(/-/g, '') : null
    return `INSERT OR IGNORE INTO daily_logs (id, habit_id, user_id, title, log_date, completed, notes, created_at, updated_at) VALUES (${escapeSql(l.id)}, ${habitId ? escapeSql(habitId) : 'NULL'}, ${escapeSql(userId)}, ${escapeSql(l.title)}, ${escapeSql(l.date)}, ${l.completed ? 1 : 0}, ${escapeSql(l.notes)}, ${escapeSql(l.created_at)}, ${escapeSql(l.updated_at)});`
  }).join('\n')
}

// --- Main ---
async function main() {
  console.log('🚀 Notion → D1 Migration')
  console.log('========================\n')

  // 1. Fetch all data from Notion
  console.log('📥 Fetching tasks from Notion...')
  const notionTasks = await queryAllPages(TASKS_DB_ID)
  console.log(`  ✅ Found ${notionTasks.length} tasks\n`)

  console.log('📥 Fetching habits from Notion...')
  const notionHabits = await queryAllPages(HABITS_DB_ID)
  console.log(`  ✅ Found ${notionHabits.length} habits\n`)

  console.log('📥 Fetching daily logs from Notion...')
  const notionLogs = await queryAllPages(DAILY_LOGS_DB_ID)
  console.log(`  ✅ Found ${notionLogs.length} daily logs\n`)

  // 2. Transform data
  console.log('🔄 Transforming data...')
  const tasks = notionTasks.map(transformTask)
  const habits = notionHabits.map(transformHabit)
  const logs = notionLogs.map(transformDailyLog)

  // 3. Get user ID from D1 (we need to query the remote DB)
  // For now, we'll use a placeholder - the user should set this
  const userId = USER_ID || 'REPLACE_WITH_USER_ID'

  // 4. Generate SQL
  console.log('📝 Generating SQL...')
  const { tasks: taskSQL, deps: depsSQL } = generateTaskSQL(tasks, userId)
  const sql = [
    '-- Migration from Notion to D1',
    `-- Generated at ${new Date().toISOString()}`,
    `-- Tasks: ${tasks.length}, Habits: ${habits.length}, Daily Logs: ${logs.length}`,
    '',
    'PRAGMA foreign_keys = OFF;',
    '',
    '-- Tasks',
    taskSQL,
    '',
    '-- Habits',
    generateHabitSQL(habits, userId),
    '',
    '-- Daily Logs',
    generateDailyLogSQL(logs, userId),
    '',
    '-- Task Dependencies (after all tasks)',
    depsSQL || '-- (none)',
    '',
    'PRAGMA foreign_keys = ON;',
    ''
  ].join('\n')

  // 5. Write SQL file
  const fs = await import('fs')
  const outputPath = './scripts/migration-data.sql'
  fs.writeFileSync(outputPath, sql, 'utf-8')
  console.log(`\n✅ SQL written to ${outputPath}`)
  console.log(`   File size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`)

  // 6. Print summary
  console.log('\n📊 Migration Summary:')
  console.log(`   Tasks:       ${tasks.length}`)
  console.log(`   Habits:      ${habits.length}`)
  console.log(`   Daily Logs:  ${logs.length}`)
  console.log(`   Dependencies: ${tasks.reduce((sum, t) => sum + t.blocked_by_ids.length, 0)}`)

  // 7. Print next steps
  console.log('\n📋 Next Steps:')
  console.log('   1. Get your user ID:')
  console.log('      npx wrangler d1 execute workbench-db --remote --command="SELECT id FROM users LIMIT 1"')
  console.log('   2. Replace REPLACE_WITH_USER_ID in the SQL file with your actual user ID')
  console.log('   3. Execute the migration:')
  console.log('      npx wrangler d1 execute workbench-db --remote --file=scripts/migration-data.sql')
}

main().catch(err => {
  console.error('❌ Migration failed:', err.message)
  process.exit(1)
})

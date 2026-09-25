import { useState, useEffect, useCallback } from 'react'
import { Database, Play, Trash2, Download, Table2, AlertCircle, BookOpen, X } from 'lucide-react'
import { fetchDbTables, executeDbQuery, DbTable, DbQueryResult } from '../api'

// 项目文档内容（从 PROJECT_WIKI.md 提取的关键信息）
const PROJECT_DOCS = {
  architecture: {
    title: '系统架构',
    content: `Personal Workbench 采用 Cloudflare 全栈架构：

┌──────────────────────────────────────────────────────────────────┐
│                    Cloudflare Pages                               │
│  ┌──────────────────────┐    ┌─────────────────────────────────┐ │
│  │   前端静态资源         │    │   Pages Functions (Hono)        │ │
│  │   React + Vite        │    │   /api/* → 后端 API 路由         │ │
│  │   TailwindCSS         │───▶│   /share/* → 公开分享           │ │
│  │   dist/               │    │   绑定 D1 (DB)                  │ │
│  └──────────────────────┘    └────────────┬────────────────────┘ │
└───────────────────────────────────────────┼──────────────────────┘
                                            │
          ┌─────────────────────────────────┼──────────────────┐
          │                                 │                  │
    ┌─────▼─────┐                   ┌──────▼──────┐   ┌──────▼──────┐
    │  D1 数据库  │                   │  R2 存储     │   │ DeepSeek AI │
    │  10 张表    │                   │  图片上传     │   │ 周总结优化   │
    └───────────┘                   └─────────────┘   └─────────────┘`
  },
  tables: {
    title: '数据库表关系',
    content: `users ─────────┬────────────────────────────────────────────
  │            │
  ├──▶ tasks ──┼──▶ task_dependencies (多对多)
  │    │       └──▶ task_images (1:N)
  │    └──▶ tasks (自引用 parent_id)
  │
  ├──▶ habits ────▶ daily_logs (1:N, CASCADE)
  │
  ├──▶ weekly_summaries (1:N)
  ├──▶ share_links (1:N)
  ├──▶ activity_logs (1:N)
  └──▶ app_config (全局 KV)`
  },
  tableDetails: {
    title: '表结构说明',
    items: [
      { name: 'users', desc: '用户表', fields: 'id, username, password_hash, display_name, role' },
      { name: 'tasks', desc: '任务表（核心）', fields: 'id, user_id, name, status, assignee, priority, task_type, parent_id, start_date, deadline, notes' },
      { name: 'task_dependencies', desc: '任务依赖', fields: 'task_id, blocked_by_id' },
      { name: 'task_images', desc: '任务图片', fields: 'id, task_id, name, url, r2_key' },
      { name: 'habits', desc: '习惯表', fields: 'id, user_id, name, frequency, status, weekly_target, monthly_target, start_date, end_date' },
      { name: 'daily_logs', desc: '打卡记录', fields: 'id, habit_id, log_date, completed, notes' },
      { name: 'weekly_summaries', desc: '周总结', fields: 'id, user_id, week_start, week_end, year, week_number, data(JSON)' },
      { name: 'share_links', desc: '分享链接', fields: 'id, user_id, token, resource_type, password_hash, expires_at' },
      { name: 'activity_logs', desc: '活动日志', fields: 'id, user_id, action, entity_type, entity_id, metadata' },
      { name: 'app_config', desc: '全局配置', fields: 'key, value' },
    ]
  },
  taskStatus: {
    title: '任务状态流转',
    content: `待开始 → 进行中 → 已完成
              ↓
            已逾期（超过 deadline 自动流转）
              ↓
            已放弃

• 自动流转：到达 start_date 的待开始任务自动转为进行中
• 逾期流转：超过 deadline 的进行中任务每日 22:00 自动转为已逾期
• 删除任务：子任务自动释放为独立任务（parent_id = null）`
  },
  habitStatus: {
    title: '习惯状态',
    content: `生效 → 暂停 → 生效（恢复）
  ↓
失效

• 频率：每日 / 工作日 / 周末 / 每周 / 每月 / 不定期
• 打卡去重：同一习惯同一天只有一条记录（upsert）
• 删除习惯：级联删除所有打卡记录`
  },
  apiEndpoints: {
    title: '核心 API 端点',
    items: [
      { method: 'GET', path: '/api/tasks', desc: '任务列表' },
      { method: 'POST', path: '/api/tasks', desc: '创建任务' },
      { method: 'PUT', path: '/api/tasks/:id', desc: '更新任务' },
      { method: 'DELETE', path: '/api/tasks/:id', desc: '删除任务' },
      { method: 'GET', path: '/api/habits', desc: '习惯列表' },
      { method: 'POST', path: '/api/habits', desc: '创建习惯' },
      { method: 'DELETE', path: '/api/habits/:id', desc: '删除习惯' },
      { method: 'POST', path: '/api/daily-logs', desc: '打卡' },
      { method: 'GET', path: '/api/weekly-summary', desc: '周总结' },
      { method: 'POST', path: '/api/ai/optimize', desc: 'AI 优化' },
    ]
  },
  auth: {
    title: '认证机制',
    content: `• JWT Token 存储在 localStorage
• axios 拦截器自动注入 Authorization: Bearer <token>
• 401 响应自动清除 token

角色权限：
• owner — 完全权限，可管理用户和数据库
• editor — 可创建/编辑/删除内容
• viewer — 只读访问`
  }
}

export default function DbManager() {
  const [tables, setTables] = useState<DbTable[]>([])
  const [sql, setSql] = useState('')
  const [result, setResult] = useState<DbQueryResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingTables, setLoadingTables] = useState(true)
  const [showDocs, setShowDocs] = useState(false)
  const [activeDocSection, setActiveDocSection] = useState<string>('architecture')

  const loadTables = useCallback(async () => {
    try {
      setLoadingTables(true)
      const data = await fetchDbTables()
      setTables(data)
    } catch (err) {
      console.error('Failed to load tables:', err)
    } finally {
      setLoadingTables(false)
    }
  }, [])

  useEffect(() => { loadTables() }, [loadTables])

  const handleExecute = async () => {
    if (!sql.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const data = await executeDbQuery(sql.trim())
      setResult(data)
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Query failed')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleExecute()
    }
  }

  const handleTableClick = (tableName: string) => {
    setSql(`SELECT * FROM ${tableName} LIMIT 100`)
    setResult(null)
    setError('')
  }

  const handleExportCsv = () => {
    if (!result || result.rows.length === 0) return
    const header = result.columns.join(',')
    const rows = result.rows.map(row =>
      result.columns.map(col => {
        const val = row[col]
        if (val === null || val === undefined) return ''
        const str = String(val)
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"` : str
      }).join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `query_result_${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const docSections = [
    { id: 'architecture', label: '系统架构', icon: '🏗️' },
    { id: 'tables', label: '表关系图', icon: '🔗' },
    { id: 'tableDetails', label: '表结构说明', icon: '📋' },
    { id: 'taskStatus', label: '任务状态', icon: '✅' },
    { id: 'habitStatus', label: '习惯状态', icon: '🎯' },
    { id: 'apiEndpoints', label: 'API 端点', icon: '🔌' },
    { id: 'auth', label: '认证机制', icon: '🔐' },
  ]

  return (
    <div className="flex h-full">
      {/* Left: Table List */}
      <div className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Database size={16} className="text-purple-600" />
            数据表
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loadingTables ? (
            <div className="text-center py-4 text-gray-400 text-sm">加载中...</div>
          ) : (
            <div className="space-y-0.5">
              {tables.map(t => (
                <button
                  key={t.name}
                  onClick={() => handleTableClick(t.name)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-purple-50 transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Table2 size={14} className="text-gray-400 group-hover:text-purple-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700 group-hover:text-purple-700 truncate font-mono">{t.name}</span>
                  </div>
                  <span className="text-xs text-gray-400 group-hover:text-purple-500 flex-shrink-0 ml-2">{t.row_count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={loadTables}
            className="w-full text-xs text-gray-500 hover:text-purple-600 py-1.5 rounded hover:bg-purple-50 transition-colors"
          >
            刷新表列表
          </button>
        </div>
      </div>

      {/* Right: Query Editor + Results */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">数据库管理</h2>
            <p className="text-xs text-gray-500 mt-1">只读模式 · 支持 SELECT 查询 · Cmd+Enter 执行</p>
          </div>
          <button
            onClick={() => setShowDocs(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
          >
            <BookOpen size={16} />
            项目文档
          </button>
        </div>

        {/* SQL Editor */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <textarea
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full h-28 px-4 py-3 bg-white border border-gray-200 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            placeholder="输入 SQL 查询语句...&#10;例如: SELECT * FROM tasks WHERE status = '进行中' LIMIT 50"
            spellCheck={false}
          />
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handleExecute}
                disabled={loading || !sql.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                <Play size={14} />
                {loading ? '执行中...' : '执行'}
              </button>
              <button
                onClick={() => { setSql(''); setResult(null); setError('') }}
                className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm"
              >
                <Trash2 size={14} />
                清空
              </button>
            </div>
            {result && result.rows.length > 0 && (
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors text-sm"
              >
                <Download size={14} />
                导出 CSV
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto p-4">
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700">查询错误</p>
                <p className="text-sm text-red-600 mt-1 font-mono">{error}</p>
              </div>
            </div>
          )}

          {result && (
            <div>
              <div className="flex items-center gap-4 mb-3 text-sm text-gray-500">
                <span>返回 <strong className="text-gray-700">{result.row_count}</strong> 行</span>
                <span>耗时 <strong className="text-gray-700">{result.elapsed_ms}</strong> ms</span>
              </div>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {result.columns.map(col => (
                        <th key={col} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {result.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        {result.columns.map(col => (
                          <td key={col} className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap max-w-xs truncate font-mono" title={String(row[col] ?? '')}>
                            {row[col] === null ? <span className="text-gray-300 italic">NULL</span> : String(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!error && !result && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Database size={48} className="mb-4 opacity-30" />
              <p className="text-sm">选择左侧表名自动填充查询，或输入自定义 SQL</p>
              <p className="text-xs mt-2">常用查询示例：</p>
              <div className="mt-3 space-y-1.5 text-xs font-mono">
                <button onClick={() => setSql("SELECT name, status, COUNT(*) as cnt FROM tasks GROUP BY status")} className="block text-purple-500 hover:text-purple-700 hover:underline">
                  SELECT name, status, COUNT(*) FROM tasks GROUP BY status
                </button>
                <button onClick={() => setSql("SELECT name, frequency, status FROM habits ORDER BY created_at DESC")} className="block text-purple-500 hover:text-purple-700 hover:underline">
                  SELECT name, frequency, status FROM habits ORDER BY created_at DESC
                </button>
                <button onClick={() => setSql("SELECT log_date, COUNT(*) as cnt FROM daily_logs WHERE completed=1 GROUP BY log_date ORDER BY log_date DESC LIMIT 30")} className="block text-purple-500 hover:text-purple-700 hover:underline">
                  SELECT log_date, COUNT(*) FROM daily_logs WHERE completed=1 GROUP BY log_date
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Documentation Slide Panel */}
      {showDocs && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowDocs(false)} />
          
          {/* Panel */}
          <div className="fixed right-0 top-0 bottom-0 w-[520px] bg-white shadow-2xl flex flex-col animate-slide-in-right">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <BookOpen size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Personal Workbench</h3>
                  <p className="text-xs text-gray-500">项目架构文档</p>
                </div>
              </div>
              <button
                onClick={() => setShowDocs(false)}
                className="p-2 hover:bg-white/60 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar */}
              <div className="w-40 border-r border-gray-200 bg-gray-50 overflow-y-auto">
                <nav className="p-2 space-y-0.5">
                  {docSections.map(section => (
                    <button
                      key={section.id}
                      onClick={() => setActiveDocSection(section.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                        activeDocSection === section.id
                          ? 'bg-purple-100 text-purple-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-base">{section.icon}</span>
                      <span className="truncate">{section.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Main content */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeDocSection === 'architecture' && (
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-4">{PROJECT_DOCS.architecture.title}</h4>
                    <pre className="text-xs font-mono text-gray-700 bg-gray-50 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {PROJECT_DOCS.architecture.content}
                    </pre>
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>双部署模式：</strong>Pages Functions（生产）+ 独立 Worker（开发调试），共享同一 D1 数据库
                      </p>
                    </div>
                  </div>
                )}

                {activeDocSection === 'tables' && (
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-4">{PROJECT_DOCS.tables.title}</h4>
                    <pre className="text-xs font-mono text-gray-700 bg-gray-50 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {PROJECT_DOCS.tables.content}
                    </pre>
                  </div>
                )}

                {activeDocSection === 'tableDetails' && (
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-4">{PROJECT_DOCS.tableDetails.title}</h4>
                    <div className="space-y-3">
                      {PROJECT_DOCS.tableDetails.items.map(table => (
                        <div key={table.name} className="border border-gray-200 rounded-lg p-3 hover:border-purple-300 transition-colors">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-sm font-bold text-purple-600">{table.name}</code>
                            <span className="text-xs text-gray-500">— {table.desc}</span>
                          </div>
                          <p className="text-xs text-gray-600 font-mono leading-relaxed">{table.fields}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeDocSection === 'taskStatus' && (
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-4">{PROJECT_DOCS.taskStatus.title}</h4>
                    <pre className="text-xs font-mono text-gray-700 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap leading-relaxed">
                      {PROJECT_DOCS.taskStatus.content}
                    </pre>
                  </div>
                )}

                {activeDocSection === 'habitStatus' && (
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-4">{PROJECT_DOCS.habitStatus.title}</h4>
                    <pre className="text-xs font-mono text-gray-700 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap leading-relaxed">
                      {PROJECT_DOCS.habitStatus.content}
                    </pre>
                  </div>
                )}

                {activeDocSection === 'apiEndpoints' && (
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-4">{PROJECT_DOCS.apiEndpoints.title}</h4>
                    <div className="space-y-1.5">
                      {PROJECT_DOCS.apiEndpoints.items.map((api, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 transition-colors">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            api.method === 'GET' ? 'bg-green-100 text-green-700' :
                            api.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                            api.method === 'PUT' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {api.method}
                          </span>
                          <code className="text-sm font-mono text-gray-700 flex-1">{api.path}</code>
                          <span className="text-xs text-gray-500">{api.desc}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-4">完整 API 文档请查看 docs/PROJECT_WIKI.md</p>
                  </div>
                )}

                {activeDocSection === 'auth' && (
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-4">{PROJECT_DOCS.auth.title}</h4>
                    <pre className="text-xs font-mono text-gray-700 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap leading-relaxed">
                      {PROJECT_DOCS.auth.content}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
              完整文档：<code className="bg-gray-200 px-1.5 py-0.5 rounded">docs/PROJECT_WIKI.md</code>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

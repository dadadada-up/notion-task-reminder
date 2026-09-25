import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Lock, Eye, Calendar, Tag, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export default function ShareViewPage() {
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [requiresPassword, setRequiresPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [data, setData] = useState<any>(null)

  const fetchShare = async (pwd?: string) => {
    setLoading(true)
    setError('')
    try {
      const url = `${API_BASE_URL}/share/${token}${pwd ? `?password=${encodeURIComponent(pwd)}` : ''}`
      const resp = await axios.get(url)
      if (resp.data.success) {
        setData(resp.data.data)
        setRequiresPassword(false)
      }
    } catch (err: any) {
      const respData = err.response?.data
      if (respData?.requiresPassword) {
        setRequiresPassword(true)
        setError(respData.error)
      } else {
        setError(respData?.error || '加载失败')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) fetchShare()
  }, [token])

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchShare(password)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  if (error && !requiresPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">无法查看</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  if (requiresPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-sm w-full">
          <Lock className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-center mb-2">此内容需要密码</h2>
          <p className="text-gray-500 text-center text-sm mb-6">{data?.title || '分享内容'}</p>
          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              查看内容
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800">{data.title || '分享内容'}</h1>
            <span className="flex items-center gap-1 text-sm text-gray-400">
              <Eye className="w-4 h-4" /> {data.viewCount}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <Tag className="w-4 h-4" />
            <span>
              {data.resourceType === 'task' && '任务详情'}
              {data.resourceType === 'board' && '任务看板'}
              {data.resourceType === 'weekly_summary' && '周总结'}
              {data.resourceType === 'habit_dashboard' && '习惯看板'}
            </span>
          </div>
        </div>

        {/* Content */}
        {data.resourceType === 'task' && data.content?.task && (
          <TaskView task={data.content.task} />
        )}
        {data.resourceType === 'board' && data.content?.tasks && (
          <BoardView tasks={data.content.tasks} />
        )}
        {data.resourceType === 'habit_dashboard' && data.content && (
          <HabitView habits={data.content.habits} logs={data.content.recentLogs} />
        )}
        {data.resourceType === 'weekly_summary' && data.content?.summary && (
          <WeeklyView summary={data.content.summary} />
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-400 mt-8">
          来自 Personal Workbench
        </div>
      </div>
    </div>
  )
}

// --- Sub-views ---

function TaskView({ task }: { task: any }) {
  const statusColors: Record<string, string> = {
    '已完成': 'bg-green-100 text-green-700',
    '进行中': 'bg-blue-100 text-blue-700',
    '待开始': 'bg-yellow-100 text-yellow-700',
    '已逾期': 'bg-orange-100 text-orange-700',
    '已放弃': 'bg-red-100 text-red-700'
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">{task.name}</h2>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 w-16">状态</span>
          <span className={`px-3 py-1 rounded-full text-sm ${statusColors[task.status] || 'bg-gray-100'}`}>
            {task.status}
          </span>
        </div>
        {task.priority && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-16">优先级</span>
            <span className="text-sm">{task.priority}</span>
          </div>
        )}
        {task.task_type && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-16">类型</span>
            <span className="text-sm">{task.task_type}</span>
          </div>
        )}
        {task.assignee && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-16">负责人</span>
            <span className="text-sm">{task.assignee}</span>
          </div>
        )}
        {task.deadline && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-16">截止日期</span>
            <span className="text-sm flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {task.deadline}
            </span>
          </div>
        )}
        {task.notes && (
          <div className="mt-4 pt-4 border-t">
            <span className="text-sm text-gray-500 block mb-2">备注</span>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function BoardView({ tasks }: { tasks: any[] }) {
  const grouped = {
    '进行中': tasks.filter(t => t.status === '进行中'),
    '待开始': tasks.filter(t => t.status === '待开始'),
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([status, items]) => (
        <div key={status} className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            {status === '进行中' ? <Clock className="w-5 h-5 text-blue-500" /> : <CheckCircle2 className="w-5 h-5 text-gray-400" />}
            {status} <span className="text-sm text-gray-400 font-normal">({items.length})</span>
          </h3>
          <div className="space-y-2">
            {items.map((t, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">{t.name}</span>
                <span className="text-xs text-gray-400">{t.priority?.split(' ')[0]}</span>
              </div>
            ))}
            {items.length === 0 && <p className="text-sm text-gray-400">暂无任务</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

function HabitView({ habits, logs }: { habits: any[]; logs: any[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4">我的习惯</h3>
      <div className="space-y-3">
        {habits.map((h: any) => (
          <div key={h.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <span className="font-medium">{h.name}</span>
              <span className="text-xs text-gray-400 ml-2">{h.frequency}</span>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${h.status === '生效' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
              {h.status}
            </span>
          </div>
        ))}
      </div>
      {logs && logs.length > 0 && (
        <div className="mt-6 pt-4 border-t">
          <h4 className="text-sm font-medium text-gray-500 mb-3">最近打卡</h4>
          <div className="text-sm text-gray-600">
            共 {logs.length} 条记录（近30天）
          </div>
        </div>
      )}
    </div>
  )
}

function WeeklyView({ summary }: { summary: any }) {
  const data = typeof summary.data === 'string' ? (() => { try { return JSON.parse(summary.data) } catch { return null } })() : summary.data
  const goals = data?.goals || []
  const habits = data?.habits || {}
  const stats = data?.stats || {}
  const completed = goals.filter((g: any) => g.status === '已完成')
  const inProgress = goals.filter((g: any) => g.status === '进行中')

  return (
    <div className="space-y-4">
      {/* 概览卡片 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-1">
          {summary.year ? `${summary.year}年第${summary.week_number}周总结` : '周总结'}
        </h3>
        <p className="text-sm text-gray-500 mb-4">{summary.week_start} ~ {summary.week_end}</p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600">{stats.completed ?? completed.length}</div>
            <div className="text-xs text-gray-500 mt-1">已完成</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-600">{stats.in_progress ?? inProgress.length}</div>
            <div className="text-xs text-gray-500 mt-1">进行中</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-purple-600">
              {habits.statistics ? `${habits.statistics.completed}/${habits.statistics.total}` : '—'}
            </div>
            <div className="text-xs text-gray-500 mt-1">习惯打卡</div>
          </div>
        </div>
      </div>

      {/* 目标列表 */}
      {goals.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h4 className="font-semibold text-gray-700 mb-3">本周目标</h4>
          <div className="space-y-2">
            {goals.map((g: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50">
                <div className="flex items-center gap-2">
                  {g.status === '已完成'
                    ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    : <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                  <span className="text-sm font-medium text-gray-700">{g.task || g.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {g.type && <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-600">{g.type}</span>}
                  <span className={`text-xs px-2 py-0.5 rounded ${g.status === '已完成' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {g.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 习惯打卡 */}
      {habits.habit_items && habits.habit_items.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h4 className="font-semibold text-gray-700 mb-3">习惯打卡</h4>
          <div className="flex flex-wrap gap-2">
            {habits.habit_items.map((name: string, i: number) => (
              <span key={i} className="text-sm px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {name}
              </span>
            ))}
          </div>
          {habits.statistics && (
            <p className="text-xs text-gray-400 mt-3">
              本周累计打卡 {habits.statistics.completed}/{habits.statistics.total} 次
            </p>
          )}
        </div>
      )}
    </div>
  )
}

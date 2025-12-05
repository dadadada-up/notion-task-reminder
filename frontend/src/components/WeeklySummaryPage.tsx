import { useState, useEffect } from 'react'
import { WeeklySummary } from '../types'
import { fetchWeeklySummary, pushWeeklySummary, fetchAvailableWeeks, fetchWeeklySummaryMarkdown } from '../api'
import { Calendar, TrendingUp, Lightbulb, MessageSquare, Send, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'

const WeeklySummaryPage = () => {
  const [summary, setSummary] = useState<WeeklySummary | null>(null)
  const [selectedWeek, setSelectedWeek] = useState('current')
  const [loading, setLoading] = useState(true)
  const [expandedTypes, setExpandedTypes] = useState<string[]>([])
  const [pushing, setPushing] = useState(false)
  const [availableWeeks, setAvailableWeeks] = useState<any[]>([])
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview')
  const [markdown, setMarkdown] = useState('')
  const [copied, setCopied] = useState(false)
  const [loadingMarkdown, setLoadingMarkdown] = useState(false)

  useEffect(() => {
    loadAvailableWeeks()
  }, [])

  useEffect(() => {
    loadSummary()
    setMarkdown('') // 清空 markdown 缓存
    setViewMode('preview') // 重置为预览模式
  }, [selectedWeek])

  const loadAvailableWeeks = async () => {
    try {
      const weeks = await fetchAvailableWeeks(52)
      setAvailableWeeks(weeks)
    } catch (error) {
      console.error('Failed to load available weeks:', error)
    }
  }

  const loadSummary = async () => {
    setLoading(true)
    try {
      const data = await fetchWeeklySummary(selectedWeek)
      setSummary(data)
    } catch (error) {
      console.error('Failed to load summary:', error)
      alert('加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handlePush = async () => {
    if (!summary) return
    
    setPushing(true)
    try {
      await pushWeeklySummary(selectedWeek, ['pushplus'])
      alert('推送成功！')
    } catch (error) {
      console.error('Push failed:', error)
      alert('推送失败，请重试')
    } finally {
      setPushing(false)
    }
  }

  const loadMarkdown = async () => {
    if (!summary || markdown) return
    
    setLoadingMarkdown(true)
    try {
      const data = await fetchWeeklySummaryMarkdown(selectedWeek)
      setMarkdown(data.markdown)
    } catch (error) {
      console.error('Failed to generate markdown:', error)
      alert('生成 Markdown 失败，请重试')
    } finally {
      setLoadingMarkdown(false)
    }
  }

  const handleViewModeChange = async (mode: 'preview' | 'source') => {
    setViewMode(mode)
    if (mode === 'source' && !markdown) {
      await loadMarkdown()
    }
  }

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
      alert('复制失败，请重试')
    }
  }

  const toggleType = (type: string) => {
    setExpandedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      '家庭生活': '🏠',
      '工作学习': '💼',
      '理财投资': '💰',
      '个人成长': '📚',
      '健康运动': '💪',
    }
    return icons[type] || '📌'
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      '家庭生活': '#4CAF50',
      '工作学习': '#2196F3',
      '理财投资': '#FF9800',
      '个人成长': '#9C27B0',
      '健康运动': '#F44336',
    }
    return colors[type] || '#757575'
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }

  const getWeekdayName = (dateStr: string) => {
    const date = new Date(dateStr)
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return days[date.getDay()]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">暂无数据</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-800">📖 我的一周</h1>
        </div>
        <select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="current">本周</option>
          <option value="last">上周</option>
          {availableWeeks.map((week) => (
            <option key={week.week_start} value={week.week_start}>
              {week.year}年第{week.week_number}周 ({week.task_count}件)
            </option>
          ))}
        </select>
      </div>

      {/* 周期信息和模式切换 */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <p className="text-lg text-gray-700">
            📅 {summary.year}年第{summary.week_number}周 ({formatDate(summary.week_start)} - {formatDate(summary.week_end)})
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleViewModeChange('preview')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'preview'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              👁️ 预览模式
            </button>
            <button
              onClick={() => handleViewModeChange('source')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'source'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              📝 源码模式
            </button>
            {viewMode === 'source' && (
              <button
                onClick={handleCopyMarkdown}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    复制
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      {viewMode === 'preview' ? (
        <>
      {/* 本周主题 */}
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-6 h-6 text-purple-600 mt-1" />
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              🎯 本周主题：{summary.theme.title}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {summary.theme.description}
            </p>
          </div>
        </div>
      </div>

      {/* 本周完成概览 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          📊 本周完成概览 (共 {summary.completed.total} 件事)
        </h2>

        <div className="space-y-6">
          {Object.entries(summary.completed.by_type).map(([type, data]) => (
            <div key={type} className="border rounded-lg overflow-hidden">
              {/* 类型头部 */}
              <div
                className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleType(type)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-2xl">{getTypeIcon(type)}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-800">{type}</h3>
                      <span className="text-sm text-gray-500">
                        ({data.count}件) - {data.percentage}%
                      </span>
                    </div>
                    {/* 进度条 */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${data.percentage}%`,
                          backgroundColor: getTypeColor(type)
                        }}
                      />
                    </div>
                  </div>
                </div>
                {expandedTypes.includes(type) ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>

              {/* 展开内容 */}
              {expandedTypes.includes(type) && (
                <div className="p-4 bg-white border-t">
                  <div className="mb-3">
                    <p className="text-sm text-gray-500 mb-1">重点事项：</p>
                    <p className="text-gray-700">{data.key_items.join('、')}</p>
                  </div>
                  <div className="mb-4">
                    <p className="text-gray-700 leading-relaxed">{data.summary}</p>
                  </div>

                  {/* 任务列表 */}
                  <div className="space-y-2">
                    {data.tasks.map(task => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded border-l-3"
                        style={{ borderLeftColor: getTypeColor(type) }}
                      >
                        <div className="flex items-center gap-2">
                          <span>✅</span>
                          <span className="font-medium text-gray-800">{task.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span>{task.priority}</span>
                          <span>
                            {task.completed_time && formatDate(task.completed_time)} {task.completed_time && getWeekdayName(task.completed_time)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 值得记录的时刻 */}
      {summary.highlights.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-6 h-6 text-yellow-600 mt-1" />
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-800 mb-4">💡 值得记录的时刻</h2>
              <div className="space-y-4">
                {summary.highlights.map((highlight, index) => (
                  <div key={index}>
                    <h3 className="font-semibold text-gray-800 mb-1">
                      🌟 {highlight.title}
                    </h3>
                    <p className="text-gray-700 leading-relaxed pl-6">
                      {highlight.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 一些思考 */}
      {(summary.reflections.suggestions.length > 0 || summary.reflections.concerns.length > 0) && (
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-6 h-6 text-blue-600 mt-1" />
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-800 mb-4">🤔 一些思考</h2>

              {summary.reflections.suggestions.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-800 mb-2">💭 下周可以考虑：</h3>
                  <ul className="space-y-2 pl-6">
                    {summary.reflections.suggestions.map((suggestion, index) => (
                      <li key={index} className="text-gray-700 list-disc">
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.reflections.concerns.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">📌 需要关注：</h3>
                  <ul className="space-y-2 pl-6">
                    {summary.reflections.concerns.map((concern, index) => (
                      <li key={index} className="text-gray-700 list-disc">
                        {concern}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-4">
        <button
          onClick={handlePush}
          disabled={pushing}
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" />
          {pushing ? '推送中...' : '📤 推送周记'}
        </button>
      </div>
      </>
      ) : (
        <>
      {/* Markdown 源码视图 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {loadingMarkdown ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">生成 Markdown 中...</p>
            </div>
          </div>
        ) : (
          <pre className="bg-gray-50 p-6 rounded-lg text-sm font-mono whitespace-pre-wrap break-words overflow-auto max-h-[70vh] border border-gray-200">
            {markdown}
          </pre>
        )}
      </div>
      </>
      )}
    </div>
  )
}

export default WeeklySummaryPage

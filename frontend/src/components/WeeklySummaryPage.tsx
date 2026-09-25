import { useState, useEffect } from 'react'
import { fetchAvailableWeeks, fetchNewFormatSummary, pushWeeklySummary, saveNewFormatSummary, aiOptimizeSummary, createShareLink } from '../api'
import { Calendar, Send, Check, Edit2, Share2 } from 'lucide-react'
import NewFormatPreview from './NewFormatPreview'
import WeeklySummaryEditor from './WeeklySummaryEditor'
import { useToast } from './ui/Toast'

const WeeklySummaryPage = () => {
  const toast = useToast()
  const [summary, setSummary] = useState<any>(null)
  const [selectedWeek, setSelectedWeek] = useState('current')
  const [loading, setLoading] = useState(true)
  const [pushing, setPushing] = useState(false)
  const [availableWeeks, setAvailableWeeks] = useState<any[]>([])
  const [editMode, setEditMode] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    loadAvailableWeeks()
  }, [])

  useEffect(() => {
    loadSummary()
    setEditMode(false)
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
      const data = await fetchNewFormatSummary(selectedWeek)
      setSummary(data)
    } catch (error) {
      console.error('Failed to load summary:', error)
      toast.error('加载失败', '请重试')
    } finally {
      setLoading(false)
    }
  }

  const handlePush = async () => {
    if (!summary) return

    setPushing(true)
    try {
      // 默认使用钉钉机器人推送
      const result = await pushWeeklySummary(selectedWeek, ['dingtalk'])
      if (result.success) {
        toast.success('推送成功', '已通过钉钉机器人发送')
      } else {
        toast.error('推送失败', result.message || '未知错误')
      }
    } catch (error: any) {
      console.error('Push failed:', error)
      toast.error('推送失败', error.message || '请重试')
    } finally {
      setPushing(false)
    }
  }

  const handleShare = async () => {
    setSharing(true)
    try {
      const title = `${summary.year}年第${summary.week_number}周总结`
      // 用 week_start 作为 resourceId，后端按此查找周报数据
      const result = await createShareLink('weekly_summary', summary.week_start, title)
      const shareUrl = `${window.location.origin}/share/${result.token}`
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error: any) {
      console.error('Share failed:', error)
      toast.error('生成分享链接失败', error.message || '请重试')
    } finally {
      setSharing(false)
    }
  }

  const handleSave = async (editedData: any) => {
    try {
      // 保存到后端
      await saveNewFormatSummary(selectedWeek, editedData)
      setSummary(editedData)
      setEditMode(false)
      toast.success('保存成功')
    } catch (error) {
      console.error('Save failed:', error)
      toast.error('保存失败', '请重试')
    }
  }

  const handleAIOptimize = async (section: string, data: any) => {
    try {
      // 准备上下文数据
      const context = {
        total_tasks: summary?.goals?.length || 0,
        tasks_data: {
          total: summary?.goals?.length || 0,
          by_type: {}
        },
        habits_data: summary?.habits || {},
        history_data: {}
      }
      
      // 调用AI优化
      const optimized = await aiOptimizeSummary(section, data, context)
      return optimized
    } catch (error) {
      console.error('AI optimize failed:', error)
      throw error
    }
  }



  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}月${date.getDate()}日`
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
          <h1 className="text-3xl font-bold text-gray-800">我的一周</h1>
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

      {/* 周期信息 */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <p className="text-lg text-gray-700 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-gray-500" />
            {summary.year}年第{summary.week_number}周 ({formatDate(summary.week_start)} - {formatDate(summary.week_end)})
          </p>
          <div className="flex items-center gap-2">
            {!editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                编辑
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      {editMode ? (
        <WeeklySummaryEditor
          summary={summary}
          onSave={handleSave}
          onCancel={() => setEditMode(false)}
          onAIOptimize={handleAIOptimize}
        />
      ) : (
        <>
          <NewFormatPreview summary={summary} />

          {/* 操作按钮 */}
          <div className="flex gap-4">
            <button
              onClick={handlePush}
              disabled={pushing}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
              {pushing ? '推送中...' : '推送'}
            </button>
            <button
              onClick={handleShare}
              disabled={sharing}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {sharing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  生成中...
                </>
              ) : copied ? (
                <>
                  <Check className="w-5 h-5" />
                  已复制
                </>
              ) : (
                <>
                  <Share2 className="w-5 h-5" />
                  分享
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default WeeklySummaryPage

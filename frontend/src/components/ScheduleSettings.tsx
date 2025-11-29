import { useState, useEffect } from 'react'
import { X, Clock, Save, Plus, Trash2 } from 'lucide-react'
import { getSchedules, saveSchedules } from '../api'

interface ScheduleItem {
  id: string
  type: 'daily_todo' | 'daily_done'
  time: string
  enabled: boolean
  title?: string
  message?: string
  channels?: ('pushplus' | 'email')[]
  customMessage?: string  // 保留向后兼容
}

interface ScheduleSettingsProps {
  isOpen: boolean
  onClose: () => void
}

const ScheduleSettings = ({ isOpen, onClose }: ScheduleSettingsProps) => {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadSchedules()
    }
  }, [isOpen])

  const loadSchedules = async () => {
    setLoading(true)
    try {
      const data = await getSchedules()
      // 确保data是数组
      if (Array.isArray(data)) {
        setSchedules(data)
      } else {
        console.error('Invalid schedule data:', data)
        // 使用默认配置
        setSchedules([
          {
            id: '1',
            type: 'daily_todo',
            time: '09:00',
            enabled: true,
            customMessage: '早上好！今天的任务已为您准备好 💪'
          },
          {
            id: '2',
            type: 'daily_done',
            time: '21:00',
            enabled: true,
            customMessage: '晚上好！今天辛苦了，看看完成了多少任务 ✨'
          }
        ])
      }
    } catch (error) {
      console.error('Failed to load schedules:', error)
      // 加载失败时使用默认配置
      setSchedules([
        {
          id: '1',
          type: 'daily_todo',
          time: '09:00',
          enabled: true,
          customMessage: '早上好！今天的任务已为您准备好 💪'
        },
        {
          id: '2',
          type: 'daily_done',
          time: '21:00',
          enabled: true,
          customMessage: '晚上好！今天辛苦了，看看完成了多少任务 ✨'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const addSchedule = () => {
    const newSchedule: ScheduleItem = {
      id: Date.now().toString(),
      type: 'daily_todo',
      time: '12:00',
      enabled: true,
      customMessage: ''
    }
    setSchedules([...schedules, newSchedule])
  }

  const removeSchedule = (id: string) => {
    setSchedules(schedules.filter(s => s.id !== id))
  }

  const updateSchedule = (id: string, updates: Partial<ScheduleItem>) => {
    setSchedules(schedules.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await saveSchedules(schedules)
      
      if (result.success) {
        alert('✅ 定时任务配置已保存！\n\nGitHub Actions workflow 已自动更新，定时任务将按配置运行。')
        onClose()
      } else {
        alert('保存失败：' + result.error)
      }
    } catch (error) {
      console.error('Failed to save schedules:', error)
      alert('保存失败：' + error)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const getTypeLabel = (type: string) => {
    return type === 'daily_todo' ? '📋 今日待办' : '✅ 今日完成'
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="w-6 h-6 text-purple-600" />
                定时消息设置
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                配置每日自动推送的时间和内容
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              </div>
            ) : (
            <div className="space-y-4">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* 启用开关 */}
                    <div className="flex items-center pt-2">
                      <input
                        type="checkbox"
                        checked={schedule.enabled}
                        onChange={(e) => updateSchedule(schedule.id, { enabled: e.target.checked })}
                        className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                    </div>

                    {/* 配置项 */}
                    <div className="flex-1 space-y-3">
                      {/* 第一行：类型和时间 */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            消息类型
                          </label>
                          <select
                            value={schedule.type}
                            onChange={(e) => updateSchedule(schedule.id, { type: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            disabled={!schedule.enabled}
                          >
                            <option value="daily_todo">📋 今日待办</option>
                            <option value="daily_done">✅ 今日完成</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            推送时间
                          </label>
                          <input
                            type="time"
                            value={schedule.time}
                            onChange={(e) => updateSchedule(schedule.id, { time: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            disabled={!schedule.enabled}
                          />
                        </div>
                      </div>

                      {/* 第二行：自定义消息 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          自定义消息（可选）
                        </label>
                        <input
                          type="text"
                          value={schedule.customMessage || ''}
                          onChange={(e) => updateSchedule(schedule.id, { customMessage: e.target.value })}
                          placeholder="添加个性化的问候语..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          disabled={!schedule.enabled}
                        />
                      </div>

                      {/* 预览 */}
                      {schedule.enabled && (
                        <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                          <p className="text-xs font-medium text-purple-700 mb-1">预览</p>
                          <p className="text-sm text-gray-700">
                            {schedule.customMessage || getTypeLabel(schedule.type)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            每天 {schedule.time} 自动发送
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 删除按钮 */}
                    <button
                      onClick={() => removeSchedule(schedule.id)}
                      className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                      title="删除此定时任务"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* 添加按钮 */}
              <button
                onClick={addSchedule}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
              >
                <Plus className="w-5 h-5" />
                添加定时任务
              </button>

              {/* 说明 */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">💡 使用说明</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>今日待办</strong>：发送当天需要处理的任务列表</li>
                  <li>• <strong>今日完成</strong>：发送当天已完成的任务统计</li>
                  <li>• 可以设置多个定时任务，在不同时间发送不同类型的消息</li>
                  <li>• 自定义消息会显示在推送通知的开头</li>
                  <li>• 取消勾选可以临时禁用某个定时任务</li>
                </ul>
              </div>
            </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? '保存中...' : '保存设置'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ScheduleSettings

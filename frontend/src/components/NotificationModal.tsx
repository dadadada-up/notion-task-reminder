import { useState } from 'react'
import { X, Send } from 'lucide-react'
import { sendNotification } from '../api'

interface NotificationModalProps {
  isOpen: boolean
  onClose: () => void
}

const NotificationModal = ({ isOpen, onClose }: NotificationModalProps) => {
  const [type, setType] = useState<'daily_todo' | 'daily_done' | 'both'>('daily_todo')
  const [channels, setChannels] = useState<string[]>(['pushplus'])
  const [customTitle, setCustomTitle] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [sending, setSending] = useState(false)

  if (!isOpen) return null

  const handleChannelToggle = (channel: string) => {
    if (channels.includes(channel)) {
      setChannels(channels.filter(c => c !== channel))
    } else {
      setChannels([...channels, channel])
    }
  }

  const handleSend = async () => {
    if (channels.length === 0) {
      alert('请至少选择一个推送渠道')
      return
    }

    setSending(true)
    try {
      const result = await sendNotification(type, channels, customTitle, customMessage)
      
      if (result.success) {
        alert('通知发送成功！')
        onClose()
      } else {
        alert(`发送失败: ${result.error || '未知错误'}`)
      }
    } catch (error: any) {
      alert(`发送失败: ${error.message || error}`)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">发送提醒</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* 消息类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              消息类型
            </label>
            <div className="space-y-2">
              <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="type"
                  value="daily_todo"
                  checked={type === 'daily_todo'}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-3">
                  <span className="font-medium text-gray-900">📋 今日待办</span>
                  <span className="text-sm text-gray-500 ml-2">发送今天需要处理的任务</span>
                </span>
              </label>
              
              <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="type"
                  value="daily_done"
                  checked={type === 'daily_done'}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-3">
                  <span className="font-medium text-gray-900">✅ 今日完成</span>
                  <span className="text-sm text-gray-500 ml-2">发送今天已完成的任务</span>
                </span>
              </label>
              
              <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="type"
                  value="both"
                  checked={type === 'both'}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-3">
                  <span className="font-medium text-gray-900">📊 全部发送</span>
                  <span className="text-sm text-gray-500 ml-2">同时发送待办和完成任务</span>
                </span>
              </label>
            </div>
          </div>

          {/* 推送渠道 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              推送渠道
            </label>
            <div className="space-y-2">
              <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={channels.includes('pushplus')}
                  onChange={() => handleChannelToggle('pushplus')}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="ml-3 font-medium text-gray-900">📱 PushPlus</span>
              </label>
              
              <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={channels.includes('email')}
                  onChange={() => handleChannelToggle('email')}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="ml-3 font-medium text-gray-900">📧 邮箱</span>
              </label>
            </div>
          </div>

          {/* 自定义标题 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              自定义标题（可选）
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="留空则使用默认标题"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 自定义消息 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              自定义消息（可选，支持 HTML）
            </label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="留空则使用默认消息格式"
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="mt-2 text-sm text-gray-500">
              💡 提示：可以使用 HTML 标签来格式化消息，例如 &lt;p&gt;、&lt;strong&gt;、&lt;br&gt; 等
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={sending}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleSend}
            disabled={sending || channels.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Send className="w-4 h-4 mr-2" />
            {sending ? '发送中...' : '发送'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotificationModal

import { useState, useEffect } from 'react'
import {
  X, Bell, Send, Clock, Settings, CheckCircle, XCircle, AlertCircle,
  Smartphone, Mail, MessageSquare, Save, Plus, Trash2, Lightbulb,
  ClipboardList, BarChart3, RefreshCw, Zap
} from 'lucide-react'
import {
  fetchNotificationCenterStatus, saveChannelConfig, testChannel,
  sendNotification, saveSchedules,
  type ChannelStatus, type NotificationCenterStatus
} from '../api'
import { useToast } from './ui/Toast'

type TabKey = 'channels' | 'send' | 'schedule'

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
  defaultTab?: TabKey
}

interface ScheduleItem {
  id: string
  type: 'daily_todo' | 'daily_done'
  time: string
  enabled: boolean
  channels?: string[]
  customTitle?: string
  customMessage?: string
}

// ==================== 默认配置 ====================
const DEFAULT_CONFIG = {
  push: { pushplusToken: '', wxpusherToken: '', wxpusherUid: '' },
  email: { enabled: false, smtpServer: '', smtpPort: '587', sender: '', receiver: '', password: '' },
  github: { token: '', repository: '' },
}

const NotificationCenter = ({ isOpen, onClose, defaultTab = 'channels' }: NotificationCenterProps) => {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<NotificationCenterStatus | null>(null)

  // 渠道配置状态
  const [channelConfig, setChannelConfig] = useState<any>(null)
  const [savingConfig, setSavingConfig] = useState(false)
  const [testingChannel, setTestingChannel] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ channel: string; success: boolean; message: string } | null>(null)

  // 手动发送状态
  const [sendType, setSendType] = useState<'daily_todo' | 'daily_done' | 'both'>('daily_todo')
  const [sendChannels, setSendChannels] = useState<string[]>(['pushplus'])
  const [customTitle, setCustomTitle] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [sending, setSending] = useState(false)

  // 定时任务状态
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [savingSchedules, setSavingSchedules] = useState(false)

  // 加载聚合状态
  useEffect(() => {
    if (isOpen) {
      loadStatus()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && defaultTab) {
      setActiveTab(defaultTab)
    }
  }, [isOpen, defaultTab])

  const loadStatus = async () => {
    setLoading(true)
    try {
      const data = await fetchNotificationCenterStatus()
      setStatus(data)
      setSchedules(data.schedules || [])

      // 用后端返回的脱敏配置初始化表单（如果有值则回显）
      const formConfig = (data as any).config
      if (formConfig) {
        setChannelConfig({
          push: {
            pushplusToken: formConfig.push?.pushplusToken || '',
            wxpusherToken: formConfig.push?.wxpusherToken || '',
            wxpusherUid: formConfig.push?.wxpusherUid || '',
          },
          email: {
            enabled: formConfig.email?.enabled || false,
            smtpServer: formConfig.email?.smtpServer || '',
            smtpPort: formConfig.email?.smtpPort || '587',
            sender: formConfig.email?.sender || '',
            receiver: formConfig.email?.receiver || '',
            password: formConfig.email?.password || '',
          },
          github: {
            token: formConfig.github?.token || '',
            repository: formConfig.github?.repository || '',
          },
        })
      } else {
        // fallback: 使用空默认值
        setChannelConfig({
          push: { ...DEFAULT_CONFIG.push },
          email: { ...DEFAULT_CONFIG.email, enabled: data.channels.email?.enabled || false },
          github: { ...DEFAULT_CONFIG.github },
        })
      }
    } catch (error) {
      console.error('加载通知中心状态失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // ==================== 渠道配置 Tab ====================
  const handleSaveConfig = async () => {
    setSavingConfig(true)
    try {
      const result = await saveChannelConfig(channelConfig)
      if (result.success) {
        toast.success('渠道配置已保存')
        loadStatus() // 刷新状态
      } else {
        toast.error('保存失败', result.error || '未知错误')
      }
    } catch (error: any) {
      toast.error('保存失败', error.message || String(error))
    } finally {
      setSavingConfig(false)
    }
  }

  const handleTestChannel = async (channel: string) => {
    setTestingChannel(channel)
    setTestResult(null)
    try {
      const result = await testChannel(channel)
      setTestResult({
        channel,
        success: result.success,
        message: result.success ? '测试消息发送成功' : ((result as any).data?.result?.error || '发送失败')
      })
    } catch (error: any) {
      setTestResult({
        channel,
        success: false,
        message: error.message || '测试失败'
      })
    } finally {
      setTestingChannel(null)
    }
  }

  const updateConfigField = (section: string, field: string, value: any) => {
    setChannelConfig({
      ...channelConfig,
      [section]: { ...channelConfig[section], [field]: value }
    })
  }

  const getStatusBadge = (ch: ChannelStatus | undefined) => {
    if (!ch) return <span className="text-xs text-gray-400">未知</span>
    if (ch.status === 'configured') {
      return <span className="inline-flex items-center gap-1 text-xs text-green-600"><CheckCircle className="w-3 h-3" />已配置</span>
    }
    if (ch.status === 'disabled') {
      return <span className="inline-flex items-center gap-1 text-xs text-gray-400"><XCircle className="w-3 h-3" />未启用</span>
    }
    return <span className="inline-flex items-center gap-1 text-xs text-yellow-600"><AlertCircle className="w-3 h-3" />未配置</span>
  }

  // ==================== 手动发送 Tab ====================
  const handleSend = async () => {
    if (sendChannels.length === 0) {
      toast.warning('请至少选择一个推送渠道')
      return
    }
    setSending(true)
    try {
      const result = await sendNotification(sendType, sendChannels, customTitle, customMessage)
      if (result.success) {
        toast.success('通知发送成功')
        onClose()
      } else {
        toast.error('发送失败', result.error || '未知错误')
      }
    } catch (error: any) {
      toast.error('发送失败', error.message || String(error))
    } finally {
      setSending(false)
    }
  }

  const toggleSendChannel = (channel: string) => {
    if (sendChannels.includes(channel)) {
      setSendChannels(sendChannels.filter(c => c !== channel))
    } else {
      setSendChannels([...sendChannels, channel])
    }
  }

  // ==================== 定时任务 Tab ====================
  const addSchedule = () => {
    const newSchedule: ScheduleItem = {
      id: Date.now().toString(),
      type: 'daily_todo',
      time: '12:00',
      enabled: true,
      channels: ['pushplus'],
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

  const handleSaveSchedules = async () => {
    setSavingSchedules(true)
    try {
      const result = await saveSchedules(schedules)
      if (result.success) {
        toast.success('定时任务已保存')
        onClose()
      } else {
        toast.error('保存失败', result.error || '未知错误')
      }
    } catch (error) {
      toast.error('保存失败', String(error))
    } finally {
      setSavingSchedules(false)
    }
  }

  if (!isOpen) return null

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'channels', label: '渠道配置', icon: <Settings className="w-4 h-4" /> },
    { key: 'send', label: '手动发送', icon: <Send className="w-4 h-4" /> },
    { key: 'schedule', label: '定时任务', icon: <Clock className="w-4 h-4" /> },
  ]

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
            <div className="flex items-center gap-2">
              <Bell className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">通知与消息中心</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 px-6 shrink-0">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                <span className="ml-3 text-gray-500">加载中...</span>
              </div>
            ) : (
              <>
                {/* ========== Tab: 渠道配置 ========== */}
                {activeTab === 'channels' && channelConfig && (
                  <div className="space-y-6">
                    {/* PushPlus */}
                    <div className="border border-gray-200 rounded-lg p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-5 h-5 text-blue-600" />
                          <h3 className="text-base font-semibold text-gray-900">PushPlus</h3>
                        </div>
                        {getStatusBadge(status?.channels.pushplus)}
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">PushPlus Token</label>
                          <input
                            type="password"
                            value={channelConfig.push.pushplusToken}
                            onChange={(e) => updateConfigField('push', 'pushplusToken', e.target.value)}
                            placeholder="留空则不修改"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <button
                          onClick={() => handleTestChannel('pushplus')}
                          disabled={testingChannel === 'pushplus'}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-blue-300 text-blue-600 rounded-md hover:bg-blue-50 disabled:opacity-50"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          {testingChannel === 'pushplus' ? '测试中...' : '发送测试'}
                        </button>
                        {testResult?.channel === 'pushplus' && (
                          <p className={`text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                            {testResult.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 邮箱 */}
                    <div className="border border-gray-200 rounded-lg p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Mail className="w-5 h-5 text-purple-600" />
                          <h3 className="text-base font-semibold text-gray-900">邮箱推送</h3>
                        </div>
                        {getStatusBadge(status?.channels.email)}
                      </div>
                      <div className="space-y-3">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={channelConfig.email.enabled}
                            onChange={(e) => updateConfigField('email', 'enabled', e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-sm font-medium text-gray-700">启用邮箱推送</span>
                        </label>

                        {channelConfig.email.enabled && (
                          <div className="space-y-3 pl-6">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm text-gray-600 mb-1">SMTP 服务器</label>
                                <input
                                  type="text"
                                  value={channelConfig.email.smtpServer}
                                  onChange={(e) => updateConfigField('email', 'smtpServer', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-600 mb-1">SMTP 端口</label>
                                <input
                                  type="number"
                                  value={channelConfig.email.smtpPort}
                                  onChange={(e) => updateConfigField('email', 'smtpPort', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm text-gray-600 mb-1">发件人邮箱</label>
                              <input
                                type="email"
                                value={channelConfig.email.sender}
                                onChange={(e) => updateConfigField('email', 'sender', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-600 mb-1">邮箱密码/授权码</label>
                              <input
                                type="password"
                                value={channelConfig.email.password}
                                onChange={(e) => updateConfigField('email', 'password', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-600 mb-1">收件人邮箱</label>
                              <input
                                type="email"
                                value={channelConfig.email.receiver}
                                onChange={(e) => updateConfigField('email', 'receiver', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <button
                              onClick={() => handleTestChannel('email')}
                              disabled={testingChannel === 'email'}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-purple-300 text-purple-600 rounded-md hover:bg-purple-50 disabled:opacity-50"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              {testingChannel === 'email' ? '测试中...' : '发送测试邮件'}
                            </button>
                            {testResult?.channel === 'email' && (
                              <p className={`text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                {testResult.message}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 钉钉（预留） */}
                    <div className="border border-gray-200 rounded-lg p-5 opacity-60">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-5 h-5 text-blue-500" />
                          <h3 className="text-base font-semibold text-gray-900">钉钉机器人</h3>
                        </div>
                        {getStatusBadge(status?.channels.dingtalk)}
                      </div>
                      <p className="text-sm text-gray-500">钉钉渠道即将支持，敬请期待。</p>
                    </div>

                    {/* 说明 */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-1">
                        <Lightbulb className="w-4 h-4 text-blue-600" /> 配置说明
                      </h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• PushPlus 需要注册获取 Token：<a href="http://www.pushplus.plus" target="_blank" className="underline">pushplus.plus</a></li>
                        <li>• 邮箱推送支持 SMTP 协议（163/QQ/Gmail 等）</li>
                        <li>• 保存配置后，部分更改可能需要重启服务器才能生效</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* ========== Tab: 手动发送 ========== */}
                {activeTab === 'send' && (
                  <div className="space-y-5">
                    {/* 渠道快选 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">推送渠道</label>
                      <div className="flex flex-wrap gap-3">
                        {(['pushplus', 'email', 'dingtalk'] as const).map(ch => {
                          const chStatus = status?.channels[ch]
                          const isConfigured = chStatus?.status === 'configured'
                          return (
                            <label
                              key={ch}
                              className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg cursor-pointer transition-colors ${
                                sendChannels.includes(ch)
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-300 hover:border-gray-400'
                              } ${!isConfigured ? 'opacity-50' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={sendChannels.includes(ch)}
                                onChange={() => toggleSendChannel(ch)}
                                disabled={!isConfigured}
                                className="w-4 h-4 text-blue-600 rounded"
                              />
                              {ch === 'pushplus' && <Smartphone className="w-4 h-4 text-blue-600" />}
                              {ch === 'email' && <Mail className="w-4 h-4 text-purple-600" />}
                              {ch === 'dingtalk' && <MessageSquare className="w-4 h-4 text-blue-500" />}
                              <span className="text-sm font-medium text-gray-700">
                                {ch === 'pushplus' ? 'PushPlus' : ch === 'email' ? '邮箱' : '钉钉'}
                              </span>
                              {isConfigured ? (
                                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                              ) : (
                                <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />
                              )}
                            </label>
                          )
                        })}
                      </div>
                      {sendChannels.length === 0 && (
                        <p className="mt-2 text-xs text-yellow-600">请先在「渠道配置」中配置并启用至少一个渠道</p>
                      )}
                    </div>

                    {/* 消息类型 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">消息类型</label>
                      <div className="space-y-2">
                        <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input type="radio" name="sendType" value="daily_todo" checked={sendType === 'daily_todo'} onChange={(e) => setSendType(e.target.value as any)} className="w-4 h-4 text-blue-600" />
                          <span className="ml-3">
                            <span className="font-medium text-gray-900 flex items-center gap-1.5"><ClipboardList className="w-4 h-4 text-blue-600" />今日待办</span>
                            <span className="text-sm text-gray-500 ml-2">发送今天需要处理的任务</span>
                          </span>
                        </label>
                        <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input type="radio" name="sendType" value="daily_done" checked={sendType === 'daily_done'} onChange={(e) => setSendType(e.target.value as any)} className="w-4 h-4 text-blue-600" />
                          <span className="ml-3">
                            <span className="font-medium text-gray-900 flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-green-600" />今日完成</span>
                            <span className="text-sm text-gray-500 ml-2">发送今天已完成的任务</span>
                          </span>
                        </label>
                        <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input type="radio" name="sendType" value="both" checked={sendType === 'both'} onChange={(e) => setSendType(e.target.value as any)} className="w-4 h-4 text-blue-600" />
                          <span className="ml-3">
                            <span className="font-medium text-gray-900 flex items-center gap-1.5"><BarChart3 className="w-4 h-4 text-purple-600" />全部发送</span>
                            <span className="text-sm text-gray-500 ml-2">同时发送待办和完成任务</span>
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* 自定义标题 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">自定义标题（可选）</label>
                      <input
                        type="text"
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        placeholder="留空则使用默认标题"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* 自定义消息 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">自定义消息（可选，支持 HTML）</label>
                      <textarea
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        placeholder="留空则使用默认消息格式"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* ========== Tab: 定时任务 ========== */}
                {activeTab === 'schedule' && (
                  <div className="space-y-4">
                    {schedules.map((schedule) => (
                      <div key={schedule.id} className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className="flex items-center pt-2">
                            <input
                              type="checkbox"
                              checked={schedule.enabled}
                              onChange={(e) => updateSchedule(schedule.id, { enabled: e.target.checked })}
                              className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                          </div>

                          <div className="flex-1 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">消息类型</label>
                                <select
                                  value={schedule.type}
                                  onChange={(e) => updateSchedule(schedule.id, { type: e.target.value as any })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500"
                                  disabled={!schedule.enabled}
                                >
                                  <option value="daily_todo">今日待办</option>
                                  <option value="daily_done">今日完成</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">推送时间</label>
                                <input
                                  type="time"
                                  value={schedule.time}
                                  onChange={(e) => updateSchedule(schedule.id, { time: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500"
                                  disabled={!schedule.enabled}
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">自定义消息（可选）</label>
                              <input
                                type="text"
                                value={schedule.customMessage || ''}
                                onChange={(e) => updateSchedule(schedule.id, { customMessage: e.target.value })}
                                placeholder="添加个性化的问候语..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500"
                                disabled={!schedule.enabled}
                              />
                            </div>

                            {schedule.enabled && (
                              <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                                <p className="text-xs font-medium text-purple-700 mb-1">预览</p>
                                <p className="text-sm text-gray-700">
                                  每天 {schedule.time} 自动发送「{schedule.type === 'daily_todo' ? '今日待办' : '今日完成'}」
                                </p>
                                {schedule.customMessage && (
                                  <p className="text-xs text-gray-500 mt-1">附言：{schedule.customMessage}</p>
                                )}
                              </div>
                            )}
                          </div>

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

                    <button
                      onClick={addSchedule}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      添加定时任务
                    </button>

                    {/* GitHub 同步状态 */}
                    {status?.github_sync && (
                      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                        {status.github_sync.synced ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                        )}
                        <span className="text-sm text-gray-600">
                          GitHub Actions：{status.github_sync.synced ? '已配置' : '未配置'}
                          {status.github_sync.repository && ` (${status.github_sync.repository})`}
                        </span>
                      </div>
                    )}

                    {/* 说明 */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-1">
                        <Lightbulb className="w-4 h-4 text-blue-600" /> 使用说明
                      </h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• <strong>今日待办</strong>：发送当天需要处理的任务列表</li>
                        <li>• <strong>今日完成</strong>：发送当天已完成的任务统计</li>
                        <li>• 保存后定时任务将自动生效</li>
                        <li>• 取消勾选可以临时禁用某个定时任务</li>
                      </ul>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
            <button
              onClick={onClose}
              disabled={savingConfig || sending || savingSchedules}
              className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 text-sm"
            >
              取消
            </button>

            {activeTab === 'channels' && (
              <button
                onClick={handleSaveConfig}
                disabled={savingConfig}
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
              >
                <Save className="w-4 h-4" />
                {savingConfig ? '保存中...' : '保存配置'}
              </button>
            )}

            {activeTab === 'send' && (
              <button
                onClick={handleSend}
                disabled={sending || sendChannels.length === 0}
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <Send className="w-4 h-4" />
                {sending ? '发送中...' : '发送'}
              </button>
            )}

            {activeTab === 'schedule' && (
              <button
                onClick={handleSaveSchedules}
                disabled={savingSchedules}
                className="flex items-center gap-1.5 px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm"
              >
                <Save className="w-4 h-4" />
                {savingSchedules ? '保存中...' : '保存设置'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotificationCenter

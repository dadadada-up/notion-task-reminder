import { useState, useEffect } from 'react'
import { X, Save, Settings, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { getConfig, updateConfig } from '../api'

interface ConfigSettingsProps {
  isOpen: boolean
  onClose: () => void
}

const ConfigSettings = ({ isOpen, onClose }: ConfigSettingsProps) => {
  const [config, setConfig] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen) {
      loadConfig()
    }
  }, [isOpen])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const data = await getConfig()
      setConfig(data)
    } catch (error) {
      console.error('Failed to load config:', error)
      alert('加载配置失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    // 验证配置
    if (!validateConfig()) {
      alert('请检查配置项，确保必填项已填写')
      return
    }
    
    setSaving(true)
    try {
      const result = await updateConfig(config)
      
      if (result.success) {
        alert(result.message || '配置保存成功！部分配置可能需要重启服务器才能生效。')
        onClose()
      } else {
        alert(`保存失败: ${result.error}`)
      }
    } catch (error: any) {
      alert(`保存失败: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const updateField = (section: string, field: string, value: any) => {
    setConfig({
      ...config,
      [section]: {
        ...config[section],
        [field]: value
      }
    })
    
    // 清除该字段的验证错误
    const errorKey = `${section}.${field}`
    if (validationErrors[errorKey]) {
      const newErrors = { ...validationErrors }
      delete newErrors[errorKey]
      setValidationErrors(newErrors)
    }
  }
  
  const validateConfig = (): boolean => {
    const errors: Record<string, string> = {}
    
    // 验证 Notion 配置
    if (!config.notion.token || config.notion.token === '***') {
      errors['notion.token'] = 'Notion Token 不能为空'
    }
    if (!config.notion.databaseId) {
      errors['notion.databaseId'] = 'Database ID 不能为空'
    }
    
    // 验证邮箱配置（如果启用）
    if (config.email.enabled) {
      if (!config.email.smtpServer) {
        errors['email.smtpServer'] = 'SMTP 服务器不能为空'
      }
      if (!config.email.sender) {
        errors['email.sender'] = '发件人邮箱不能为空'
      }
      if (!config.email.receiver) {
        errors['email.receiver'] = '收件人邮箱不能为空'
      }
      if (!config.email.password || config.email.password === '***') {
        errors['email.password'] = '邮箱密码不能为空'
      }
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }
  
  const getStatusIcon = (isConfigured: boolean, isEnabled: boolean = true) => {
    if (!isEnabled) {
      return <XCircle className="w-5 h-5 text-gray-400" />
    }
    if (isConfigured) {
      return <CheckCircle className="w-5 h-5 text-green-500" />
    }
    return <AlertCircle className="w-5 h-5 text-yellow-500" />
  }
  
  const getStatusText = (isConfigured: boolean, isEnabled: boolean = true) => {
    if (!isEnabled) {
      return <span className="text-gray-500">未启用</span>
    }
    if (isConfigured) {
      return <span className="text-green-600">已配置</span>
    }
    return <span className="text-yellow-600">未配置</span>
  }

  if (!isOpen) return null
  if (loading || !config) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p className="text-gray-600">加载配置中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center">
            <Settings className="w-6 h-6 text-blue-600 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900">系统配置</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Notion 配置 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                Notion 配置
              </div>
              <div className="flex items-center gap-2 text-sm">
                {getStatusIcon(!!config.notion.token && !!config.notion.databaseId)}
                {getStatusText(!!config.notion.token && !!config.notion.databaseId)}
              </div>
            </h3>
            <div className="space-y-4 pl-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notion Token <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={config.notion.token}
                  onChange={(e) => updateField('notion', 'token', e.target.value)}
                  placeholder="ntn_***"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validationErrors['notion.token'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {validationErrors['notion.token'] && (
                  <p className="mt-1 text-xs text-red-500">{validationErrors['notion.token']}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">如果显示为 ***, 表示已配置，留空则不修改</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Database ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={config.notion.databaseId}
                  onChange={(e) => updateField('notion', 'databaseId', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validationErrors['notion.databaseId'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {validationErrors['notion.databaseId'] && (
                  <p className="mt-1 text-xs text-red-500">{validationErrors['notion.databaseId']}</p>
                )}
              </div>
            </div>
          </div>

          {/* 推送配置 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                推送配置
              </div>
              <div className="flex items-center gap-2 text-sm">
                {getStatusIcon(config.push.hasPushplus || config.push.hasWxpusher)}
                {getStatusText(config.push.hasPushplus || config.push.hasWxpusher)}
              </div>
            </h3>
            <div className="space-y-4 pl-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PushPlus Token
                </label>
                <input
                  type="password"
                  value={config.push.pushplusToken}
                  onChange={(e) => updateField('push', 'pushplusToken', e.target.value)}
                  placeholder="留空则不修改"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {config.push.hasPushplus ? '✓ 已配置 PushPlus' : '未配置 PushPlus'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WxPusher Token
                </label>
                <input
                  type="password"
                  value={config.push.wxpusherToken}
                  onChange={(e) => updateField('push', 'wxpusherToken', e.target.value)}
                  placeholder="留空则不修改"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WxPusher UID
                </label>
                <input
                  type="text"
                  value={config.push.wxpusherUid}
                  onChange={(e) => updateField('push', 'wxpusherUid', e.target.value)}
                  placeholder="WxPusher 用户 ID"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {config.push.hasWxpusher ? '✓ 已配置 WxPusher' : '未配置 WxPusher'}
                </p>
              </div>
            </div>
          </div>

          {/* 邮箱配置 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-purple-600 rounded-full mr-2"></span>
                邮箱配置
              </div>
              <div className="flex items-center gap-2 text-sm">
                {getStatusIcon(config.email.isConfigured, config.email.enabled)}
                {getStatusText(config.email.isConfigured, config.email.enabled)}
              </div>
            </h3>
            <div className="space-y-4 pl-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.email.enabled}
                  onChange={(e) => updateField('email', 'enabled', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label className="ml-2 text-sm font-medium text-gray-700">
                  启用邮箱推送
                </label>
              </div>
              
              {config.email.enabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SMTP 服务器
                      </label>
                      <input
                        type="text"
                        value={config.email.smtpServer}
                        onChange={(e) => updateField('email', 'smtpServer', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SMTP 端口
                      </label>
                      <input
                        type="number"
                        value={config.email.smtpPort}
                        onChange={(e) => updateField('email', 'smtpPort', parseInt(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      发件人邮箱
                    </label>
                    <input
                      type="email"
                      value={config.email.sender}
                      onChange={(e) => updateField('email', 'sender', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      邮箱密码/授权码
                    </label>
                    <input
                      type="password"
                      value={config.email.password}
                      onChange={(e) => updateField('email', 'password', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      收件人邮箱
                    </label>
                    <input
                      type="email"
                      value={config.email.receiver}
                      onChange={(e) => updateField('email', 'receiver', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* GitHub 配置 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-gray-600 rounded-full mr-2"></span>
                GitHub 配置
              </div>
              <div className="flex items-center gap-2 text-sm">
                {getStatusIcon(config.github.isConfigured)}
                {getStatusText(config.github.isConfigured)}
              </div>
            </h3>
            <div className="space-y-4 pl-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GitHub Token
                </label>
                <input
                  type="password"
                  value={config.github.token}
                  onChange={(e) => updateField('github', 'token', e.target.value)}
                  placeholder="ghp_***"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">用于自动更新 GitHub Actions workflow</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Repository
                </label>
                <input
                  type="text"
                  value={config.github.repository}
                  onChange={(e) => updateField('github', 'repository', e.target.value)}
                  placeholder="username/repo-name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 sticky bottom-0">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfigSettings

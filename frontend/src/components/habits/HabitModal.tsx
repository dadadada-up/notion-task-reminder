import { useState } from 'react'
import { X } from 'lucide-react'
import { createHabit } from '../../api'

interface HabitModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function HabitModal({ onClose, onSuccess }: HabitModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    frequency: '每日',
    weekly_target: 7,
    monthly_target: 30,
    phase: '2025年12月',
    notes: ''
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      alert('请输入习惯名称')
      return
    }

    try {
      setSaving(true)
      await createHabit({
        ...formData,
        status: '生效',
        start_date: new Date().toISOString().split('T')[0]
      })
      onSuccess()
    } catch (error) {
      console.error('创建习惯失败:', error)
      alert('创建失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">新增习惯</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 习惯名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              习惯名称 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="例如：早起、运动、阅读"
              required
            />
          </div>

          {/* 频率 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              频率
            </label>
            <select
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="每日">每日</option>
              <option value="工作日">工作日</option>
              <option value="周末">周末</option>
              <option value="每周">每周</option>
              <option value="每月">每月</option>
              <option value="不定期">不定期</option>
            </select>
          </div>

          {/* 目标设置 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                每周目标
              </label>
              <input
                type="number"
                value={formData.weekly_target}
                onChange={(e) => setFormData({ ...formData, weekly_target: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                每月目标
              </label>
              <input
                type="number"
                value={formData.monthly_target}
                onChange={(e) => setFormData({ ...formData, monthly_target: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                min="0"
              />
            </div>
          </div>

          {/* 阶段/周期 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              阶段/周期
            </label>
            <select
              value={formData.phase}
              onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="2025年12月">2025年12月</option>
              <option value="2026年Q1">2026年Q1</option>
              <option value="长期习惯">长期习惯</option>
            </select>
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              备注
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={3}
              placeholder="记录习惯相关说明..."
            />
          </div>

          {/* 按钮 */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '创建中...' : '创建习惯'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

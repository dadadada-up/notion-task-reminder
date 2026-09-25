import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { createHabit, updateHabit } from '../../api'
import { Habit } from '../../types'
import { useToast } from '../ui/Toast'

interface HabitModalProps {
  habit?: Habit | null
  onClose: () => void
  onSuccess: () => void
}

// 频率对应的默认目标
const FREQUENCY_TARGETS: Record<string, { weekly: number; monthly: number }> = {
  '每日': { weekly: 7, monthly: 30 },
  '工作日': { weekly: 5, monthly: 22 },
  '周末': { weekly: 2, monthly: 8 },
  '每周': { weekly: 1, monthly: 4 },
  '每月': { weekly: 0, monthly: 1 },
  '不定期': { weekly: 0, monthly: 0 },
}

export default function HabitModal({ habit, onClose, onSuccess }: HabitModalProps) {
  const isEdit = !!habit
  const toast = useToast()

  const [formData, setFormData] = useState({
    name: '',
    frequency: '每日' as Habit['frequency'],
    status: '生效' as Habit['status'],
    weekly_target: 7,
    monthly_target: 30,
    start_date: new Date().toISOString().split('T')[0],
    end_date: (() => {
      const d = new Date()
      d.setDate(d.getDate() + 21)
      return d.toISOString().split('T')[0]
    })(),
    phase: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (habit) {
      setFormData({
        name: habit.name || '',
        frequency: habit.frequency || '每日',
        status: habit.status || '生效',
        weekly_target: habit.weekly_target ?? 7,
        monthly_target: habit.monthly_target ?? 30,
        start_date: habit.start_date || new Date().toISOString().split('T')[0],
        end_date: habit.end_date || '',
        phase: habit.phase || '',
        notes: habit.notes || '',
      })
    }
  }, [habit])

  const handleFrequencyChange = (frequency: string) => {
    const targets = FREQUENCY_TARGETS[frequency] || FREQUENCY_TARGETS['每日']
    setFormData({
      ...formData,
      frequency: frequency as Habit['frequency'],
      weekly_target: targets.weekly,
      monthly_target: targets.monthly,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.warning('请输入习惯名称')
      return
    }

    try {
      setSaving(true)
      if (isEdit && habit) {
        await updateHabit(habit.id, formData)
      } else {
        await createHabit({ ...formData, status: '生效' })
      }
      onSuccess()
    } catch (error) {
      console.error('保存习惯失败:', error)
      toast.error('保存失败', '请重试')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEdit ? '编辑习惯' : '新增习惯'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* 基本信息区 */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              {/* 习惯名称 */}
              <div className="grid grid-cols-[80px_1fr] items-center gap-3">
                <label className="text-sm font-medium text-gray-600 text-right">
                  名称 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  placeholder="例如：早起、运动、阅读"
                />
              </div>

              {/* 状态 + 频率 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid grid-cols-[80px_1fr] items-center gap-3">
                  <label className="text-sm font-medium text-gray-600 text-right">状态</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Habit['status'] })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  >
                    <option value="生效">生效中</option>
                    <option value="暂停">已暂停</option>
                    <option value="失效">已失效</option>
                  </select>
                </div>
                <div className="grid grid-cols-[80px_1fr] items-center gap-3">
                  <label className="text-sm font-medium text-gray-600 text-right">频率</label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => handleFrequencyChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  >
                    <option value="每日">每日</option>
                    <option value="工作日">工作日</option>
                    <option value="周末">周末</option>
                    <option value="每周">每周</option>
                    <option value="每月">每月</option>
                    <option value="不定期">不定期</option>
                  </select>
                </div>
              </div>

              {/* 阶段 */}
              <div className="grid grid-cols-[80px_1fr] items-center gap-3">
                <label className="text-sm font-medium text-gray-600 text-right">阶段</label>
                <input
                  type="text"
                  value={formData.phase}
                  onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  placeholder="例如：2026年Q4、长期习惯"
                />
              </div>
            </div>

            {/* 目标设置区 */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid grid-cols-[80px_1fr] items-center gap-3">
                  <label className="text-sm font-medium text-gray-600 text-right">周目标</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={formData.weekly_target}
                      onChange={(e) => setFormData({ ...formData, weekly_target: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      min="0"
                    />
                    <span className="text-xs text-gray-400 whitespace-nowrap">次/周</span>
                  </div>
                </div>
                <div className="grid grid-cols-[80px_1fr] items-center gap-3">
                  <label className="text-sm font-medium text-gray-600 text-right">月目标</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={formData.monthly_target}
                      onChange={(e) => setFormData({ ...formData, monthly_target: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      min="0"
                    />
                    <span className="text-xs text-gray-400 whitespace-nowrap">次/月</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 时间安排区 */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid grid-cols-[80px_1fr] items-center gap-3">
                  <label className="text-sm font-medium text-gray-600 text-right">开始日期</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  />
                </div>
                <div className="grid grid-cols-[80px_1fr] items-center gap-3">
                  <label className="text-sm font-medium text-gray-600 text-right">截止日期</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>

            {/* 备注 */}
            <div className="grid grid-cols-[80px_1fr] items-start gap-3">
              <label className="text-sm font-medium text-gray-600 text-right pt-2">备注</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
                placeholder="记录习惯相关说明..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? '保存中...' : (isEdit ? '保存' : '创建习惯')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

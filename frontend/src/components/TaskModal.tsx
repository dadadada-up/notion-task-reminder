import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Task } from '../types'

interface TaskModalProps {
  task?: Task | null
  isOpen: boolean
  onClose: () => void
  onSave: (task: Partial<Task>) => Promise<void>
}

const TaskModal = ({ task, isOpen, onClose, onSave }: TaskModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    status: 'inbox' as Task['status'],
    priority: 'P3 不重要不紧急',
    task_type: '个人成长',
    assignee: 'dada',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (task) {
      setFormData({
        name: task.name || '',
        status: task.status || 'inbox',
        priority: task.priority || 'P3 不重要不紧急',
        task_type: task.task_type || '个人成长',
        assignee: task.assignee || 'dada',
        notes: task.notes || '',
      })
    } else {
      setFormData({
        name: '',
        status: 'inbox',
        priority: 'P3 不重要不紧急',
        task_type: '个人成长',
        assignee: 'dada',
        notes: '',
      })
    }
  }, [task, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(formData)
      onClose()
    } catch (error) {
      console.error('Failed to save task:', error)
      alert('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

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
              {task ? '编辑任务' : '新建任务'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* 任务名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                任务名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="输入任务名称"
              />
            </div>

            {/* 状态 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                状态
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Task['status'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="inbox">📥 Inbox</option>
                <option value="pending">⏸️ Pending</option>
                <option value="暂停">⏸️ 暂停</option>
                <option value="doing">🔄 进行中</option>
                <option value="已完成">✅ 已完成</option>
                <option value="已放弃">❌ 已放弃</option>
              </select>
            </div>

            {/* 优先级 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                优先级
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="P0 重要紧急">P0 重要紧急</option>
                <option value="P1 重要不紧急">P1 重要不紧急</option>
                <option value="P2 紧急不重要">P2 紧急不重要</option>
                <option value="P3 不重要不紧急">P3 不重要不紧急</option>
              </select>
            </div>

            {/* 任务类型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                任务类型
              </label>
              <select
                value={formData.task_type}
                onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="家庭生活">家庭生活</option>
                <option value="社交">社交</option>
                <option value="个人成长">个人成长</option>
                <option value="工作">工作</option>
                <option value="健康">健康</option>
                <option value="理财投资">理财投资</option>
                <option value="保险副业">保险副业</option>
              </select>
            </div>

            {/* 负责人 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                负责人
              </label>
              <select
                value={formData.assignee}
                onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="dada">dada</option>
                <option value="未分配">未分配</option>
              </select>
            </div>

            {/* 备注 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                备注
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="添加备注信息..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default TaskModal

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Task } from '../types'

interface TaskModalProps {
  task?: Task | null
  isOpen: boolean
  onClose: () => void
  onSave: (task: Partial<Task>) => Promise<void>
  parentTask?: Task | null
}

const TaskModal = ({ task, isOpen, onClose, onSave, parentTask }: TaskModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    status: '收集箱' as Task['status'],
    priority: 'P3 不重要不紲急',
    task_type: '个人成长',
    assignee: 'dada',
    email: 'dadadada_up@163.com',
    start_date: '',
    deadline: '',
    notes: '',
    parent_ids: [] as string[],
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (task) {
      setFormData({
        name: task.name || '',
        status: task.status || '收集箱',
        priority: task.priority || 'P3 不重要不 紧急',
        task_type: task.task_type || '个人成长',
        assignee: task.assignee || 'dada',
        email: task.email || (task.assignee === 'dada' ? 'dadadada_up@163.com' : ''),
        start_date: task.start_date || '',
        deadline: task.deadline || '',
        notes: task.notes || '',
        parent_ids: task.parent_ids || [],
      })
    } else if (parentTask) {
      // 创建子任务，继承父任务属性
      setFormData({
        name: '',
        status: '收集箱',
        priority: parentTask.priority || 'P3 不重要不 紧急',
        task_type: parentTask.task_type || '个人成长',
        assignee: parentTask.assignee || 'dada',
        email: parentTask.assignee === 'dada' ? 'dadadada_up@163.com' : '',
        start_date: '',
        deadline: '',
        notes: '',
        parent_ids: [parentTask.id],
      })
    } else {
      setFormData({
        name: '',
        status: '收集箱',
        priority: 'P3 不重要不 紧急',
        task_type: '个人成长',
        assignee: 'dada',
        email: 'dadadada_up@163.com',
        start_date: '',
        deadline: '',
        notes: '',
        parent_ids: [],
      })
    }
  }, [task, parentTask, isOpen])

  // 负责人变化时自动填充邮箱
  const handleAssigneeChange = (assignee: string) => {
    const email = assignee === 'dada' ? 'dadadada_up@163.com' : ''
    setFormData({ ...formData, assignee, email })
  }

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

            {/* 第一行：状态、优先级 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  状态：
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Task['status'] })}
                    className="ml-2 flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="收集箱">📥 收集箱</option>
                    <option value="暂停">⏸️ 暂停</option>
                    <option value="已放弃">❌ 已放弃</option>
                    <option value="进行中">🔵 进行中</option>
                    <option value="已完成">✅ 已完成</option>
                  </select>
                </label>
              </div>
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  优先级：
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="ml-2 flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="P0 重要紧急">P0 重要紧急</option>
                    <option value="P1 重要不紧急">P1 重要不紧急</option>
                    <option value="P2 紧急不重要">P2 紧急不重要</option>
                    <option value="P3 不重要不紧急">P3 不重要不紧急</option>
                  </select>
                </label>
              </div>
            </div>

            {/* 第二行：任务类型、负责人 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  任务类型：
                  <select
                    value={formData.task_type}
                    onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
                    className="ml-2 flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="家庭生活">家庭生活</option>
                    <option value="社交">社交</option>
                    <option value="个人成长">个人成长</option>
                    <option value="工作">工作</option>
                    <option value="健康">健康</option>
                    <option value="理财投资">理财投资</option>
                    <option value="保险副业">保险副业</option>
                  </select>
                </label>
              </div>
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  负责人：
                  <select
                    value={formData.assignee}
                    onChange={(e) => handleAssigneeChange(e.target.value)}
                    className="ml-2 flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="dada">dada</option>
                    <option value="panpan">panpan</option>
                  </select>
                </label>
              </div>
            </div>

            {/* 第三行：邮箱 */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                邮箱：
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="ml-2 flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="输入邮箱地址"
                />
              </label>
            </div>

            {/* 第四行：开始日期、截止日期 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  开始日期：
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="ml-2 flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </label>
              </div>
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  截止日期：
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="ml-2 flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </label>
              </div>
            </div>

            {/* 关系字段 - 上级项目 */}
            {formData.parent_ids && formData.parent_ids.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  上级项目
                </label>
                <div className="flex flex-wrap gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  {formData.parent_ids.map((parentId) => (
                    <span key={parentId} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                      {parentId.substring(0, 8)}...
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  此任务是子任务，将关联到上级项目
                </p>
              </div>
            )}

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

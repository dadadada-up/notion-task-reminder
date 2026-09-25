import { useState, useEffect, useRef } from 'react'
import { X, Trash2, Upload, Loader, FileText } from 'lucide-react'
import { Task, TaskImage } from '../types'
import TaskSelector from './TaskSelector'
import DatePicker from './DatePicker'
import { uploadImage } from '../api'
import { useConfirm } from './ui/ConfirmDialog'
import { useToast } from './ui/Toast'

interface TaskModalProps {
  task?: Task | null
  isOpen: boolean
  onClose: () => void
  onSave: (task: Partial<Task>) => Promise<void>
  onDelete?: (task: Task) => void
  parentTask?: Task | null
  copyTask?: Task | null
}

const TaskModal = ({ task, isOpen, onClose, onSave, onDelete, parentTask, copyTask }: TaskModalProps) => {
  const confirmDialog = useConfirm()
  const toast = useToast()
  const [formData, setFormData] = useState({
    name: '',
    status: '待开始' as Task['status'],
    priority: 'P3 不重要不紧急',
    task_type: '个人成长',
    assignee: 'dada',
    email: 'dadadada_up@163.com',
    start_date: '',
    deadline: '',
    notes: '',
    parent_ids: [] as string[],
    completed_time: undefined as string | undefined,
    images: [] as TaskImage[],
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (task) {
      setFormData({
        name: task.name || '',
        status: task.status || '待开始',
        priority: task.priority || 'P3 不重要不 紧急',
        task_type: task.task_type || '个人成长',
        assignee: task.assignee || 'dada',
        email: task.email || (task.assignee === 'dada' ? 'dadadada_up@163.com' : ''),
        start_date: task.start_date || '',
        deadline: task.deadline || '',
        notes: task.notes || '',
        parent_ids: task.parent_ids || [],
        completed_time: task.completed_time,
        images: task.images || [],
      })
    } else if (copyTask) {
      // 复制任务：以源任务为模板预填内容，作为新任务创建
      // - 保留：名称、类型、优先级、负责人、邮箱、备注、日期、图片
      // - 重置：完成时间清空；已完成/已放弃/已逾期 → 进行中；清除父子/依赖关系
      setFormData({
        name: copyTask.name || '',
        status: (copyTask.status === '已完成' || copyTask.status === '已放弃' || copyTask.status === '已逾期')
          ? '进行中'
          : (copyTask.status || '待开始'),
        priority: copyTask.priority || 'P3 不重要不紧急',
        task_type: copyTask.task_type || '个人成长',
        assignee: copyTask.assignee || 'dada',
        email: copyTask.email || (copyTask.assignee === 'dada' ? 'dadadada_up@163.com' : ''),
        start_date: copyTask.start_date || '',
        deadline: copyTask.deadline || '',
        notes: copyTask.notes || '',
        parent_ids: [],
        completed_time: undefined,
        images: (copyTask.images || []).map(img => ({ name: img.name, url: img.url, type: img.type })),
      })
    } else if (parentTask) {
      // 创建子任务，继承父任务所有属性（除了任务名称）
      setFormData({
        name: '',
        status: parentTask.status || '待开始',
        priority: parentTask.priority || 'P3 不重要不 紧急',
        task_type: parentTask.task_type || '个人成长',
        assignee: parentTask.assignee || 'dada',
        email: parentTask.email || (parentTask.assignee === 'dada' ? 'dadadada_up@163.com' : ''),
        start_date: parentTask.start_date || '',
        deadline: parentTask.deadline || '',
        notes: '',
        parent_ids: [parentTask.id],
        completed_time: undefined,
        images: [],
      })
    } else {
      // 获取今天的日期（YYYY-MM-DD格式）
      const today = new Date().toISOString().split('T')[0]
      
      setFormData({
        name: '',
        status: '进行中',
        priority: 'P3 不重要不紧急',
        task_type: '个人成长',
        assignee: 'dada',
        email: 'dadadada_up@163.com',
        start_date: today,
        deadline: today,
        notes: '',
        parent_ids: [],
        completed_time: undefined,
        images: [],
      })
    }
  }, [task, parentTask, copyTask, isOpen])

  // 负责人变化时自动填充邮箱
  const handleAssigneeChange = (assignee: string) => {
    const email = assignee === 'dada' ? 'dadadada_up@163.com' : ''
    setFormData({ ...formData, assignee, email })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      // 如果状态改为已完成，自动设置完成时间
      const dataToSave = { ...formData }
      if (formData.status === '已完成' && (!task || task.status !== '已完成')) {
        dataToSave.completed_time = new Date().toISOString()
      }
      
      await onSave(dataToSave)
      onClose()
    } catch (error) {
      console.error('Failed to save task:', error)
      toast.error('保存失败', '请重试')
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
              {task ? '编辑任务' : copyTask ? '复制任务' : '新建任务'}
            </h2>
            <div className="flex items-center gap-2">
              {task && task.url && (
                <a
                  href={task.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  title="打开页面查看详细内容"
                >
                  <FileText className="w-4 h-4" />
                  打开页面
                </a>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* 基本信息区 */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              {/* 任务名称 */}
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
                  placeholder="输入任务名称"
                />
              </div>

              {/* 状态 + 优先级 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid grid-cols-[80px_1fr] items-center gap-3">
                  <label className="text-sm font-medium text-gray-600 text-right">状态</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Task['status'] })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  >
                    <option value="待开始">待开始</option>
                    <option value="进行中">进行中</option>
                    <option value="已逾期">已逾期</option>
                    <option value="已完成">已完成</option>
                    <option value="已放弃">已放弃</option>
                  </select>
                </div>
                <div className="grid grid-cols-[80px_1fr] items-center gap-3">
                  <label className="text-sm font-medium text-gray-600 text-right">优先级</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  >
                    <option value="P0 重要紧急">P0 重要紧急</option>
                    <option value="P1 重要不紧急">P1 重要不紧急</option>
                    <option value="P2 紧急不重要">P2 紧急不重要</option>
                    <option value="P3 不重要不紧急">P3 不重要不紧急</option>
                  </select>
                </div>
              </div>

              {/* 任务类型 + 负责人 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid grid-cols-[80px_1fr] items-center gap-3">
                  <label className="text-sm font-medium text-gray-600 text-right">类型</label>
                  <select
                    value={formData.task_type}
                    onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
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
                <div className="grid grid-cols-[80px_1fr] items-center gap-3">
                  <label className="text-sm font-medium text-gray-600 text-right">负责人</label>
                  <select
                    value={formData.assignee}
                    onChange={(e) => handleAssigneeChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  >
                    <option value="dada">dada</option>
                    <option value="panpan">panpan</option>
                  </select>
                </div>
              </div>

              {/* 邮箱 */}
              <div className="grid grid-cols-[80px_1fr] items-center gap-3">
                <label className="text-sm font-medium text-gray-600 text-right">邮箱</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  placeholder="输入邮箱地址"
                />
              </div>
            </div>

            {/* 时间安排区 */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid grid-cols-[80px_1fr] items-center gap-3">
                  <label className="text-sm font-medium text-gray-600 text-right">开始日期</label>
                  <DatePicker
                    value={formData.start_date}
                    onChange={(v) => setFormData({ ...formData, start_date: v })}
                    placeholder="选择开始日期"
                  />
                </div>
                <div className="grid grid-cols-[80px_1fr] items-center gap-3">
                  <label className="text-sm font-medium text-gray-600 text-right">截止日期</label>
                  <DatePicker
                    value={formData.deadline}
                    onChange={(v) => setFormData({ ...formData, deadline: v })}
                    placeholder="选择截止日期"
                  />
                </div>
              </div>
            </div>

            {/* 上级项目 */}
            <div className="grid grid-cols-[80px_1fr] items-start gap-3">
              <label className="text-sm font-medium text-gray-600 text-right pt-2">上级项目</label>
              <div className="flex-1">
                <TaskSelector
                  selectedIds={formData.parent_ids}
                  onSelect={(ids) => setFormData({ ...formData, parent_ids: ids })}
                  excludeIds={task?.id ? [task.id] : []}
                  label=""
                  placeholder="搜索并选择上级项目..."
                  multiple={false}
                />
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
                placeholder="添加备注信息..."
              />
            </div>

            {/* 图片管理 */}
            <div className="grid grid-cols-[80px_1fr] items-start gap-3">
              <label className="text-sm font-medium text-gray-600 text-right pt-2">
                图片 <span className="text-gray-400">({formData.images.length})</span>
              </label>
              <div className="flex-1">
                {/* 图片列表 */}
                {formData.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {formData.images.map((image, index) => (
                      <div key={index} className="relative group">
                        <a 
                          href={image.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <img
                            src={image.url}
                            alt={image.name || `图片 ${index + 1}`}
                            className="w-full h-20 object-cover rounded-lg border border-gray-200 hover:border-purple-400 transition-colors"
                            onError={(e) => {
                              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="12" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3E加载失败%3C/text%3E%3C/svg%3E'
                            }}
                          />
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            const newImages = formData.images.filter((_, i) => i !== index)
                            setFormData({ ...formData, images: newImages })
                          }}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* 上传按钮 */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = e.target.files
                    if (!files || files.length === 0) return
                    
                    setUploading(true)
                    try {
                      const uploadPromises = Array.from(files).map(async (file) => {
                        try {
                          const result = await uploadImage(file)
                          return {
                            file_upload_id: result.file_upload_id,
                            name: result.filename,
                            type: 'file_upload' as const,
                            url: ''
                          }
                        } catch (error) {
                          console.error(`上传 ${file.name} 失败:`, error)
                          toast.error(`上传 ${file.name} 失败`, '请重试')
                          return null
                        }
                      })
                      
                      const uploadedImages = (await Promise.all(uploadPromises)).filter(img => img !== null) as TaskImage[]
                      
                      if (uploadedImages.length > 0) {
                        setFormData({
                          ...formData,
                          images: [...formData.images, ...uploadedImages]
                        })
                      }
                    } catch (error) {
                      console.error('上传图片失败:', error)
                      toast.error('上传图片失败', '请重试')
                    } finally {
                      setUploading(false)
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ''
                      }
                    }
                  }}
                />
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full px-4 py-2.5 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-purple-400 hover:text-purple-600 focus:outline-none flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
                >
                  {uploading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      上传中...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      点击上传图片
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between gap-3 pt-4 border-t border-gray-100">
              {task && onDelete ? (
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await confirmDialog({
                      title: '删除任务',
                      type: 'danger',
                      message: <>确定删除任务「<b>{task.name}</b>」吗？此操作不可恢复。</>,
                      confirmText: '删除',
                    })
                    if (ok) onDelete(task)
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  删除任务
                </button>
              ) : (
                <div />
              )}
              <div className="flex gap-3">
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
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default TaskModal

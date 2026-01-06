import { useState, useEffect, useRef } from 'react'
import { X, Trash2, Upload, Loader, FileText } from 'lucide-react'
import { Task, TaskImage } from '../types'
import TaskSelector from './TaskSelector'
import { uploadImage } from '../api'

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
        status: task.status || '收集箱',
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
    } else if (parentTask) {
      // 创建子任务，继承父任务所有属性（除了任务名称）
      setFormData({
        name: '',
        status: parentTask.status || '收集箱',
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
      // 如果状态改为已完成，自动设置完成时间
      const dataToSave = { ...formData }
      if (formData.status === '已完成' && (!task || task.status !== '已完成')) {
        dataToSave.completed_time = new Date().toISOString()
      }
      
      await onSave(dataToSave)
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
            <div className="flex items-center gap-2">
              {task && task.url && (
                <a
                  href={task.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  title="在 Notion 中打开页面，编辑长文档内容"
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
            {parentTask ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  上级项目（继承自父任务）
                </label>
                <TaskSelector
                  selectedIds={formData.parent_ids}
                  onSelect={(ids) => setFormData({ ...formData, parent_ids: ids })}
                  excludeIds={task?.id ? [task.id] : []}
                  label=""
                  placeholder="搜索上级项目..."
                  multiple={false}
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 此任务是子任务，可以修改关联的上级项目
                </p>
              </div>
            ) : task?.parent_ids && task.parent_ids.length > 0 ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  上级项目
                </label>
                <TaskSelector
                  selectedIds={formData.parent_ids}
                  onSelect={(ids) => setFormData({ ...formData, parent_ids: ids })}
                  excludeIds={task?.id ? [task.id] : []}
                  label=""
                  placeholder="搜索上级项目..."
                  multiple={false}
                />
              </div>
            ) : (
              <div>
                <TaskSelector
                  selectedIds={formData.parent_ids}
                  onSelect={(ids) => setFormData({ ...formData, parent_ids: ids })}
                  excludeIds={task?.id ? [task.id] : []}
                  label="上级项目（可选）"
                  placeholder="搜索并选择上级项目..."
                  multiple={false}
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 选择上级项目后，此任务将成为子任务
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
              {task && task.url ? (
                <p className="text-xs text-gray-500 mt-2">
                  💡 需要编辑长文档？点击右上角「打开页面」按钮，在 Notion 中编辑完整内容
                </p>
              ) : (
                <p className="text-xs text-gray-500 mt-2">
                  💡 创建任务后，可以在 Notion 页面中添加富文本、代码块、表格等长文档内容
                </p>
              )}
            </div>

            {/* 图片管理 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                图片 ({formData.images.length})
              </label>
              
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
                          className="w-full h-24 object-cover rounded-lg border border-gray-200 hover:border-purple-400 transition-colors"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="12" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3E加载失败%3C/text%3E%3C/svg%3E'
                          }}
                        />
                      </a>
                      {/* 删除按钮 */}
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
                      {image.name && (
                        <p className="mt-1 text-xs text-gray-500 truncate" title={image.name}>
                          {image.name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* 添加图片 - 文件上传 */}
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
                    // 上传所有选中的文件
                    const uploadPromises = Array.from(files).map(async (file) => {
                      try {
                        const result = await uploadImage(file)
                        return {
                          file_upload_id: result.file_upload_id,
                          name: result.filename,
                          type: 'file_upload' as const,
                          url: '' // 占位符，实际URL由Notion生成
                        }
                      } catch (error) {
                        console.error(`上传 ${file.name} 失败:`, error)
                        alert(`上传 ${file.name} 失败，请重试`)
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
                    alert('上传图片失败，请重试')
                  } finally {
                    setUploading(false)
                    // 重置文件输入
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
                className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-purple-400 hover:text-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    上传中...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    上传图片
                  </>
                )}
              </button>
              
              <p className="text-xs text-gray-500 mt-2">
                💡 支持直接上传图片文件（最大 20MB，支持 JPG、PNG、GIF 等格式）
              </p>
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

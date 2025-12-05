import { useState, useEffect } from 'react'
import { X, Calendar, User, Flag, Tag, Clock, CheckCircle2, Link as LinkIcon, Edit, Mail, Hash, Plus } from 'lucide-react'
import { Task } from '../types'
import { fetchTasks, updateTask } from '../api'
import { formatDate, formatDateTime } from '../utils/dateFormat'

interface TaskDetailModalProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (task: Task) => void
  onCreateSubTask?: (parentTask: Task) => void
}

const TaskDetailModal = ({ task, isOpen, onClose, onEdit, onCreateSubTask }: TaskDetailModalProps) => {
  const [childTasks, setChildTasks] = useState<Task[]>([])
  const [parentTasks, setParentTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null)

  useEffect(() => {
    if (task) {
      if (task.child_ids && task.child_ids.length > 0) {
        loadChildTasks()
      } else {
        setChildTasks([])
      }
      
      if (task.parent_ids && task.parent_ids.length > 0) {
        loadParentTasks()
      } else {
        setParentTasks([])
      }
    }
  }, [task])

  const loadChildTasks = async () => {
    if (!task || !task.child_ids || task.child_ids.length === 0) return
    
    setLoading(true)
    try {
      const allTasks = await fetchTasks()
      const children = allTasks.filter(t => task.child_ids.includes(t.id))
      setChildTasks(children)
    } catch (error) {
      console.error('Failed to load child tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadParentTasks = async () => {
    if (!task || !task.parent_ids || task.parent_ids.length === 0) return
    
    try {
      const allTasks = await fetchTasks()
      const parents = allTasks.filter(t => task.parent_ids.includes(t.id))
      setParentTasks(parents)
    } catch (error) {
      console.error('Failed to load parent tasks:', error)
    }
  }

  const handleCompleteChildTask = async (childTask: Task, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!confirm(`确认完成子任务「${childTask.name}」？`)) {
      return
    }

    setCompletingTaskId(childTask.id)
    try {
      await updateTask(childTask.id, {
        status: '已完成',
        completed_time: new Date().toISOString()
      })
      
      // 重新加载子任务列表
      await loadChildTasks()
    } catch (error) {
      console.error('Failed to complete child task:', error)
      alert('完成任务失败，请重试')
    } finally {
      setCompletingTaskId(null)
    }
  }

  if (!isOpen || !task) return null

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      '收集箱': 'bg-yellow-100 text-yellow-700',
      '进行中': 'bg-blue-100 text-blue-700',
      '暂停': 'bg-gray-100 text-gray-700',
      '已完成': 'bg-green-100 text-green-700',
      '已放弃': 'bg-red-100 text-red-700',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const getPriorityColor = (priority: string) => {
    if (priority.includes('P0')) return 'text-red-600'
    if (priority.includes('P1')) return 'text-blue-600'
    if (priority.includes('P2')) return 'text-orange-600'
    return 'text-gray-600'
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{task.name}</h2>
              {task.unique_id && (
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5" />
                  {task.unique_id}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onEdit && (
                <button
                  onClick={() => onEdit(task)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  修改
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Status and Priority */}
            <div className="flex flex-wrap gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                {task.status}
              </span>
              <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 ${getPriorityColor(task.priority)}`}>
                <Flag className="w-4 h-4" />
                {task.priority}
              </span>
              <span className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700">
                <Tag className="w-4 h-4" />
                {task.task_type}
              </span>
              <span className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-700">
                <User className="w-4 h-4" />
                {task.assignee}
              </span>
            </div>

            {/* 详细信息 */}
            <div className="space-y-3">
              {/* 邮箱 */}
              {task.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-500 w-24">邮箱：</span>
                  <span className="text-sm text-gray-900">{task.email}</span>
                </div>
              )}
              
              {/* 开始日期 */}
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-500 w-24">开始日期：</span>
                <span className="text-sm text-gray-900">{formatDate(task.start_date) || '未设置'}</span>
              </div>
              
              {/* 截止日期 */}
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-500 w-24">截止日期：</span>
                <span className="text-sm text-gray-900">{formatDate(task.deadline) || '未设置'}</span>
              </div>
              
              {/* 完成时间 */}
              {task.completed_time && (
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-500 w-24">完成时间：</span>
                  <span className="text-sm text-gray-900">{formatDateTime(task.completed_time)}</span>
                </div>
              )}
              
              {/* 创建时间 */}
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-500 w-24">创建时间：</span>
                <span className="text-sm text-gray-900">{formatDateTime(task.created_time) || '未知'}</span>
              </div>
              
              {/* 最后编辑 */}
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-500 w-24">最后编辑：</span>
                <span className="text-sm text-gray-900">{formatDateTime(task.last_edited_time)}</span>
              </div>
            </div>

            {/* Notes */}
            {task.notes && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">备注</h3>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                  {task.notes}
                </div>
              </div>
            )}

            {/* Images */}
            {task.images && task.images.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">图片 ({task.images.length})</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {task.images.map((image, index) => (
                    <div key={index} className="relative group">
                      <a 
                        href={image.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={image.url}
                          alt={image.name || `图片 ${index + 1}`}
                          className="w-full h-40 object-cover rounded-lg border border-gray-200 hover:border-purple-400 transition-colors cursor-pointer"
                          onError={(e) => {
                            // 图片加载失败时显示占位符
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f3f4f6" width="200" height="200"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3E图片加载失败%3C/text%3E%3C/svg%3E'
                          }}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity rounded-lg flex items-center justify-center">
                          <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">
                            点击查看大图
                          </span>
                        </div>
                      </a>
                      {image.name && (
                        <p className="mt-1 text-xs text-gray-500 truncate" title={image.name}>
                          {image.name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 关系字段 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">关系字段</h3>
              
              {/* 上级项目 */}
              {task.parent_ids && task.parent_ids.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">上级项目 ({task.parent_ids.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {parentTasks.length > 0 ? (
                      parentTasks.map((parent) => (
                        <span key={parent.id} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                          {parent.name}
                        </span>
                      ))
                    ) : (
                      task.parent_ids.map((parentId) => (
                        <span key={parentId} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                          {parentId.substring(0, 8)}...
                        </span>
                      ))
                    )}
                  </div>
                </div>
              )}
              
              {/* 子级项目 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    子级项目 {task.child_ids && task.child_ids.length > 0 && `(${task.child_ids.length})`}
                  </h4>
                  {onCreateSubTask && (
                    <button
                      onClick={() => onCreateSubTask(task)}
                      className="flex items-center gap-1 px-3 py-1 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      添加子任务
                    </button>
                  )}
                </div>
                {task.child_ids && task.child_ids.length > 0 && (
                  loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {childTasks.map((child) => (
                        <div
                          key={child.id}
                          onClick={() => onEdit && onEdit(child)}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors relative cursor-pointer"
                        >
                          {/* 进行中的子任务显示复选框 */}
                          {child.status === '进行中' && (
                            <input
                              type="checkbox"
                              checked={false}
                              disabled={completingTaskId === child.id}
                              onChange={(e) => handleCompleteChildTask(child, e as any)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer disabled:opacity-50 flex-shrink-0"
                            />
                          )}
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(child.status)}`}>
                            {child.status}
                          </span>
                          <span className="flex-1 text-sm text-gray-900 hover:text-purple-600 transition-colors">{child.name}</span>
                          {child.deadline && (
                            <span className="text-xs text-gray-500">
                              {formatDate(child.deadline)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
              
              {/* 被阻止 */}
              {task.blocked_by_ids && task.blocked_by_ids.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">被阻止 ({task.blocked_by_ids.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {task.blocked_by_ids.map((blockedId) => (
                      <span key={blockedId} className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs">
                        {blockedId.substring(0, 8)}...
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notion链接 */}
            <div className="pt-4 border-t border-gray-200">
              <a
                href={task.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <LinkIcon className="w-4 h-4" />
                在 Notion 中打开
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskDetailModal

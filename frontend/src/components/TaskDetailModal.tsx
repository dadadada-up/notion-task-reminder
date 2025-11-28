import { useState, useEffect } from 'react'
import { X, Calendar, User, Flag, Tag, Clock, CheckCircle2, Link as LinkIcon, Edit, Mail, Hash } from 'lucide-react'
import { Task } from '../types'
import { fetchTasks } from '../api'

interface TaskDetailModalProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (task: Task) => void
}

const TaskDetailModal = ({ task, isOpen, onClose, onEdit }: TaskDetailModalProps) => {
  const [childTasks, setChildTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (task && task.child_ids && task.child_ids.length > 0) {
      loadChildTasks()
    } else {
      setChildTasks([])
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

  if (!isOpen || !task) return null

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '未设置'
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '未设置'
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

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
                <span className="text-sm text-gray-900">{formatDate(task.start_date)}</span>
              </div>
              
              {/* 截止日期 */}
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-500 w-24">截止日期：</span>
                <span className="text-sm text-gray-900">{formatDate(task.deadline)}</span>
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
                <span className="text-sm text-gray-900">{formatDateTime(task.created_time)}</span>
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

            {/* Child Tasks */}
            {task.child_ids && task.child_ids.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  子任务 ({task.child_ids.length})
                </h3>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {childTasks.map((child) => (
                      <div
                        key={child.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(child.status)}`}>
                          {child.status}
                        </span>
                        <span className="flex-1 text-sm text-gray-900">{child.name}</span>
                        {child.deadline && (
                          <span className="text-xs text-gray-500">
                            截止: {formatDate(child.deadline)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

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

import { useState } from 'react'
import { Task } from '../types'
import { Calendar, User, Flag, Tag, CheckCircle2 } from 'lucide-react'
import { updateTask, fetchTasks } from '../api'
import { formatDate, formatDateTime } from '../utils/dateFormat'

interface TaskGalleryProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onTaskUpdate?: () => void
}

const TaskGallery = ({ tasks, onTaskClick, onTaskUpdate }: TaskGalleryProps) => {
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null)

  // 优先级数值映射（用于排序）
  const priorityOrder: Record<string, number> = {
    'P0 重要紧急': 0,
    'P1 重要不紧急': 1,
    'P2 紧急不重要': 2,
    'P3 不重要不紧急': 3,
  }

  // 对已完成的任务进行排序：完成时间倒序 -> 优先级倒序 -> 负责人正序
  const sortedTasks = [...tasks].sort((a, b) => {
    // 只对已完成状态的任务进行特殊排序
    if (a.status === '已完成' && b.status === '已完成') {
      // 1. 完成时间倒序（最新完成的在前）
      if (a.completed_time && b.completed_time) {
        const timeCompare = new Date(b.completed_time).getTime() - new Date(a.completed_time).getTime()
        if (timeCompare !== 0) return timeCompare
      }
      if (a.completed_time && !b.completed_time) return -1
      if (!a.completed_time && b.completed_time) return 1
      
      // 2. 优先级倒序（P0最前）
      const priorityA = priorityOrder[a.priority] ?? 999
      const priorityB = priorityOrder[b.priority] ?? 999
      if (priorityA !== priorityB) {
        return priorityA - priorityB
      }
      
      // 3. 负责人正序（字母顺序）
      return a.assignee.localeCompare(b.assignee, 'zh-CN')
    }
    
    // 其他状态保持原顺序
    return 0
  })

  const handleCompleteTask = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation() // 阻止事件冒泡

    // 检查是否有子任务
    if (task.child_ids && task.child_ids.length > 0) {
      try {
        // 获取所有任务
        const allTasks = await fetchTasks()
        const childTasks = allTasks.filter(t => task.child_ids.includes(t.id))
        
        // 检查是否所有子任务都已完成
        const hasIncompleteChildren = childTasks.some(child => child.status !== '已完成')
        
        if (hasIncompleteChildren) {
          alert('请先完成所有子任务！')
          return
        }
      } catch (error) {
        console.error('Failed to check child tasks:', error)
        alert('检查子任务失败，请重试')
        return
      }
    }

    // 确认完成
    if (!confirm(`确认完成任务「${task.name}」？`)) {
      return
    }

    setCompletingTaskId(task.id)
    try {
      // 更新任务状态为已完成，并设置完成时间
      await updateTask(task.id, {
        status: '已完成',
        completed_time: new Date().toISOString()
      })
      
      // 通知父组件刷新
      if (onTaskUpdate) {
        onTaskUpdate()
      }
    } catch (error) {
      console.error('Failed to complete task:', error)
      alert('完成任务失败，请重试')
    } finally {
      setCompletingTaskId(null)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      '收集箱': 'border-yellow-400 bg-yellow-50',
      '进行中': 'border-blue-400 bg-blue-50',
      '暂停': 'border-gray-400 bg-gray-50',
      '已完成': 'border-green-400 bg-green-50',
      '已放弃': 'border-red-400 bg-red-50',
    }
    return colors[status] || 'border-gray-400 bg-gray-50'
  }

  const getPriorityIcon = (priority: string) => {
    if (priority.includes('P0')) return '🔴'
    if (priority.includes('P1')) return '🔵'
    if (priority.includes('P2')) return '🟠'
    return '⚪'
  }

  const getTaskTypeIcon = (taskType: string) => {
    const icons: Record<string, string> = {
      '家庭生活': '🏠',
      '社交': '👥',
      '个人成长': '📚',
      '工作': '💼',
      '健康': '💪',
      '理财投资': '💰',
      '保险副业': '🛡️',
    }
    return icons[taskType] || '📋'
  }

  if (sortedTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <CheckCircle2 className="w-16 h-16 mb-4" />
        <p className="text-lg">暂无任务</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {sortedTasks.map((task) => (
        <div
          key={task.id}
          className={`group relative border-l-4 ${getStatusColor(task.status)} rounded-lg p-4 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1`}
        >
          {/* 进行中任务显示复选框 */}
          {task.status === '进行中' && (
            <div className="absolute top-3 left-3 z-10">
              <input
                type="checkbox"
                checked={false}
                disabled={completingTaskId === task.id}
                onChange={(e) => handleCompleteTask(task, e as any)}
                onClick={(e) => e.stopPropagation()}
                className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer disabled:opacity-50"
              />
            </div>
          )}
          
          <div onClick={() => onTaskClick(task)} className="cursor-pointer">
          {/* Priority Badge */}
          <div className="absolute top-3 right-3 text-xl">
            {getPriorityIcon(task.priority)}
          </div>

            {/* Task Name */}
            <h3 className={`text-base font-semibold text-gray-900 mb-3 pr-8 line-clamp-2 group-hover:text-purple-600 transition-colors ${task.status === '进行中' ? 'pl-8' : ''}`}>
              {task.name}
            </h3>

            {/* Task Type */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{getTaskTypeIcon(task.task_type)}</span>
              <span className="text-sm text-gray-600">{task.task_type}</span>
            </div>

            {/* Dates */}
            <div className="space-y-2 mb-3">
              {task.start_date && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>开始: {formatDate(task.start_date)}</span>
                </div>
              )}
              {task.deadline && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Flag className="w-3.5 h-3.5" />
                  <span>截止: {formatDate(task.deadline)}</span>
                </div>
              )}
              {task.completed_time && (
                <div className="flex items-center gap-2 text-xs text-green-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{formatDateTime(task.completed_time)}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <User className="w-3.5 h-3.5" />
                <span>{task.assignee}</span>
              </div>
              {task.child_ids && task.child_ids.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                  <Tag className="w-3 h-3" />
                  <span>{task.child_ids.length} 个子任务</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default TaskGallery

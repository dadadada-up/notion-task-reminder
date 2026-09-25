import { useState, memo } from 'react'
import { Task } from '../types'
import { Calendar, User, Flag, Tag, CheckCircle2, Home, Users, BookOpen, Briefcase, HeartPulse, TrendingUp, ShieldCheck, ClipboardList, Copy } from 'lucide-react'
import { updateTask } from '../api'
import { formatDate, formatDateTime } from '../utils/dateFormat'
import PriorityBadge from './PriorityBadge'
import { useConfirm } from './ui/ConfirmDialog'
import { useToast } from './ui/Toast'

interface TaskGalleryProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void
  onCopy?: (task: Task) => void
}

const TaskGallery = memo(({ tasks, onTaskClick, onTaskUpdate, onCopy }: TaskGalleryProps) => {
  const confirmDialog = useConfirm()
  const toast = useToast()
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

    // 检查是否有子任务 - 直接用 props 中的 tasks，无需额外 API 请求
    if (task.child_ids && task.child_ids.length > 0) {
      const childTasks = tasks.filter(t => task.child_ids.includes(t.id))
      const hasIncompleteChildren = childTasks.some(child => child.status !== '已完成')
      
      if (hasIncompleteChildren) {
        toast.warning('请先完成所有子任务', '完成全部子任务后再完成父任务')
        return
      }
    }

    // 确认完成
    const ok = await confirmDialog({
      title: '完成任务',
      message: <>确认完成任务「<b>{task.name}</b>」？完成后统计看板将同步更新。</>,
      confirmText: '确认完成',
    })
    if (!ok) return

    setCompletingTaskId(task.id)
    try {
      const completedTime = new Date().toISOString()
      await updateTask(task.id, {
        status: '已完成',
        completed_time: completedTime
      })
      
      // 乐观更新：通知父组件局部更新
      if (onTaskUpdate) {
        onTaskUpdate(task.id, { status: '已完成', completed_time: completedTime })
      }
    } catch (error) {
      console.error('Failed to complete task:', error)
      toast.error('完成任务失败', '请重试')
    } finally {
      setCompletingTaskId(null)
    }
  }

  const getStatusStyle = (status: string) => {
    const styles: Record<string, string> = {
      '待开始': 'bg-yellow-50 border-yellow-200',
      '进行中': 'bg-blue-50 border-blue-200',
      '已逾期': 'bg-orange-50 border-orange-200',
      '已完成': 'bg-green-50 border-green-200',
      '已放弃': 'bg-red-50 border-red-200',
    }
    return styles[status] || 'bg-gray-50 border-gray-200'
  }

  const getTaskTypeIcon = (taskType: string) => {
    const iconMap: Record<string, React.ElementType> = {
      '家庭生活': Home,
      '社交': Users,
      '个人成长': BookOpen,
      '工作': Briefcase,
      '健康': HeartPulse,
      '理财投资': TrendingUp,
      '保险副业': ShieldCheck,
    }
    const Icon = iconMap[taskType] || ClipboardList
    return <Icon className="w-4 h-4 text-gray-500" />
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
          className={`group relative border rounded-lg p-4 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 ${getStatusStyle(task.status)}`}
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
          <div className="absolute top-3 right-3">
            <PriorityBadge priority={task.priority} size="sm" />
          </div>

            {/* Task Name */}
            <h3 className={`text-base font-semibold text-gray-900 mb-3 pr-8 line-clamp-2 group-hover:text-purple-600 transition-colors ${task.status === '进行中' ? 'pl-8' : ''}`}>
              {task.name}
            </h3>

            {/* Task Type */}
            <div className="flex items-center gap-2 mb-3">
              {getTaskTypeIcon(task.task_type)}
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
              <div className="flex items-center gap-2">
                {task.child_ids && task.child_ids.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                    <Tag className="w-3 h-3" />
                    <span>{task.child_ids.length} 个子任务</span>
                  </div>
                )}
                {onCopy && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onCopy(task) }}
                    title="复制为新任务"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-purple-600 p-1 rounded"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
})

export default TaskGallery

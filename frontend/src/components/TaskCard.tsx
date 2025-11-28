import { Task } from '../types'
import { ExternalLink, AlertCircle } from 'lucide-react'

interface TaskCardProps {
  task: Task
  onDragStart: () => void
  onClick?: () => void
}

const TaskCard = ({ task, onDragStart, onClick }: TaskCardProps) => {
  const getPriorityColor = (priority: string) => {
    if (priority.includes('P0')) return 'red'
    if (priority.includes('P1')) return 'orange'
    if (priority.includes('P2')) return 'purple'
    return 'gray'
  }

  const priorityColor = getPriorityColor(task.priority)
  const priorityShort = task.priority.split(' ')[0] || 'P3'

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={`bg-white border-l-4 border-${priorityColor}-500 rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer`}
    >
      {/* Task Title */}
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900 text-sm flex-1 line-clamp-2">
          {task.name}
        </h4>
        {task.url && (
          <a
            href={task.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-${priorityColor}-100 text-${priorityColor}-700`}>
          {priorityShort}
        </span>
        {task.task_type && task.task_type !== '未分类' && (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700">
            {task.task_type}
          </span>
        )}
      </div>

      {/* Assignee */}
      {task.assignee && task.assignee !== '未分配' && (
        <div className="flex items-center text-xs text-gray-600">
          <span className="mr-1">👤</span>
          <span>{task.assignee}</span>
        </div>
      )}

      {/* Blocked Warning */}
      {task.blocked_by_ids && task.blocked_by_ids.length > 0 && (
        <div className="mt-2 flex items-center text-xs text-red-600">
          <AlertCircle className="w-3 h-3 mr-1" />
          <span>被 {task.blocked_by_ids.length} 个任务阻止</span>
        </div>
      )}

      {/* Subtasks */}
      {task.child_ids && task.child_ids.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          <span>📋 {task.child_ids.length} 个子任务</span>
        </div>
      )}
    </div>
  )
}

export default TaskCard

import { Task } from '../types'
import { ExternalLink } from 'lucide-react'
import { formatDate as formatDateUtil } from '../utils/dateFormat'

interface TaskTableProps {
  tasks: Task[]
  onTaskClick?: (task: Task) => void
}

const TaskTable = ({ tasks, onTaskClick }: TaskTableProps) => {
  // 状态优先级排序
  const statusOrder: Record<string, number> = {
    '收集箱': 0,
    '进行中': 1,
    '暂停': 2,
    '已完成': 3,
    '已放弃': 4,
  }

  // 优先级数值映射（用于排序）
  const priorityOrder: Record<string, number> = {
    'P0 重要紧急': 0,
    'P1 重要不紧急': 1,
    'P2 紧急不重要': 2,
    'P3 不重要不紧急': 3,
  }

  // 排序任务
  const sortedTasks = [...tasks].sort((a, b) => {
    // 首先按状态排序
    const statusA = statusOrder[a.status] ?? 999
    const statusB = statusOrder[b.status] ?? 999
    if (statusA !== statusB) {
      return statusA - statusB
    }

    // 如果都是已完成状态，按完成时间倒序 -> 优先级倒序 -> 负责人正序
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

    // 其他状态按截止日期排序
    if (a.deadline && b.deadline) {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    }
    if (a.deadline) return -1
    if (b.deadline) return 1

    return new Date(b.created_time).getTime() - new Date(a.created_time).getTime()
  })

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      '收集箱': { label: '📥 收集箱', color: 'bg-yellow-100 text-yellow-700' },
      '进行中': { label: '🔵 进行中', color: 'bg-blue-100 text-blue-700' },
      '暂停': { label: '⏸️ 暂停', color: 'bg-gray-100 text-gray-700' },
      '已完成': { label: '✅ 已完成', color: 'bg-green-100 text-green-700' },
      '已放弃': { label: '❌ 已放弃', color: 'bg-red-100 text-red-700' },
    }
    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-700' }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, string> = {
      'P0 重要紧急': 'bg-red-100 text-red-700',
      'P1 重要不紧急': 'bg-orange-100 text-orange-700',
      'P2 紧急不重要': 'bg-purple-100 text-purple-700',
      'P3 不重要不紧急': 'bg-gray-100 text-gray-700',
    }
    const color = priorityConfig[priority] || 'bg-gray-100 text-gray-700'
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {priority.split(' ')[0]}
      </span>
    )
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-'
    return formatDateUtil(dateString)
  }

  // 格式化完成时间 - 直接显示数据库的值，不做时区转换
  const formatCompletedTime = (dateString: string | undefined) => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return dateString
      
      const year = date.getUTCFullYear()
      const month = String(date.getUTCMonth() + 1).padStart(2, '0')
      const day = String(date.getUTCDate()).padStart(2, '0')
      const hours = String(date.getUTCHours()).padStart(2, '0')
      const minutes = String(date.getUTCMinutes()).padStart(2, '0')
      
      return `${year}年${month}月${day}日 ${hours}:${minutes}`
    } catch (error) {
      return dateString
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                任务名称
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                任务类型
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                优先级
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                负责人
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                开始日期
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                截止日期
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                完成时间
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                备注
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedTasks.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-gray-400">
                  暂无任务
                </td>
              </tr>
            ) : (
              sortedTasks.map((task) => (
                <tr
                  key={task.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onTaskClick?.(task)}
                >
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{task.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">{task.task_type}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(task.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getPriorityBadge(task.priority)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{task.assignee}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {formatDate(task.start_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {formatDate(task.deadline)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {task.completed_time ? (
                      <span className="text-green-600">
                        {formatCompletedTime(task.completed_time)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {task.notes ? (
                      <div className="text-gray-600 max-w-xs">
                        {task.notes}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <a
                      href={task.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-purple-600 hover:text-purple-900 inline-flex items-center"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TaskTable

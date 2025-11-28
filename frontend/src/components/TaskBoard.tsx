import { useState } from 'react'
import { Task } from '../types'
import TaskCard from './TaskCard'
import { Inbox, Clock, Play, CheckCircle2, XCircle, PauseCircle } from 'lucide-react'

interface TaskBoardProps {
  tasks: Task[]
  onTasksChange: (tasks: Task[]) => void
  onTaskClick?: (task: Task) => void
}

const TaskBoard = ({ tasks, onTasksChange, onTaskClick }: TaskBoardProps) => {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)

  const columns = [
    { id: 'inbox', title: '📥 Inbox', icon: Inbox, color: 'gray' },
    { id: 'pending', title: '⏸️ Pending', icon: Clock, color: 'yellow' },
    { id: '暂停', title: '⏸️ 暂停', icon: PauseCircle, color: 'orange' },
    { id: 'doing', title: '🔄 进行中', icon: Play, color: 'blue' },
    { id: '已完成', title: '✅ 已完成', icon: CheckCircle2, color: 'green' },
    { id: '已放弃', title: '❌ 已放弃', icon: XCircle, color: 'red' },
  ]

  const getTasksByStatus = (status: string) => {
    return tasks.filter((task) => task.status === status)
  }

  const handleDragStart = (task: Task) => {
    setDraggedTask(task)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (status: string) => {
    if (!draggedTask) return

    // 更新任务状态
    const updatedTasks = tasks.map((task) =>
      task.id === draggedTask.id ? { ...task, status: status as Task['status'] } : task
    )
    onTasksChange(updatedTasks)
    setDraggedTask(null)

    // 调用 API 更新
    try {
      const { updateTask } = await import('../api')
      await updateTask(draggedTask.id, { status: status as Task['status'] })
    } catch (error) {
      console.error('Failed to update task:', error)
      // 回滚
      onTasksChange(tasks)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {columns.map((column) => {
        const columnTasks = getTasksByStatus(column.id)
        const Icon = column.icon

        return (
          <div
            key={column.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.id)}
          >
            {/* Column Header */}
            <div className={`bg-${column.color}-50 border-b border-${column.color}-100 px-4 py-3`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Icon className={`w-5 h-5 text-${column.color}-600`} />
                  <h3 className="font-semibold text-gray-900">{column.title}</h3>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full bg-${column.color}-100 text-${column.color}-700`}>
                  {columnTasks.length}
                </span>
              </div>
            </div>

            {/* Tasks */}
            <div className="p-4 space-y-3 min-h-[400px] max-h-[600px] overflow-y-auto">
              {columnTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">暂无任务</p>
                </div>
              ) : (
                columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onDragStart={() => handleDragStart(task)}
                    onClick={() => onTaskClick?.(task)}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default TaskBoard

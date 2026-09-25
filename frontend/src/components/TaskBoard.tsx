import { Task } from '../types'
import TaskKanban from './tasks/TaskKanban'

interface TaskBoardProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void
}

/**
 * /tasks 全量看板视图：复用与 dashboard 相同的 TaskKanban 组件，
 * 仅数据范围不同（这里是全部主任务，dashboard 是今日子集）。
 */
const TaskBoard = ({ tasks, onTaskClick, onTaskUpdate }: TaskBoardProps) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <TaskKanban
        tasks={tasks}
        onTaskClick={onTaskClick}
        onTaskUpdate={onTaskUpdate}
        doneMaxHeight={560}
      />
    </div>
  )
}

export default TaskBoard

import { Task } from '../../types'
import QuickLinks from './QuickLinks'
import TodayTasks from './TodayTasks'
import WeekHabits from './WeekHabits'
import StatsOverview from './StatsOverview'

interface DashboardPageProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onNavigateToHabits: () => void
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void
  /** 下钻到 /tasks 指定状态 */
  onDrillStatus?: (status: string) => void
  /** 跳转到 /tasks 全量看板 */
  onNavigateToBoard?: () => void
}

export default function DashboardPage({
  tasks,
  onTaskClick,
  onNavigateToHabits,
  onTaskUpdate,
  onDrillStatus,
  onNavigateToBoard,
}: DashboardPageProps) {
  return (
    <div className="space-y-4 max-w-6xl">
      {/* 聚焦 Hero 概览带 */}
      <StatsOverview tasks={tasks} onDrillStatus={onDrillStatus} />

      {/* 主体：左侧今日待办，右侧习惯（上）+ 快捷链接（下） */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-stretch">
        <div className="lg:col-span-3">
          <TodayTasks
            tasks={tasks}
            onTaskClick={onTaskClick}
            onTaskUpdate={onTaskUpdate}
            onManageAll={onNavigateToBoard}
          />
        </div>
        <div className="lg:col-span-2 flex flex-col gap-4">
          <WeekHabits onNavigateToHabits={onNavigateToHabits} />
          <QuickLinks />
        </div>
      </div>
    </div>
  )
}

import { Stats } from '../types'
import TodayActionCenter from './stats/TodayActionCenter'
import WeeklyProgress from './stats/WeeklyProgress'
import HealthDiagnosis from './stats/HealthDiagnosis'
import MonthlyOverview from './stats/MonthlyOverview'
import HabitWeekProgress from './stats/HabitWeekProgress'

interface StatsPanelProps {
  stats: Stats
  onFilterByPriority?: (priority: string) => void
  onFilterWeek?: () => void
  onViewHabits?: () => void
}

const StatsPanel = ({ stats, onFilterByPriority, onFilterWeek, onViewHabits }: StatsPanelProps) => {
  const handleViewP0Tasks = () => {
    onFilterByPriority?.('P0 重要紧急')
  }

  const handleViewP1Tasks = () => {
    onFilterByPriority?.('P1 重要不紧急')
  }

  const handleViewWeekTasks = () => {
    onFilterWeek?.()
  }

  return (
    <div className="space-y-6">
      {/* 今日行动中心 */}
      <TodayActionCenter
        taskStats={stats.tasks.today}
        habitStats={stats.habits?.today}
        onViewP0Tasks={handleViewP0Tasks}
        onViewP1Tasks={handleViewP1Tasks}
        onViewHabits={onViewHabits}
      />

      {/* 本周进展 */}
      <WeeklyProgress
        stats={stats.tasks.week}
        onViewWeekTasks={handleViewWeekTasks}
      />

      {/* 本周习惯养成 */}
      {stats.habits && <HabitWeekProgress stats={stats.habits.week} onViewHabits={onViewHabits} />}

      {/* 任务健康度诊断 */}
      <HealthDiagnosis stats={stats.tasks.health} />

      {/* 月度概览 */}
      <MonthlyOverview stats={stats.tasks.month} />
    </div>
  )
}

export default StatsPanel

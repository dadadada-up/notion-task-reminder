import { Target } from 'lucide-react'
import { HabitWeekStats } from '../../types'

interface HabitWeekProgressProps {
  stats: HabitWeekStats
  onViewHabits?: () => void
}

export default function HabitWeekProgress({ stats, onViewHabits }: HabitWeekProgressProps) {

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-2 mb-6">
        <Target className="text-purple-600" size={24} />
        <h2 className="text-lg font-semibold text-gray-900">🎯 本周习惯养成</h2>
      </div>

      {/* 本周打卡进度 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">📊 本周打卡</span>
        </div>
        
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-4xl font-bold text-gray-900">
            {stats.completed}
          </span>
          <span className="text-xl text-gray-500">/ {stats.target} 次</span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div
            className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(stats.completion_rate, 100)}%` }}
          />
        </div>

        <div className="text-sm text-gray-600">
          {stats.completion_rate}% 完成
        </div>
      </div>

      {/* 统计数据 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">已完成</div>
          <div className="text-3xl font-bold text-orange-600">
            {stats.completed}
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">最长连续</div>
          <div className="text-3xl font-bold text-purple-600">
            {stats.longest_streak}天
          </div>
        </div>
      </div>

      {/* 查看详情按钮 */}
      <button
        onClick={onViewHabits}
        className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium"
      >
        查看习惯详情
      </button>
    </div>
  )
}

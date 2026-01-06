import { BarChart3 } from 'lucide-react'
import { HabitStats } from '../../types'

interface HabitStatsCardProps {
  stats: HabitStats
}

export default function HabitStatsCard({ stats }: HabitStatsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="text-purple-600" size={24} />
        <h2 className="text-lg font-semibold">本月统计</h2>
      </div>

      {/* 统计数字 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">📈 总打卡</div>
          <div className="text-xl font-bold text-blue-600">
            {stats.month.completed}次
          </div>
        </div>

        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">✅ 完成率</div>
          <div className="text-xl font-bold text-green-600">
            {stats.month.completion_rate}%
          </div>
        </div>

        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">🔥 最长连续</div>
          <div className="text-xl font-bold text-orange-600">
            {stats.week.longest_streak}天
          </div>
        </div>

        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">🎯 活跃习惯</div>
          <div className="text-xl font-bold text-purple-600">
            {stats.habits.length}个
          </div>
        </div>
      </div>


      {/* 习惯排行预览 */}
      {stats.habits.length > 0 && (
        <div className="border-t pt-3 mt-3">
          <div className="text-xs font-medium text-gray-700 mb-2">习惯排行</div>
          <div className="space-y-1.5">
            {stats.habits.slice(0, 3).map((habit, index) => (
              <div key={habit.habit_id} className="flex items-center gap-2">
                <div className="text-sm font-bold text-gray-400 w-5">
                  {index + 1}.
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium truncate">{habit.habit_name}</span>
                    <span className="text-gray-600 ml-2">
                      {habit.completion_rate}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div
                      className="bg-purple-500 h-1.5 rounded-full"
                      style={{ width: `${habit.completion_rate}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

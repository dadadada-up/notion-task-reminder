import { WeeklyStats } from '../../types'
import { Target, TrendingUp, TrendingDown } from 'lucide-react'

interface WeeklyProgressProps {
  stats: WeeklyStats
  onViewWeekTasks?: () => void
}

const WeeklyProgress = ({ stats, onViewWeekTasks }: WeeklyProgressProps) => {
  const maxCompleted = Math.max(...stats.daily_trend.map(d => d.completed), 1)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
        <span className="mr-2">📅</span>
        本周进展
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 本周目标 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <Target className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">本周目标</span>
            </div>
            <span className="text-sm text-gray-500">
              {stats.completed}/{stats.target}
            </span>
          </div>

          <div className="mb-3">
            <div className="flex items-baseline mb-2">
              <span className="text-4xl font-bold text-gray-900">{stats.completed}</span>
              <span className="text-lg text-gray-500 ml-2">/ {stats.target} 个</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  stats.on_track
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                    : 'bg-gradient-to-r from-orange-500 to-orange-600'
                }`}
                style={{ width: `${Math.min(stats.completion_rate, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-gray-600">{stats.completion_rate.toFixed(0)}% 完成</span>
              {stats.on_track ? (
                <span className="text-xs text-green-600 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  进度正常
                </span>
              ) : (
                <span className="text-xs text-orange-600 flex items-center">
                  <TrendingDown className="w-3 h-3 mr-1" />
                  需要加速
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-orange-50 rounded-lg p-3">
              <div className="text-xs text-orange-600 mb-1">还需完成</div>
              <div className="text-2xl font-bold text-orange-900">{stats.remaining}</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="text-xs text-purple-600 mb-1">剩余天数</div>
              <div className="text-2xl font-bold text-purple-900">{stats.days_left}</div>
            </div>
          </div>

          <button
            onClick={onViewWeekTasks}
            className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            查看本周任务
          </button>
        </div>

        {/* 每日完成趋势 */}
        <div>
          <div className="flex items-center mb-3">
            <span className="text-sm font-medium text-gray-700">📊 完成趋势</span>
          </div>

          <div className="space-y-2">
            {stats.daily_trend.map((day) => (
              <div
                key={day.date}
                className={`flex items-center ${day.is_today ? 'bg-blue-50 rounded-lg p-2' : ''}`}
              >
                <div className="w-12 text-xs text-gray-600 font-medium">{day.day}</div>
                <div className="flex-1 mx-2">
                  <div className="w-full bg-gray-100 rounded-full h-6 relative overflow-hidden">
                    <div
                      className={`h-6 rounded-full transition-all duration-300 ${
                        day.is_today
                          ? 'bg-gradient-to-r from-blue-400 to-blue-500'
                          : 'bg-gradient-to-r from-gray-300 to-gray-400'
                      }`}
                      style={{ width: `${(day.completed / maxCompleted) * 100}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-xs font-medium ${day.completed > 0 ? 'text-white' : 'text-gray-500'}`}>
                        {day.completed > 0 ? day.completed : ''}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-8 text-right">
                  <span className={`text-xs font-medium ${day.is_today ? 'text-blue-600' : 'text-gray-600'}`}>
                    {day.completed}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* 预测信息 */}
          <div className="mt-4 bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">本周预测</div>
            <div className="text-sm text-gray-900">{stats.prediction}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WeeklyProgress

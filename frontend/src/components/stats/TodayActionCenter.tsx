import { TodayStats, HabitTodayStats } from '../../types'
import { Flame, AlertTriangle, CheckCircle, Target } from 'lucide-react'

interface TodayActionCenterProps {
  taskStats: TodayStats
  habitStats?: HabitTodayStats
  onViewP0Tasks?: () => void
  onViewP1Tasks?: () => void
  onViewHabits?: () => void
}

const TodayActionCenter = ({ taskStats, habitStats, onViewP0Tasks, onViewP1Tasks, onViewHabits }: TodayActionCenterProps) => {

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
        <span className="mr-2">🎯</span>
        今日行动中心
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* P0 紧急任务 */}
        <div 
          className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 cursor-pointer hover:shadow-md transition-all"
          onClick={onViewP0Tasks}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-700">🔥 P0 紧急</span>
            <Flame className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-3xl font-bold text-red-900">{taskStats.p0_urgent}</div>
          <div className="text-xs text-red-600 mt-1">立即处理</div>
        </div>

        {/* P1 重要任务 */}
        <div 
          className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 cursor-pointer hover:shadow-md transition-all"
          onClick={onViewP1Tasks}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-orange-700">⚠️ P1 重要</span>
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-3xl font-bold text-orange-900">{taskStats.p1_important}</div>
          <div className="text-xs text-orange-600 mt-1">今日计划</div>
        </div>

        {/* 今日打卡 */}
        {habitStats && (
          <div 
            className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 cursor-pointer hover:shadow-md transition-all"
            onClick={onViewHabits}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700">🎯 今日打卡</span>
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex items-baseline">
              <span className="text-3xl font-bold text-blue-900">{habitStats.completed}</span>
              <span className="text-lg text-blue-600 ml-1">/{habitStats.total}</span>
            </div>
            <div className="text-xs text-blue-600 mt-1">
              {habitStats.remaining > 0 ? `还差${habitStats.remaining}个习惯` : '全部完成'}
            </div>
          </div>
        )}

        {/* 今日完成 */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700">✅ 已完成</span>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-green-900">{taskStats.completed}</span>
            <span className="text-lg text-green-600 ml-1">/{taskStats.target}</span>
          </div>
          <div className="mt-2">
            <div className="w-full bg-green-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(taskStats.completion_rate, 100)}%` }}
              />
            </div>
            <div className="text-xs text-green-600 mt-1">{taskStats.completion_rate.toFixed(0)}% 完成</div>
          </div>
        </div>
      </div>

      {/* 智能建议 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <span className="text-blue-600 mr-2 mt-0.5">💡</span>
          <div className="flex-1">
            <div className="text-sm font-medium text-blue-900 mb-1">今日建议</div>
            <div className="text-sm text-blue-700">{taskStats.suggestion}</div>
            {habitStats && habitStats.remaining > 0 && (
              <div className="text-sm text-blue-700 mt-1">
                习惯：还有 {habitStats.remaining} 个习惯未打卡
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TodayActionCenter

import { useState } from 'react'
import { MonthlyStats } from '../../types'
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MonthlyOverviewProps {
  stats: MonthlyStats
}

const MonthlyOverview = ({ stats }: MonthlyOverviewProps) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const getTrendIcon = () => {
    switch (stats.trend) {
      case 'increasing':
        return <TrendingUp className="w-4 h-4 text-orange-600" />
      case 'decreasing':
        return <TrendingDown className="w-4 h-4 text-green-600" />
      default:
        return <Minus className="w-4 h-4 text-blue-600" />
    }
  }

  const getTrendColor = () => {
    switch (stats.trend) {
      case 'increasing':
        return 'text-orange-600 bg-orange-50'
      case 'decreasing':
        return 'text-green-600 bg-green-50'
      default:
        return 'text-blue-600 bg-blue-50'
    }
  }

  const getTrendText = () => {
    switch (stats.trend) {
      case 'increasing':
        return '任务在增加'
      case 'decreasing':
        return '任务在减少'
      default:
        return '任务量稳定'
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* 头部 - 可折叠 */}
      <div
        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <span className="mr-2">📈</span>
            月度概览
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({new Date().getFullYear()}年{new Date().getMonth() + 1}月)
            </span>
          </h2>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>

        {/* 简要信息 - 始终显示 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <div className="text-xs text-gray-600 mb-1">本月完成</div>
            <div className="text-2xl font-bold text-gray-900">{stats.completed}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1">月度目标</div>
            <div className="text-2xl font-bold text-gray-900">{stats.target}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1">完成率</div>
            <div className="text-2xl font-bold text-blue-600">{stats.completion_rate.toFixed(0)}%</div>
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1">净增长</div>
            <div className={`text-2xl font-bold ${stats.net_growth > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {stats.net_growth > 0 ? '+' : ''}{stats.net_growth}
            </div>
          </div>
        </div>
      </div>

      {/* 详细内容 - 可展开 */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 完成进度 */}
            <div>
              <div className="text-sm font-semibold text-gray-900 mb-3">完成进度</div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-baseline mb-2">
                  <span className="text-3xl font-bold text-gray-900">{stats.completed}</span>
                  <span className="text-lg text-gray-500 ml-2">/ {stats.target} 个</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      stats.completion_rate >= 80
                        ? 'bg-gradient-to-r from-green-500 to-green-600'
                        : stats.completion_rate >= 60
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                        : 'bg-gradient-to-r from-orange-500 to-orange-600'
                    }`}
                    style={{ width: `${Math.min(stats.completion_rate, 100)}%` }}
                  />
                </div>
                <div className="text-sm text-gray-600">{stats.completion_rate.toFixed(1)}% 完成</div>

                {/* 本月亮点 */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-600 mb-1">本月亮点</div>
                  <div className="text-sm text-gray-900">{stats.highlight}</div>
                </div>
              </div>
            </div>

            {/* 任务流动 */}
            <div>
              <div className="text-sm font-semibold text-gray-900 mb-3">任务流动</div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">本月新增</span>
                    <span className="text-lg font-bold text-blue-600">{stats.new_tasks}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">本月完成</span>
                    <span className="text-lg font-bold text-green-600">{stats.completed}</span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <span className="text-sm font-medium text-gray-900">净增长</span>
                    <span className={`text-xl font-bold ${stats.net_growth > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {stats.net_growth > 0 ? '+' : ''}{stats.net_growth}
                    </span>
                  </div>
                </div>

                {/* 趋势标签 */}
                <div className={`mt-4 flex items-center justify-center rounded-lg p-2 ${getTrendColor()}`}>
                  {getTrendIcon()}
                  <span className="text-sm font-medium ml-2">{getTrendText()}</span>
                </div>

                {/* 改进建议 */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-600 mb-1">改进建议</div>
                  <div className="text-sm text-gray-900">{stats.improvement}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
              查看详细统计
            </button>
            <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
              查看年度总结
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MonthlyOverview

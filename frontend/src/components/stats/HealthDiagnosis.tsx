import { HealthStats } from '../../types'
import { AlertTriangle, Activity, Package, ArrowRight } from 'lucide-react'

interface HealthDiagnosisProps {
  stats: HealthStats
}

const HealthDiagnosis = ({ stats }: HealthDiagnosisProps) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'medium':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      default:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    }
  }

  const getHealthColor = (level: string) => {
    switch (level) {
      case 'excellent':
        return 'text-green-600'
      case 'good':
        return 'text-blue-600'
      default:
        return 'text-orange-600'
    }
  }

  const getHealthEmoji = (level: string) => {
    switch (level) {
      case 'excellent':
        return '🟢'
      case 'good':
        return '🔵'
      default:
        return '🟠'
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <span className="mr-2">🏥</span>
          任务健康度诊断
        </h2>
        <div className="flex items-center">
          <span className="text-sm text-gray-600 mr-2">综合评分</span>
          <span className={`text-2xl font-bold ${getHealthColor(stats.overall_level)}`}>
            {stats.overall_score}
          </span>
          <span className="text-lg ml-1">{getHealthEmoji(stats.overall_level)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 风险预警 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 mr-2" />
            <span className="text-sm font-semibold text-gray-900">风险预警</span>
          </div>

          {stats.risks.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-4">
              ✅ 暂无风险
            </div>
          ) : (
            <div className="space-y-2">
              {stats.risks.map((risk, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-3 ${getSeverityColor(risk.severity)}`}
                >
                  <div className="text-sm font-medium mb-1">{risk.message}</div>
                  <div className="text-xs opacity-90">{risk.suggestion}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 流动效率 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <Activity className="w-5 h-5 text-blue-600 mr-2" />
            <span className="text-sm font-semibold text-gray-900">流动效率</span>
          </div>

          <div className="space-y-3">
            {/* 收集箱 → 进行中 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600">收集箱 → 进行中</span>
                <span className="text-sm font-bold text-gray-900">
                  {stats.flow.inbox_to_progress_rate.toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    stats.flow.inbox_to_progress_rate >= 60
                      ? 'bg-gradient-to-r from-green-400 to-green-500'
                      : 'bg-gradient-to-r from-orange-400 to-orange-500'
                  }`}
                  style={{ width: `${Math.min(stats.flow.inbox_to_progress_rate, 100)}%` }}
                />
              </div>
            </div>

            {/* 进行中 → 已完成 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600">进行中 → 已完成</span>
                <span className="text-sm font-bold text-gray-900">
                  {stats.flow.progress_to_done_rate.toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    stats.flow.progress_to_done_rate >= 80
                      ? 'bg-gradient-to-r from-green-400 to-green-500'
                      : 'bg-gradient-to-r from-orange-400 to-orange-500'
                  }`}
                  style={{ width: `${Math.min(stats.flow.progress_to_done_rate, 100)}%` }}
                />
              </div>
            </div>

            {/* 瓶颈提示 */}
            {stats.flow.bottleneck && (
              <div className="bg-orange-100 border border-orange-200 rounded-lg p-2 mt-2">
                <div className="text-xs text-orange-800">
                  ⚠️ 瓶颈：{stats.flow.bottleneck === 'inbox' ? '收集箱堆积' : '执行缓慢'}
                </div>
              </div>
            )}

            {/* 流程图 */}
            <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t border-gray-200">
              <div className="text-center">
                <div className="font-bold text-gray-900">{stats.flow.status_counts.inbox}</div>
                <div>收集箱</div>
              </div>
              <ArrowRight className="w-4 h-4" />
              <div className="text-center">
                <div className="font-bold text-gray-900">{stats.flow.status_counts.in_progress}</div>
                <div>进行中</div>
              </div>
              <ArrowRight className="w-4 h-4" />
              <div className="text-center">
                <div className="font-bold text-gray-900">{stats.flow.status_counts.done}</div>
                <div>已完成</div>
              </div>
            </div>
          </div>
        </div>

        {/* 积压情况 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <Package className="w-5 h-5 text-purple-600 mr-2" />
            <span className="text-sm font-semibold text-gray-900">积压情况</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">收集箱</span>
              <span className={`text-lg font-bold ${
                stats.backlog.inbox_count > 10 ? 'text-red-600' : 
                stats.backlog.inbox_count > 5 ? 'text-orange-600' : 'text-green-600'
              }`}>
                {stats.backlog.inbox_count}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">进行中</span>
              <span className={`text-lg font-bold ${
                stats.backlog.in_progress_count > 15 ? 'text-red-600' : 
                stats.backlog.in_progress_count > 10 ? 'text-orange-600' : 'text-green-600'
              }`}>
                {stats.backlog.in_progress_count}
              </span>
            </div>

            <div className={`rounded-lg p-3 mt-3 ${
              stats.backlog.status === 'critical' ? 'bg-red-100 border border-red-200' :
              stats.backlog.status === 'warning' ? 'bg-orange-100 border border-orange-200' :
              'bg-green-100 border border-green-200'
            }`}>
              <div className={`text-sm font-medium ${
                stats.backlog.status === 'critical' ? 'text-red-800' :
                stats.backlog.status === 'warning' ? 'text-orange-800' :
                'text-green-800'
              }`}>
                {stats.backlog.status === 'critical' ? '🔴' :
                 stats.backlog.status === 'warning' ? '🟡' : '🟢'} 
                {' '}{stats.backlog.recommendation}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HealthDiagnosis

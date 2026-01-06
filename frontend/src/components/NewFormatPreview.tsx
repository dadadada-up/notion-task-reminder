import React from 'react'

interface NewFormatPreviewProps {
  summary: any
}

const NewFormatPreview: React.FC<NewFormatPreviewProps> = ({ summary }) => {
  if (!summary) return null

  return (
    <div className="space-y-6">
      {/* 一、本周目标与完成情况 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          一、本周目标与完成情况
        </h2>
        
        {/* 目标表格 */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-center">序号</th>
                <th className="border border-gray-300 px-4 py-2 text-left">类型</th>
                <th className="border border-gray-300 px-4 py-2 text-left">任务</th>
                <th className="border border-gray-300 px-4 py-2 text-center">状态</th>
                <th className="border border-gray-300 px-4 py-2 text-center">优先级</th>
                <th className="border border-gray-300 px-4 py-2 text-left">备注</th>
              </tr>
            </thead>
            <tbody>
              {summary.goals && summary.goals.length > 0 ? (
                summary.goals.map((goal: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2 text-center">{index + 1}</td>
                    <td className="border border-gray-300 px-4 py-2 whitespace-nowrap">{goal.type || goal.category}</td>
                    <td className="border border-gray-300 px-4 py-2" style={{ wordBreak: 'break-word', maxWidth: '300px' }}>
                      {goal.task || goal.description}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        goal.status === '已完成' ? 'bg-green-100 text-green-800' :
                        goal.status === '进行中' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {goal.status}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-sm whitespace-nowrap">
                      <span className={`font-semibold ${
                        goal.priority?.includes('P0') ? 'text-red-600' :
                        goal.priority?.includes('P1') ? 'text-orange-600' :
                        goal.priority?.includes('P2') ? 'text-yellow-600' :
                        'text-gray-600'
                      }`}>
                        {goal.priority}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600" style={{ wordBreak: 'break-word', maxWidth: '200px' }}>
                      {goal.note}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                    暂无本周任务数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 二、习惯追踪 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          二、习惯追踪
        </h2>
        <div className="overflow-x-auto mb-4">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-left">星期</th>
                <th className="border border-gray-300 px-4 py-2 text-left">日期</th>
                {summary.habits.habit_items.map((habit: string) => (
                  <th key={habit} className="border border-gray-300 px-3 py-2 text-center text-sm">
                    {habit}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.habits.daily_records.map((record: any, index: number) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2">{record.weekday}</td>
                  <td className="border border-gray-300 px-4 py-2">{record.date.substring(5)}</td>
                  {summary.habits.habit_items.map((habit: string) => (
                    <td key={habit} className="border border-gray-300 px-3 py-2 text-center">
                      <span className={record.checks[habit] ? 'text-green-600 text-lg' : 'text-red-500'}>
                        {record.checks[habit] ? '✓' : '✗'}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
              {/* 完成率统计行 */}
              <tr className="bg-blue-50 font-semibold">
                <td className="border border-gray-300 px-4 py-2" colSpan={2}>完成率</td>
                {summary.habits.habit_items.map((habit: string) => (
                  <td key={habit} className="border border-gray-300 px-3 py-2 text-center text-sm">
                    {summary.habits.statistics[habit]?.completed || 0}/{summary.habits.statistics[habit]?.total || 0}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* 习惯总结 */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="font-semibold text-gray-800 mb-2">习惯总结：</p>
          <div className="space-y-1 text-sm">
            {summary.habits.habit_items.map((habit: string) => {
              const stat = summary.habits.statistics[habit]
              const rate = stat ? Math.round((stat.completed / stat.total) * 100) : 0
              let emoji = '⚠️'
              let label = '需要改善'
              if (rate === 100) {
                emoji = '✅'
                label = '坚持最好'
              } else if (rate >= 70) {
                emoji = '👍'
                label = '表现良好'
              }
              return (
                <p key={habit} className="text-gray-700">
                  {emoji} <span className="font-medium">{label}</span>：{habit} ({stat?.completed || 0}/{stat?.total || 0}天，{rate}%)
                </p>
              )
            })}
          </div>
        </div>
      </div>

      {/* 三、本周复盘 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6 pb-2 border-b-2 border-gray-200">
          三、本周复盘
        </h2>
        
        <div className="space-y-5">
          {/* Keep - 做得好的地方 */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200 shadow-sm">
            <h3 className="font-bold text-green-800 mb-3 flex items-center text-base">
              <span className="mr-2 text-xl">✅</span>
              做得好的地方（Keep/Reinforce）
            </h3>
            <ul className="space-y-2">
              {summary.kiss.keep.map((item: string, index: number) => (
                <li key={index} className="flex items-start text-gray-700 leading-relaxed">
                  <span className="mr-3 mt-1 text-green-600 font-bold">•</span>
                  <span className="flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Stop - 需要改进的问题 */}
          <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-5 border border-red-200 shadow-sm">
            <h3 className="font-bold text-red-800 mb-3 flex items-center text-base">
              <span className="mr-2 text-xl">⚠️</span>
              需要改进的问题（Stop/Solve）
            </h3>
            <ul className="space-y-2">
              {summary.kiss.stop.map((item: string, index: number) => (
                <li key={index} className="flex items-start text-gray-700 leading-relaxed">
                  <span className="mr-3 mt-1 text-red-600 font-bold">•</span>
                  <span className="flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Improve - 根本原因分析 */}
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-5 border border-yellow-200 shadow-sm">
            <h3 className="font-bold text-yellow-800 mb-4 flex items-center text-base">
              <span className="mr-2 text-xl">🔍</span>
              根本原因分析（Why）
            </h3>
            {summary.kiss.improve && summary.kiss.improve.length > 0 && (
              typeof summary.kiss.improve[0] === 'string' ? (
                <ul className="space-y-2">
                  {summary.kiss.improve.map((item: string, index: number) => (
                    <li key={index} className="flex items-start text-gray-700 leading-relaxed">
                      <span className="mr-3 mt-1 text-yellow-600 font-bold">•</span>
                      <span className="flex-1">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm bg-white rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-gradient-to-r from-yellow-100 to-amber-100">
                        <th className="border border-yellow-200 px-4 py-3 text-left font-semibold text-yellow-900">现象</th>
                        <th className="border border-yellow-200 px-4 py-3 text-left font-semibold text-yellow-900">表层原因</th>
                        <th className="border border-yellow-200 px-4 py-3 text-left font-semibold text-yellow-900">深层原因</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.kiss.improve.map((item: any, index: number) => (
                        <tr key={index} className="hover:bg-yellow-50 transition-colors">
                          <td className="border border-yellow-200 px-4 py-3 text-gray-700">{item.phenomenon || item.现象}</td>
                          <td className="border border-yellow-200 px-4 py-3 text-gray-700">{item.surface_reason || item.表层原因}</td>
                          <td className="border border-yellow-200 px-4 py-3 text-gray-700 whitespace-pre-line">{item.deep_reason || item.深层原因}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>

          {/* Try - 行动改进方案 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200 shadow-sm">
            <h3 className="font-bold text-blue-800 mb-4 flex items-center text-base">
              <span className="mr-2 text-xl">🎯</span>
              行动改进方案（Do/Try）
            </h3>
            {summary.kiss.try && summary.kiss.try.length > 0 && (
              typeof summary.kiss.try[0] === 'string' ? (
                <ul className="space-y-2">
                  {summary.kiss.try.map((item: string, index: number) => (
                    <li key={index} className="flex items-start text-gray-700 leading-relaxed">
                      <span className="mr-3 mt-1 text-blue-600 font-bold">•</span>
                      <span className="flex-1">{item}</span>
                    </li>
                  ))}
              </ul>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm bg-white rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-100 to-indigo-100">
                      <th className="border border-blue-200 px-4 py-3 text-left font-semibold text-blue-900">问题领域</th>
                      <th className="border border-blue-200 px-4 py-3 text-left font-semibold text-blue-900">下周具体行动</th>
                      <th className="border border-blue-200 px-4 py-3 text-left font-semibold text-blue-900">衡量指标</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.kiss.try.map((item: any, index: number) => (
                      <tr key={index} className="hover:bg-blue-50 transition-colors">
                        <td className="border border-blue-200 px-4 py-3 text-gray-700">{item.area || item.问题领域}</td>
                        <td className="border border-blue-200 px-4 py-3 text-gray-700 whitespace-pre-line">{item.actions || item.下周具体行动}</td>
                        <td className="border border-blue-200 px-4 py-3 text-gray-700">{item.metrics || item.衡量指标}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
          </div>
        </div>

        {/* 思考 */}
        <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg border-l-4 border-gray-400">
          <h3 className="font-semibold text-gray-800 mb-3">思考</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-start gap-2">
              <span className="font-semibold text-green-700 min-w-16">• 亮点：</span>
              <span className="whitespace-pre-line">{summary.summary.highlights}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-orange-700 min-w-16">• 不足：</span>
              <span className="whitespace-pre-line">{summary.summary.shortcomings}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-blue-700 min-w-16">• 改进：</span>
              <span className="whitespace-pre-line">{summary.summary.improvements}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 四、下周重点规划 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          四、下周重点规划
        </h2>
        
        {/* 三大核心目标 */}
        {summary.next_week_goals && summary.next_week_goals.length > 0 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-l-4 border-green-500">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
              <span className="mr-2">🏆</span>
              三大核心目标
            </h3>
            <ol className="space-y-2 text-sm text-gray-700">
              {summary.next_week_goals.map((goal: string, index: number) => (
                <li key={index} className="flex items-start">
                  <span className="font-semibold mr-2">{index + 1}.</span>
                  <span>{goal}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-center">序号</th>
                <th className="border border-gray-300 px-4 py-2 text-left">类别</th>
                <th className="border border-gray-300 px-4 py-2 text-left">任务</th>
                <th className="border border-gray-300 px-4 py-2 text-center">目标</th>
                <th className="border border-gray-300 px-4 py-2 text-left">关键行动</th>
              </tr>
            </thead>
            <tbody>
              {summary.next_week_plan.map((plan: any, index: number) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2 text-center">{index + 1}</td>
                  <td className="border border-gray-300 px-4 py-2">{plan.category}</td>
                  <td className="border border-gray-300 px-4 py-2">{plan.task}</td>
                  <td className="border border-gray-300 px-4 py-2 text-center">{plan.target}</td>
                  <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">{plan.actions || plan.关键行动 || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default NewFormatPreview

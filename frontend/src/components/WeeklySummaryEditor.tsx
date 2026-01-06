import React, { useState } from 'react'
import { Plus, Trash2, Save, X, Sparkles } from 'lucide-react'

interface WeeklySummaryEditorProps {
  summary: any
  onSave: (editedData: any) => void
  onCancel: () => void
  onAIOptimize?: (section: string, data: any) => Promise<any>
}

const WeeklySummaryEditor: React.FC<WeeklySummaryEditorProps> = ({
  summary,
  onSave,
  onCancel,
  onAIOptimize
}) => {
  const [editedData, setEditedData] = useState(JSON.parse(JSON.stringify(summary)))
  const [aiLoading, setAiLoading] = useState<string | null>(null)

  // 更新目标
  const updateGoal = (index: number, field: string, value: any) => {
    const newGoals = [...editedData.goals]
    newGoals[index] = { ...newGoals[index], [field]: value }
    setEditedData({ ...editedData, goals: newGoals })
  }

  // 添加目标
  const addGoal = () => {
    const newGoal = {
      type: '',
      task: '',
      status: '',
      priority: '',
      note: ''
    }
    setEditedData({ ...editedData, goals: [...editedData.goals, newGoal] })
  }

  // 删除目标
  const deleteGoal = (index: number) => {
    const newGoals = editedData.goals.filter((_: any, i: number) => i !== index)
    setEditedData({ ...editedData, goals: newGoals })
  }

  // 更新习惯打卡
  const toggleHabitCheck = (dateIndex: number, habit: string) => {
    const newHabits = { ...editedData.habits }
    const record = newHabits.daily_records[dateIndex]
    record.checks[habit] = !record.checks[habit]
    
    // 重新计算统计
    const statistics: any = {}
    newHabits.habit_items.forEach((habitItem: string) => {
      const completed = newHabits.daily_records.filter(
        (r: any) => r.checks[habitItem]
      ).length
      const total = newHabits.daily_records.length
      statistics[habitItem] = {
        completed,
        total,
        rate: `${Math.round((completed / total) * 100)}%`
      }
    })
    newHabits.statistics = statistics
    
    setEditedData({ ...editedData, habits: newHabits })
  }

  // 添加习惯项
  const addHabitItem = () => {
    const habitName = prompt('请输入习惯名称：')
    if (!habitName) return
    
    const newHabits = { ...editedData.habits }
    newHabits.habit_items.push(habitName)
    
    // 为所有日期添加这个习惯的打卡记录
    newHabits.daily_records.forEach((record: any) => {
      record.checks[habitName] = false
    })
    
    // 添加统计
    newHabits.statistics[habitName] = {
      completed: 0,
      total: newHabits.daily_records.length,
      rate: '0%'
    }
    
    setEditedData({ ...editedData, habits: newHabits })
  }

  // 删除习惯项
  const deleteHabitItem = (habitName: string) => {
    if (!confirm(`确定要删除习惯"${habitName}"吗？`)) return
    
    const newHabits = { ...editedData.habits }
    
    // 从habit_items中删除
    newHabits.habit_items = newHabits.habit_items.filter((h: string) => h !== habitName)
    
    // 从所有日期记录中删除
    newHabits.daily_records.forEach((record: any) => {
      delete record.checks[habitName]
    })
    
    // 从统计中删除
    delete newHabits.statistics[habitName]
    
    setEditedData({ ...editedData, habits: newHabits })
  }

  // 更新KISS
  const updateKiss = (type: 'keep' | 'improve' | 'stop' | 'try', index: number, value: string) => {
    const newKiss = { ...editedData.kiss }
    newKiss[type][index] = value
    setEditedData({ ...editedData, kiss: newKiss })
  }

  // 添加KISS项
  const addKissItem = (type: 'keep' | 'improve' | 'stop' | 'try') => {
    const newKiss = { ...editedData.kiss }
    newKiss[type].push('')
    setEditedData({ ...editedData, kiss: newKiss })
  }

  // 删除KISS项
  const deleteKissItem = (type: 'keep' | 'improve' | 'stop' | 'try', index: number) => {
    const newKiss = { ...editedData.kiss }
    newKiss[type] = newKiss[type].filter((_: any, i: number) => i !== index)
    setEditedData({ ...editedData, kiss: newKiss })
  }

  // AI优化
  const handleAIOptimize = async (section: string) => {
    if (!onAIOptimize) return
    
    setAiLoading(section)
    try {
      const optimized = await onAIOptimize(section, editedData[section])
      setEditedData({ ...editedData, [section]: optimized })
      alert('AI优化完成！')
    } catch (error) {
      console.error('AI优化失败:', error)
      alert('AI优化失败，请重试')
    } finally {
      setAiLoading(null)
    }
  }

  // 更新下周计划
  const updatePlan = (index: number, field: string, value: any) => {
    const newPlans = [...editedData.next_week_plan]
    newPlans[index] = { ...newPlans[index], [field]: value }
    setEditedData({ ...editedData, next_week_plan: newPlans })
  }

  // 添加计划
  const addPlan = () => {
    const newPlan = {
      category: '',
      task: '',
      target: '',
      actions: ''
    }
    setEditedData({ ...editedData, next_week_plan: [...editedData.next_week_plan, newPlan] })
  }

  // 删除计划
  const deletePlan = (index: number) => {
    const newPlans = editedData.next_week_plan.filter((_: any, i: number) => i !== index)
    setEditedData({ ...editedData, next_week_plan: newPlans })
  }

  return (
    <div className="space-y-6">
      {/* 一、本周目标与完成情况 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">一、本周目标与完成情况</h2>
          <button
            onClick={addGoal}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            添加目标
          </button>
        </div>
        {/* 表头 */}
        <div className="flex items-center gap-3 px-3 py-2 bg-gray-100 rounded-lg font-semibold text-sm text-gray-700">
          <div className="w-24">类型</div>
          <div className="flex-1">任务</div>
          <div className="w-24">状态</div>
          <div className="w-32">优先级</div>
          <div className="w-32">备注</div>
          <div className="w-10">操作</div>
        </div>
        
        <div className="space-y-3">
          {editedData.goals.map((goal: any, index: number) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <input
                type="text"
                value={goal.type || goal.category || ''}
                onChange={(e) => updateGoal(index, 'type', e.target.value)}
                placeholder="类型"
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={goal.task || goal.description || ''}
                onChange={(e) => updateGoal(index, 'task', e.target.value)}
                placeholder="任务"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={goal.status || ''}
                onChange={(e) => updateGoal(index, 'status', e.target.value)}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">选择状态</option>
                <option value="已完成">已完成</option>
                <option value="进行中">进行中</option>
                <option value="待办">待办</option>
                <option value="已取消">已取消</option>
              </select>
              <select
                value={goal.priority || ''}
                onChange={(e) => updateGoal(index, 'priority', e.target.value)}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">选择优先级</option>
                <option value="P0 重要紧急">P0 重要紧急</option>
                <option value="P1 重要不紧急">P1 重要不紧急</option>
                <option value="P2 紧急不重要">P2 紧急不重要</option>
                <option value="P3 不重要不紧急">P3 不重要不紧急</option>
              </select>
              <input
                type="text"
                value={goal.note || ''}
                onChange={(e) => updateGoal(index, 'note', e.target.value)}
                placeholder="备注"
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => deleteGoal(index)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 二、习惯打卡追踪 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">二、习惯打卡追踪</h2>
          <button
            onClick={addHabitItem}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            添加习惯
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-left">星期</th>
                <th className="border border-gray-300 px-4 py-2 text-left">日期</th>
                {editedData.habits.habit_items.map((habit: string) => (
                  <th key={habit} className="border border-gray-300 px-3 py-2 text-center text-sm">
                    <div className="flex items-center justify-center gap-2">
                      <span>{habit}</span>
                      <button
                        onClick={() => deleteHabitItem(habit)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="删除此习惯"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {editedData.habits.daily_records.map((record: any, dateIndex: number) => (
                <tr key={dateIndex} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2">{record.weekday}</td>
                  <td className="border border-gray-300 px-4 py-2">{record.date.substring(5)}</td>
                  {editedData.habits.habit_items.map((habit: string) => (
                    <td key={habit} className="border border-gray-300 px-3 py-2 text-center">
                      <button
                        onClick={() => toggleHabitCheck(dateIndex, habit)}
                        className={`w-8 h-8 rounded-lg transition-colors ${
                          record.checks[habit]
                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                            : 'bg-red-100 text-red-600 hover:bg-red-200'
                        }`}
                      >
                        {record.checks[habit] ? '✓' : '✗'}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
              {/* 完成率统计行 */}
              <tr className="bg-blue-50 font-semibold">
                <td className="border border-gray-300 px-4 py-2" colSpan={2}>完成率</td>
                {editedData.habits.habit_items.map((habit: string) => (
                  <td key={habit} className="border border-gray-300 px-3 py-2 text-center text-sm">
                    {editedData.habits.statistics[habit]?.rate || '0%'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 四、KISS复盘 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">四、KISS复盘</h2>
          {onAIOptimize && (
            <button
              onClick={() => handleAIOptimize('kiss')}
              disabled={aiLoading === 'kiss'}
              className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm disabled:bg-gray-400"
            >
              <Sparkles className="w-4 h-4" />
              {aiLoading === 'kiss' ? 'AI优化中...' : 'AI优化'}
            </button>
          )}
        </div>
        <div className="space-y-4">
          {(['keep', 'improve', 'stop', 'try'] as const).map((type) => (
            <div key={type} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-800">
                  {type === 'keep' && 'Keep (继续保持)'}
                  {type === 'improve' && 'Improve (需要改进)'}
                  {type === 'stop' && 'Stop (停止做)'}
                  {type === 'try' && 'Try (尝试新的)'}
                </h3>
                <button
                  onClick={() => addKissItem(type)}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  + 添加
                </button>
              </div>
              <div className="space-y-2">
                {editedData.kiss[type].map((item: string, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => updateKiss(type, index, e.target.value)}
                      placeholder={`输入${type}内容...`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => deleteKissItem(type, index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 思考（整合到KISS复盘中） */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">思考</h2>
          {onAIOptimize && (
            <button
              onClick={() => handleAIOptimize('summary')}
              disabled={aiLoading === 'summary'}
              className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm disabled:bg-gray-400"
            >
              <Sparkles className="w-4 h-4" />
              {aiLoading === 'summary' ? 'AI优化中...' : 'AI优化'}
            </button>
          )}
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">亮点</label>
            <textarea
              value={editedData.summary.highlights}
              onChange={(e) => setEditedData({
                ...editedData,
                summary: { ...editedData.summary, highlights: e.target.value }
              })}
              rows={2}
              placeholder="例如：工作管理到位、生活各方面都有兼顾"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">不足</label>
            <textarea
              value={editedData.summary.shortcomings}
              onChange={(e) => setEditedData({
                ...editedData,
                summary: { ...editedData.summary, shortcomings: e.target.value }
              })}
              rows={2}
              placeholder="例如：工作学习未安排"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">改进</label>
            <textarea
              value={editedData.summary.improvements}
              onChange={(e) => setEditedData({
                ...editedData,
                summary: { ...editedData.summary, improvements: e.target.value }
              })}
              rows={2}
              placeholder="例如：下周加入工作学习目标"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 四、下周重点规划 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">四、下周重点规划</h2>
          <div className="flex items-center gap-2">
            {onAIOptimize && (
              <button
                onClick={() => handleAIOptimize('next_week_plan')}
                disabled={aiLoading === 'next_week_plan'}
                className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm disabled:bg-gray-400"
              >
                <Sparkles className="w-4 h-4" />
                {aiLoading === 'next_week_plan' ? 'AI优化中...' : 'AI优化'}
              </button>
            )}
            <button
              onClick={addPlan}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              添加计划
            </button>
          </div>
        </div>
        {/* 表头 */}
        <div className="flex items-center gap-3 px-3 py-2 bg-gray-100 rounded-lg font-semibold text-sm text-gray-700">
          <div className="w-32">类别</div>
          <div className="flex-1">任务</div>
          <div className="w-24">目标</div>
          <div className="flex-1">关键行动</div>
          <div className="w-10">操作</div>
        </div>
        
        <div className="space-y-3">
          {editedData.next_week_plan.map((plan: any, index: number) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <input
                type="text"
                value={plan.category}
                onChange={(e) => updatePlan(index, 'category', e.target.value)}
                placeholder="类别"
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={plan.task}
                onChange={(e) => updatePlan(index, 'task', e.target.value)}
                placeholder="任务"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={plan.target}
                onChange={(e) => updatePlan(index, 'target', e.target.value)}
                placeholder="目标"
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={plan.actions || plan.关键行动 || ''}
                onChange={(e) => updatePlan(index, 'actions', e.target.value)}
                placeholder="关键行动"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => deletePlan(index)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-4 sticky bottom-6 bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <button
          onClick={() => onSave(editedData)}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          <Save className="w-5 h-5" />
          保存
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
        >
          <X className="w-5 h-5" />
          取消
        </button>
      </div>
    </div>
  )
}

export default WeeklySummaryEditor

import { useState } from 'react'
import { Check, Square, Flame, Edit, Pause, Play } from 'lucide-react'
import { Habit } from '../../types'

interface HabitCardProps {
  habit: Habit
  checked: boolean
  onCheckIn: (completed: boolean, date?: string) => void
  onEdit?: (habit: Habit) => void
  onPause?: (habit: Habit) => void
  date?: string
}

export default function HabitCard({ habit, checked, onCheckIn, onEdit, onPause, date }: HabitCardProps) {
  const [isChecking, setIsChecking] = useState(false)

  const handleClick = async () => {
    if (isChecking) return
    setIsChecking(true)
    try {
      await onCheckIn(!checked, date)
    } finally {
      setIsChecking(false)
    }
  }

  const completionRate = (habit.monthly_target && habit.monthly_target > 0)
    ? (habit.monthly_completed / habit.monthly_target) * 100
    : 0

  return (
    <div
      className={`group border rounded-lg p-4 transition-all ${
        checked
          ? 'bg-green-50 border-green-300'
          : 'bg-white border-gray-200 hover:border-purple-300'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* 复选框 - 点击打卡 */}
        <div className="mt-0.5 cursor-pointer" onClick={handleClick}>
          {checked ? (
            <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
              <Check size={16} className="text-white" />
            </div>
          ) : (
            <Square size={24} className="text-gray-400 hover:text-purple-500 transition-colors" />
          )}
        </div>

        {/* 习惯信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className={`font-medium truncate ${checked ? 'text-green-700' : 'text-gray-900'}`}>
              {habit.name}
            </h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                {habit.frequency}
              </span>
              {checked ? (
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded font-medium flex items-center gap-1">
                  <Check size={12} />
                  已完成
                </span>
              ) : (
                <button
                  className="text-xs px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClick()
                  }}
                >
                  {date && date !== new Date().toISOString().split('T')[0] ? '补卡' : '打卡'}
                </button>
              )}

              {/* hover 管理按钮 */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onEdit && (
                  <button
                    className="p-1.5 rounded-md hover:bg-purple-100 text-gray-400 hover:text-purple-600 transition-colors"
                    title="编辑"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(habit)
                    }}
                  >
                    <Edit size={14} />
                  </button>
                )}
                {onPause && (
                  <button
                    className="p-1.5 rounded-md hover:bg-amber-100 text-gray-400 hover:text-amber-600 transition-colors"
                    title={habit.status === '暂停' ? '恢复' : '暂停'}
                    onClick={(e) => {
                      e.stopPropagation()
                      onPause(habit)
                    }}
                  >
                    {habit.status === '暂停' ? <Play size={14} /> : <Pause size={14} />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 统计信息 */}
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
            <div className="flex items-center gap-1">
              <Flame size={14} className="text-orange-500" />
              <span>累计 {habit.total_completed || 0} 天</span>
            </div>
            <div>
              本月 {habit.monthly_completed}/{habit.monthly_target || 30} ({completionRate.toFixed(0)}%)
            </div>
          </div>

          {/* 进度条 */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                checked ? 'bg-green-500' : 'bg-purple-500'
              }`}
              style={{ width: `${Math.min(completionRate, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

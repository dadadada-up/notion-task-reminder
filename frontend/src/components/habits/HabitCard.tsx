import { useState } from 'react'
import { Check, Square, Flame } from 'lucide-react'
import { Habit } from '../../types'

interface HabitCardProps {
  habit: Habit
  checked: boolean
  onCheckIn: (completed: boolean, date?: string) => void
  date?: string
}

export default function HabitCard({ habit, checked, onCheckIn, date }: HabitCardProps) {
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

  const handleManualCheckOut = async () => {
    if (isChecking) return
    
    setIsChecking(true)
    try {
      await onCheckIn(false, date)
    } finally {
      setIsChecking(false)
    }
  }

  const completionRate = (habit.monthly_target && habit.monthly_target > 0)
    ? (habit.monthly_completed / habit.monthly_target) * 100
    : 0

  return (
    <div
      className={`border rounded-lg p-4 transition-all cursor-pointer ${
        checked
          ? 'bg-green-50 border-green-300'
          : 'bg-white border-gray-200 hover:border-purple-300'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        {/* 复选框 */}
        <div className="mt-0.5">
          {checked ? (
            <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
              <Check size={16} className="text-white" />
            </div>
          ) : (
            <Square size={24} className="text-gray-400" />
          )}
        </div>

        {/* 习惯信息 */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className={`font-medium ${checked ? 'text-green-700' : 'text-gray-900'}`}>
              {habit.name}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                {habit.frequency}
              </span>
              {checked && (
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded font-medium">
                  已完成✓
                </span>
              )}
              {!checked && (
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
              {checked && date && date !== new Date().toISOString().split('T')[0] && (
                <div className="flex gap-1">
                  <button
                    className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleManualCheckOut()
                    }}
                  >
                    取消
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 统计信息 */}
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
            <div className="flex items-center gap-1">
              <Flame size={14} className="text-orange-500" />
              <span>连续 {habit.total_completed || 0} 天</span>
            </div>
            <div>
              本月 {habit.monthly_completed}/{habit.monthly_target} ({completionRate.toFixed(0)}%)
            </div>
            {date && date !== new Date().toISOString().split('T')[0] && (
              <div className="text-xs text-gray-500">
                {date}
              </div>
            )}
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

          {/* 备注 */}
          {checked && habit.notes && (
            <div className="mt-2 text-sm text-gray-600 bg-white rounded p-2">
              📝 备注: {habit.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

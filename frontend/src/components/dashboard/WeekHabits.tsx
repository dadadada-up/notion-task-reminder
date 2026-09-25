import { useState, useEffect, useMemo } from 'react'
import { Target, ChevronRight, Check, Circle } from 'lucide-react'
import { fetchHabits, fetchDailyLogs, createDailyLog } from '../../api'
import { Habit } from '../../types'
import { getTodayStr } from '../../utils/dateFormat'

interface WeekHabitsProps {
  onNavigateToHabits: () => void
}

export default function WeekHabits({ onNavigateToHabits }: WeekHabitsProps) {
  const [habits, setHabits] = useState<Habit[]>([])
  const [weekLogs, setWeekLogs] = useState<Record<string, Record<string, boolean>>>({})
  const [loading, setLoading] = useState(true)

  const { weekDays, weekStart, weekEnd } = useMemo(() => {
    // 以北京时间今天为基准，用 UTC 纯日期运算构建本周（避免 toISOString 在东八区退成昨天）
    const todayStr = getTodayStr()
    const base = new Date(todayStr + 'T00:00:00Z')
    const dayOfWeek = base.getUTCDay() || 7 // 周日为7
    const start = new Date(base)
    start.setUTCDate(base.getUTCDate() - dayOfWeek + 1)

    const days: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setUTCDate(start.getUTCDate() + i)
      days.push(d.toISOString().split('T')[0])
    }

    const end = new Date(start)
    end.setUTCDate(start.getUTCDate() + 6)

    return {
      weekDays: days,
      weekStart: days[0],
      weekEnd: end.toISOString().split('T')[0],
    }
  }, [])

  const dayLabels = ['一', '二', '三', '四', '五', '六', '日']

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [habitsData, logsData] = await Promise.all([
        fetchHabits('生效'),
        fetchDailyLogs({ start_date: weekStart, end_date: weekEnd }),
      ])
      setHabits(habitsData)

      // 构建 habitId -> { date -> completed } 映射
      const logMap: Record<string, Record<string, boolean>> = {}
      for (const log of logsData) {
        for (const habitId of log.habit_ids || []) {
          if (!logMap[habitId]) logMap[habitId] = {}
          logMap[habitId][log.date] = log.completed
        }
      }
      setWeekLogs(logMap)
    } catch (error) {
      console.error('加载习惯数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickCheckIn = async (habitId: string, date: string) => {
    const isCompleted = weekLogs[habitId]?.[date]
    try {
      if (isCompleted) {
        // 取消打卡暂不支持，只做正向打卡
        return
      }
      await createDailyLog({ habit_id: habitId, date, completed: true })
      setWeekLogs(prev => ({
        ...prev,
        [habitId]: { ...(prev[habitId] || {}), [date]: true }
      }))
    } catch (error) {
      console.error('打卡失败:', error)
    }
  }

  // 计算本周完成率
  const weekStats = useMemo(() => {
    if (habits.length === 0) return { completed: 0, total: 0, rate: 0 }
    let completed = 0
    let total = 0
    const today = getTodayStr()
    for (const habit of habits) {
      for (const day of weekDays) {
        if (day > today) continue // 跳过未来天数
        total++
        if (weekLogs[habit.id]?.[day]) completed++
      }
    }
    return { completed, total, rate: total > 0 ? Math.round((completed / total) * 100) : 0 }
  }, [habits, weekLogs, weekDays])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Target className="w-4 h-4 text-green-600" />
          本周习惯打卡
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            完成率 <span className={`font-semibold ${weekStats.rate >= 80 ? 'text-green-600' : weekStats.rate >= 50 ? 'text-orange-500' : 'text-red-500'}`}>{weekStats.rate}%</span>
          </span>
          <button
            onClick={onNavigateToHabits}
            className="flex items-center gap-0.5 text-xs text-green-600 hover:text-green-700 font-medium"
          >
            详情 <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {habits.length === 0 ? (
        <div className="text-center py-8">
          <Target className="w-10 h-10 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-500">还没有生效中的习惯</p>
          <button onClick={onNavigateToHabits} className="text-xs text-green-600 hover:text-green-700 mt-1">
            去创建习惯
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* 表头 */}
          <div className="flex items-center gap-2">
            <div className="w-24 flex-shrink-0 text-[11px] text-gray-400">习惯</div>
            <div className="flex-1 grid grid-cols-7 gap-1">
              {dayLabels.map((label, i) => {
                const isToday = weekDays[i] === getTodayStr()
                return (
                  <div key={i} className={`text-center text-[11px] ${isToday ? 'text-green-600 font-bold' : 'text-gray-400'}`}>
                    {label}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 习惯行 */}
          {habits.map(habit => {
            const habitLogs = weekLogs[habit.id] || {}
            const todayStr = getTodayStr()
            const completedDays = weekDays.filter(d => d <= todayStr && habitLogs[d]).length
            const targetDays = weekDays.filter(d => d <= todayStr).length

            return (
              <div key={habit.id} className="flex items-center gap-2">
                <div className="w-24 flex-shrink-0">
                  <p className="text-sm text-gray-900 truncate" title={habit.name}>{habit.name}</p>
                  <p className="text-[10px] text-gray-400">{completedDays}/{targetDays}</p>
                </div>
                <div className="flex-1 grid grid-cols-7 gap-1">
                  {weekDays.map((day) => {
                    const isCompleted = habitLogs[day]
                    const isToday = day === todayStr
                    const isPast = day < todayStr
                    const isFuture = day > todayStr

                    return (
                      <button
                        key={day}
                        onClick={() => !isCompleted && !isFuture && handleQuickCheckIn(habit.id, day)}
                        disabled={isCompleted || isFuture}
                        className={`aspect-square rounded-lg flex items-center justify-center transition-all ${
                          isCompleted
                            ? 'bg-green-100 text-green-600'
                            : isToday
                              ? 'border-2 border-green-300 hover:bg-green-50 cursor-pointer'
                              : isPast
                                ? 'bg-gray-50 text-gray-300 hover:bg-green-50 cursor-pointer'
                                : 'bg-gray-50/50 text-gray-200 cursor-default'
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Circle className="w-3 h-3" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

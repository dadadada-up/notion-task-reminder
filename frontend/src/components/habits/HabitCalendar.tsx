import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { fetchCalendarData, fetchDailyLogs } from '../../api'
import { CalendarData, DailyLog } from '../../types'

interface HabitCalendarProps {
  onDateSelect?: (date: string, logs: DailyLog[]) => void
  selectedDate?: string
}

export default function HabitCalendar({ onDateSelect, selectedDate }: HabitCalendarProps = {}) {
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [calendarData, setCalendarData] = useState<CalendarData[]>([])

  useEffect(() => {
    loadCalendarData()
  }, [year, month])

  const loadCalendarData = async () => {
    try {
      const data = await fetchCalendarData(year, month)
      setCalendarData(data)
    } catch (error) {
      console.error('加载日历数据失败:', error)
    }
  }

  const getDaysInMonth = () => {
    return new Date(year, month, 0).getDate()
  }

  const getFirstDayOfMonth = () => {
    return new Date(year, month - 1, 1).getDay()
  }

  const prevMonth = () => {
    if (month === 1) {
      setYear(year - 1)
      setMonth(12)
    } else {
      setMonth(month - 1)
    }
  }

  const nextMonth = () => {
    if (month === 12) {
      setYear(year + 1)
      setMonth(1)
    } else {
      setMonth(month + 1)
    }
  }

  const getDateData = (day: number): CalendarData | undefined => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return calendarData.find(d => d.date === dateStr)
  }

  const getDateColor = (day: number): string => {
    const dateData = getDateData(day)
    if (!dateData || dateData.total_count === 0) return 'bg-gray-100'
    
    const rate = (dateData.completed_count / dateData.total_count) * 100
    
    if (rate === 100) return 'bg-green-500'
    if (rate >= 50) return 'bg-yellow-400'
    return 'bg-red-400'
  }

  const isToday = (day: number): boolean => {
    const today = new Date()
    return (
      year === today.getFullYear() &&
      month === today.getMonth() + 1 &&
      day === today.getDate()
    )
  }

  const daysInMonth = getDaysInMonth()
  const firstDay = getFirstDayOfMonth()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i)

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">打卡日历</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-medium min-w-[100px] text-center">
            {year}年{month}月
          </span>
          <button
            onClick={nextMonth}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['日', '一', '二', '三', '四', '五', '六'].map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-600 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-2">
        {/* 空白占位 */}
        {emptyDays.map(i => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        
        {/* 日期 */}
        {days.map(day => {
          const dateData = getDateData(day)
          const color = getDateColor(day)
          const today = isToday(day)
          
          return (
            <div
              key={day}
              className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all cursor-pointer hover:scale-110 ${color} ${
                today ? 'ring-2 ring-purple-500 ring-offset-2' : ''
              } ${
                selectedDate === `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` ? 'ring-2 ring-blue-500 ring-offset-2' : ''
              } ${
                dateData && dateData.total_count > 0
                  ? 'text-white'
                  : 'text-gray-600'
              }`}
              title={
                dateData
                  ? `${dateData.completed_count}/${dateData.total_count} 完成`
                  : '无打卡'
              }
              onClick={async () => {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                try {
                  // 获取当天的打卡记录
                  const logs = await fetchDailyLogs({
                    start_date: dateStr,
                    end_date: dateStr
                  })
                  if (onDateSelect) {
                    onDateSelect(dateStr, logs)
                  }
                } catch (error) {
                  console.error('获取打卡记录失败:', error)
                  if (onDateSelect) {
                    onDateSelect(dateStr, [])
                  }
                }
              }}
            >
              {day}
            </div>
          )
        })}
      </div>

      {/* 图例 */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-500 rounded" />
          <span>已完成</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-yellow-400 rounded" />
          <span>部分完成</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-400 rounded" />
          <span>未完成</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-gray-100 rounded" />
          <span>无打卡</span>
        </div>
      </div>
    </div>
  )
}

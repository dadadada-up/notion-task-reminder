import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

interface DatePickerProps {
  value: string // YYYY-MM-DD
  onChange: (value: string) => void
  placeholder?: string
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

const DatePicker = ({ value, onChange, placeholder = '选择日期' }: DatePickerProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 解析当前日期或默认今天
  const parsedDate = value ? new Date(value + 'T00:00:00') : new Date()
  const [viewYear, setViewYear] = useState(parsedDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(parsedDate.getMonth()) // 0-based

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // 生成日历网格
  const generateDays = () => {
    const firstDay = new Date(viewYear, viewMonth, 1)
    // 周一为起始（0=周一, 6=周日）
    let startWeekday = firstDay.getDay() - 1
    if (startWeekday < 0) startWeekday = 6

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate()

    const days: { day: number; month: number; year: number; isCurrentMonth: boolean }[] = []

    // 上月尾部
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i
      const m = viewMonth - 1 < 0 ? 11 : viewMonth - 1
      const y = viewMonth - 1 < 0 ? viewYear - 1 : viewYear
      days.push({ day: d, month: m, year: y, isCurrentMonth: false })
    }

    // 本月
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ day: d, month: viewMonth, year: viewYear, isCurrentMonth: true })
    }

    // 下月头部（补满 6 行 = 42 格）
    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth + 1 > 11 ? 0 : viewMonth + 1
      const y = viewMonth + 1 > 11 ? viewYear + 1 : viewYear
      days.push({ day: d, month: m, year: y, isCurrentMonth: false })
    }

    return days
  }

  const formatDate = (y: number, m: number, d: number) => {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  const isToday = (y: number, m: number, d: number) => {
    const now = new Date()
    return y === now.getFullYear() && m === now.getMonth() && d === now.getDate()
  }

  const isSelected = (y: number, m: number, d: number) => {
    return value === formatDate(y, m, d)
  }

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1)
      setViewMonth(11)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1)
      setViewMonth(0)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  const handleSelect = (y: number, m: number, d: number) => {
    onChange(formatDate(y, m, d))
    setIsOpen(false)
  }

  // 显示文本
  const displayText = value
    ? `${parsedDate.getFullYear()}/${String(parsedDate.getMonth() + 1).padStart(2, '0')}/${String(parsedDate.getDate()).padStart(2, '0')}`
    : ''

  const days = generateDays()

  return (
    <div ref={containerRef} className="relative">
      {/* 触发按钮 */}
      <div
        className="flex items-center bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-purple-300 transition-colors w-full"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Calendar className="absolute left-3 w-4 h-4 text-gray-400" />
        <span className={`pl-9 pr-3 py-2 text-sm ${displayText ? 'text-gray-700' : 'text-gray-400'}`}>
          {displayText || placeholder}
        </span>
      </div>

      {/* 日历弹窗 */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-[280px]">
          {/* 月份导航 */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-sm font-semibold text-gray-800">
              {viewYear}年{viewMonth + 1}月
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* 星期头 */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="text-center text-xs font-medium text-gray-400 py-1">
                {wd}
              </div>
            ))}
          </div>

          {/* 日期网格 */}
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((d, i) => {
              const selected = isSelected(d.year, d.month, d.day)
              const today = isToday(d.year, d.month, d.day)
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(d.year, d.month, d.day)}
                  className={`
                    w-9 h-9 rounded-lg text-sm flex items-center justify-center transition-colors
                    ${selected
                      ? 'bg-purple-600 text-white font-semibold'
                      : today
                        ? 'bg-purple-50 text-purple-600 font-medium'
                        : d.isCurrentMonth
                          ? 'text-gray-700 hover:bg-gray-100'
                          : 'text-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  {d.day}
                </button>
              )
            })}
          </div>

          {/* 今天快捷按钮 */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                const now = new Date()
                handleSelect(now.getFullYear(), now.getMonth(), now.getDate())
              }}
              className="w-full text-center text-xs text-purple-600 hover:text-purple-700 font-medium py-1"
            >
              今天
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DatePicker

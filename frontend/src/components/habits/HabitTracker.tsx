import { useState, useEffect } from 'react'
import { Plus, Calendar } from 'lucide-react'
import { fetchHabits, fetchHabitStats, fetchDailyLogs, createDailyLog, updateDailyLog } from '../../api'
import { Habit, HabitStats, DailyLog } from '../../types'
import HabitCard from './HabitCard'
import HabitStatsCard from './HabitStatsCard'
import HabitCalendar from './HabitCalendar'
import HabitModal from './HabitModal'

export default function HabitTracker() {
  const today = new Date()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const todayStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日 ${weekdays[today.getDay()]} `
  
  const [habits, setHabits] = useState<Habit[]>([])
  const [stats, setStats] = useState<HabitStats | null>(null)

  const [selectedDateLogs, setSelectedDateLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string>(today.toISOString().split('T')[0])

  useEffect(() => {
    loadData()
  }, [refreshKey])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // 获取生效的习惯
      const habitsData = await fetchHabits('生效')
      setHabits(habitsData)
      
      // 获取统计数据
      const statsData = await fetchHabitStats()
      setStats(statsData)
      
      // 获取今日打卡记录
      const todayDate = today.toISOString().split('T')[0]
      const logsData = await fetchDailyLogs({
        start_date: todayDate,
        end_date: todayDate
      })
      
      // 同时设置选中日期的记录为今日
      setSelectedDateLogs(logsData)
      setSelectedDate(todayDate)
      
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async (habitId: string, completed: boolean, date?: string) => {
    try {
      const checkDate = date || today.toISOString().split('T')[0]
      
      // 检查当天是否已有打卡记录
      const existingLog = selectedDateLogs.find(log => 
        log.habit_ids.includes(habitId) && log.date === checkDate
      )
      
      if (existingLog) {
        // 更新现有记录
        await updateDailyLog(existingLog.id, { completed })
      } else {
        // 创建新记录
        await createDailyLog({
          habit_id: habitId,
          date: checkDate,
          completed
        })
      }
      
      // 刷新数据
      setRefreshKey(prev => prev + 1)
    } catch (error) {
      console.error('打卡失败:', error)
      alert('打卡失败，请重试')
    }
  }

  const getHabitsForDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const weekday = date.getDay() // 0=周日, 1=周一, ..., 6=周六
    
    return habits.filter(habit => {
      const frequency = habit.frequency
      
      if (frequency === '每日') return true
      if (frequency === '工作日' && weekday >= 1 && weekday <= 5) return true
      if (frequency === '周末' && (weekday === 0 || weekday === 6)) return true
      
      return false
    })
  }

  const isHabitChecked = (habitId: string, dateStr: string) => {
    return selectedDateLogs.some(log => 
      log.habit_ids.includes(habitId) && 
      log.date === dateStr && 
      log.completed
    )
  }

  const selectedDateHabits = getHabitsForDate(selectedDate)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  const handleDateSelect = (date: string, logs: DailyLog[]) => {
    setSelectedDate(date)
    setSelectedDateLogs(logs)
  }

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">习惯打卡</h1>
          <p className="text-sm text-gray-500 mt-1">今天是 {todayStr}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus size={20} />
          新增习惯
        </button>
      </div>

      {/* 两栏布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧栏：日历 + 本月统计 */}
        <div className="space-y-6">
          {/* 打卡日历 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="text-blue-600" size={24} />
              <h2 className="text-lg font-semibold">打卡日历</h2>
              <span className="text-sm text-gray-500">
                {selectedDate === today.toISOString().split('T')[0] 
                  ? '今天' 
                  : selectedDate}
              </span>
            </div>
            <HabitCalendar 
              onDateSelect={handleDateSelect}
              selectedDate={selectedDate}
            />
          </div>

          {/* 本月统计 */}
          {stats && (
            <HabitStatsCard stats={stats} />
          )}
        </div>

        {/* 右侧栏：今日打卡 */}
        <div className="space-y-6">
          {/* 今日打卡 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="text-blue-600" size={24} />
              <h2 className="text-lg font-semibold">
                {selectedDate === today.toISOString().split('T')[0] 
                  ? `今日打卡 (${selectedDateHabits.length}个习惯)`
                  : `打卡记录 (${selectedDateHabits.length}个习惯)`}
              </h2>
              <span className="text-sm text-gray-500">
                {selectedDate === today.toISOString().split('T')[0] 
                  ? '今天' 
                  : selectedDate}
              </span>
            </div>
            
            {selectedDateHabits.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {selectedDate === today.toISOString().split('T')[0] 
                  ? '今天没有需要打卡的习惯'
                  : '该日期没有需要打卡的习惯'}
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateHabits.map(habit => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    checked={isHabitChecked(habit.id, selectedDate)}
                    onCheckIn={(completed) => handleCheckIn(habit.id, completed, selectedDate)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 新增习惯弹窗 */}
      {showModal && (
        <HabitModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            setRefreshKey(prev => prev + 1)
          }}
        />
      )}
    </div>
  )
}

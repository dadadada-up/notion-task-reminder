import { useState, useEffect, useMemo } from 'react'
import { Plus, Calendar, ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { fetchHabits, fetchHabitStats, fetchDailyLogs, createDailyLog, updateDailyLog, updateHabit, deleteHabit } from '../../api'
import { Habit, HabitStats, DailyLog } from '../../types'
import HabitCard from './HabitCard'
import HabitStatsCard from './HabitStatsCard'
import HabitCalendar from './HabitCalendar'
import HabitModal from './HabitModal'
import { useConfirm } from '../ui/ConfirmDialog'
import { useToast } from '../ui/Toast'

export default function HabitTracker() {
  const confirmDialog = useConfirm()
  const toast = useToast()
  const today = new Date()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const todayStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日 ${weekdays[today.getDay()]}`

  const [habits, setHabits] = useState<Habit[]>([])
  const [stats, setStats] = useState<HabitStats | null>(null)
  const [selectedDateLogs, setSelectedDateLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string>(today.toISOString().split('T')[0])

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)

  // Inactive section
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    loadLogsForDate(selectedDate)
  }, [selectedDate])

  const loadData = async () => {
    try {
      setLoading(true)
      const [habitsData, statsData] = await Promise.all([
        fetchHabits(), // 获取所有状态
        fetchHabitStats(),
      ])
      setHabits(habitsData)
      setStats(statsData)
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadLogsForDate = async (date: string) => {
    try {
      const logsData = await fetchDailyLogs({ start_date: date, end_date: date })
      setSelectedDateLogs(logsData)
    } catch (error) {
      console.error('加载打卡记录失败:', error)
    }
  }

  // 分类习惯
  const { activeHabits, pausedHabits, inactiveHabits } = useMemo(() => {
    return {
      activeHabits: habits.filter(h => h.status === '生效'),
      pausedHabits: habits.filter(h => h.status === '暂停'),
      inactiveHabits: habits.filter(h => h.status === '失效'),
    }
  }, [habits])

  const inactiveCount = pausedHabits.length + inactiveHabits.length

  const handleCheckIn = async (habitId: string, completed: boolean, date?: string) => {
    const checkDate = date || today.toISOString().split('T')[0]
    const existingLog = selectedDateLogs.find(log =>
      log.habit_ids.includes(habitId) && log.date === checkDate
    )

    // 乐观更新本地状态
    if (existingLog) {
      setSelectedDateLogs(prev => prev.map(log =>
        log.id === existingLog.id ? { ...log, completed } : log
      ))
    } else {
      const tempLog: DailyLog = {
        id: `temp_${habitId}_${checkDate}`,
        habit_ids: [habitId],
        date: checkDate,
        completed,
        title: '',
        notes: '',
        weekday: '',
        month: '',
        created_time: new Date().toISOString(),
        last_edited_time: new Date().toISOString(),
        url: ''
      }
      setSelectedDateLogs(prev => [...prev, tempLog])
    }

    try {
      if (existingLog) {
        await updateDailyLog(existingLog.id, { completed })
      } else {
        await createDailyLog({ habit_id: habitId, date: checkDate, completed })
      }
      // 后台静默刷新真实数据
      const [logsData, statsData] = await Promise.all([
        fetchDailyLogs({ start_date: checkDate, end_date: checkDate }),
        fetchHabitStats(),
      ])
      setSelectedDateLogs(logsData)
      setStats(statsData)
    } catch (error) {
      console.error('打卡失败:', error)
      toast.error('打卡失败', '请重试')
      // 回滚
      loadLogsForDate(selectedDate)
    }
  }

  const getHabitsForDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const weekday = date.getDay()
    return activeHabits.filter(habit => {
      const f = habit.frequency
      if (f === '每日') return true
      if (f === '工作日' && weekday >= 1 && weekday <= 5) return true
      if (f === '周末' && (weekday === 0 || weekday === 6)) return true
      return false
    })
  }

  const isHabitChecked = (habitId: string, dateStr: string) => {
    return selectedDateLogs.some(log =>
      log.habit_ids.includes(habitId) && log.date === dateStr && log.completed
    )
  }

  // 编辑习惯
  const handleEditHabit = (habit: Habit) => {
    setEditingHabit(habit)
    setShowModal(true)
  }

  // 暂停/恢复
  const handlePauseResume = async (habit: Habit) => {
    const newStatus = habit.status === '暂停' ? '生效' : '暂停'
    const action = newStatus === '暂停' ? '暂停' : '恢复'
    try {
      await updateHabit(habit.id, { status: newStatus })
      await loadData()
    } catch (error) {
      console.error(`${action}失败:`, error)
      toast.error(`${action}失败`, '请重试')
    }
  }

  // 删除（统一确认弹窗）
  const handleDeleteClick = async (habit: Habit) => {
    const ok = await confirmDialog({
      title: '删除习惯',
      type: 'danger',
      message: (
        <>
          确定删除习惯「<b>{habit.name}</b>」吗？
          关联的所有打卡记录也将被删除。
        </>
      ),
      confirmText: '删除',
    })
    if (!ok) return
    try {
      await deleteHabit(habit.id)
      await loadData()
    } catch (error) {
      console.error('删除失败:', error)
      toast.error('删除失败', '请重试')
    }
  }

  // Modal 关闭/成功
  const handleModalClose = () => {
    setShowModal(false)
    setEditingHabit(null)
  }

  const handleModalSuccess = () => {
    setShowModal(false)
    setEditingHabit(null)
    loadData()
  }

  const selectedDateHabits = getHabitsForDate(selectedDate)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">习惯打卡</h1>
          <p className="text-sm text-gray-500 mt-1">{todayStr}</p>
        </div>
        <button
          onClick={() => { setEditingHabit(null); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus size={20} />
          新增习惯
        </button>
      </div>

      {/* 两栏布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧栏：日历 + 统计 */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="text-blue-600" size={24} />
              <h2 className="text-lg font-semibold">打卡日历</h2>
              <span className="text-sm text-gray-500">
                {selectedDate === today.toISOString().split('T')[0] ? '今天' : selectedDate}
              </span>
            </div>
            <HabitCalendar
              onDateSelect={(date) => setSelectedDate(date)}
              selectedDate={selectedDate}
            />
          </div>
          {stats && <HabitStatsCard stats={stats} />}
        </div>

        {/* 右侧栏：打卡 + 管理 */}
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
                    onEdit={handleEditHabit}
                    onPause={handlePauseResume}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 已暂停 / 已失效 折叠区 */}
          {inactiveCount > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <button
                onClick={() => setShowInactive(!showInactive)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {showInactive ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
                  <span className="text-sm font-medium text-gray-600">
                    已暂停 / 已失效
                  </span>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">
                    {inactiveCount}
                  </span>
                </div>
              </button>

              {showInactive && (
                <div className="px-6 pb-4 space-y-2">
                  {pausedHabits.map(h => (
                    <div key={h.id} className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-amber-200 bg-amber-50/50">
                      <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                      <span className="flex-1 text-sm text-gray-700 truncate">{h.name}</span>
                      <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">已暂停</span>
                      <button
                        onClick={() => handlePauseResume(h)}
                        className="text-xs px-3 py-1 border border-gray-200 rounded-md hover:bg-white hover:border-green-300 hover:text-green-600 transition-colors"
                      >
                        恢复
                      </button>
                      <button
                        onClick={() => handleEditHabit(h)}
                        className="text-xs px-3 py-1 border border-gray-200 rounded-md hover:bg-white hover:border-purple-300 hover:text-purple-600 transition-colors"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteClick(h)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {inactiveHabits.map(h => (
                    <div key={h.id} className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 opacity-70">
                      <div className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
                      <span className="flex-1 text-sm text-gray-500 truncate">{h.name}</span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded">已失效</span>
                      <button
                        onClick={() => handlePauseResume(h)}
                        className="text-xs px-3 py-1 border border-gray-200 rounded-md hover:bg-white hover:border-green-300 hover:text-green-600 transition-colors"
                      >
                        恢复
                      </button>
                      <button
                        onClick={() => handleDeleteClick(h)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 新增/编辑习惯弹窗 */}
      {showModal && (
        <HabitModal
          habit={editingHabit}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  )
}

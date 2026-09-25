import { useState, useEffect, useMemo, useCallback } from 'react'
import { Task } from '../types'
import { fetchTasks, fetchCombinedData, autoTransitionTasks, clearCache, deleteTask, createTask, updateTask } from '../api'
import { useToast } from '../components/ui/Toast'

/**
 * 任务数据管理：加载、CRUD、筛选、派生数据
 * 从 App.tsx 抽出的核心数据层
 */
export function useTasks(isAuthenticated: boolean) {
  const toast = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  // --- Filters ---
  const [activeStatus, setActiveStatus] = useState<string>('进行中')
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null)
  const [timeFilter, setTimeFilter] = useState<'all' | 'week'>('all')

  // --- Data Loading ---
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { tasks: tasksData } = await fetchCombinedData()
      setTasks(tasksData)

      // 自动流转：每小时最多执行一次
      const LAST_TRANSITION_KEY = 'last_auto_transition'
      const lastTransition = Number(localStorage.getItem(LAST_TRANSITION_KEY) || 0)
      const shouldTransition = Date.now() - lastTransition > 3600_000

      if (shouldTransition) {
        try {
          const result = await autoTransitionTasks()
          localStorage.setItem(LAST_TRANSITION_KEY, Date.now().toString())
          if (result.success && result.data.transitioned > 0) {
            const { tasks: updatedTasks } = await fetchCombinedData()
            setTasks(updatedTasks)
          }
        } catch (transitionError) {
          console.warn('自动流转检查失败（静默忽略）:', transitionError)
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      try {
        const tasksData = await fetchTasks()
        setTasks(tasksData)
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated, loadData])

  // --- CRUD Handlers ---
  const handleSaveTask = useCallback(async (taskData: Partial<Task>, selectedTask: Task | null) => {
    if (selectedTask) {
      const updated = await updateTask(selectedTask.id, taskData)
      setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t))
    } else {
      const created = await createTask(taskData)
      setTasks(prev => [created, ...prev])
    }
    clearCache()
  }, [])

  const handleDeleteTask = useCallback(async (task: Task) => {
    try {
      await deleteTask(task.id)
      setTasks(prev => prev.filter(t => t.id !== task.id))
      return true
    } catch (error) {
      console.error('Failed to delete task:', error)
      toast.error('删除失败', '请重试')
      return false
    }
  }, [toast])

  // 局部字段更新回调（供子组件乐观更新使用）
  const handleTaskFieldUpdate = useCallback((taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t))
  }, [])

  // --- Derived Data ---

  // 根据状态、优先级、时间筛选任务，并过滤掉子任务
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (task.status !== activeStatus) return false
      if (task.parent_ids && task.parent_ids.length > 0) return false
      if (priorityFilter && task.priority !== priorityFilter) return false
      if (timeFilter === 'week') {
        const now = new Date()
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay() + 1)
        weekStart.setHours(0, 0, 0, 0)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        weekEnd.setHours(23, 59, 59, 999)
        const deadline = task.deadline ? new Date(task.deadline) : null
        const lastEdited = new Date(task.last_edited_time)
        const isInWeek = (deadline && deadline >= weekStart && deadline <= weekEnd) ||
          (lastEdited >= weekStart && lastEdited <= weekEnd)
        if (!isInWeek) return false
      }
      return true
    })
  }, [tasks, activeStatus, priorityFilter, timeFilter])

  // 看板数据：跨所有状态的主任务
  const boardTasks = useMemo(() => {
    return tasks.filter(task => {
      if (task.parent_ids && task.parent_ids.length > 0) return false
      if (priorityFilter && task.priority !== priorityFilter) return false
      if (timeFilter === 'week') {
        const now = new Date()
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay() + 1)
        weekStart.setHours(0, 0, 0, 0)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        weekEnd.setHours(23, 59, 59, 999)
        const deadline = task.deadline ? new Date(task.deadline) : null
        const lastEdited = new Date(task.last_edited_time)
        const isInWeek = (deadline && deadline >= weekStart && deadline <= weekEnd) ||
          (lastEdited >= weekStart && lastEdited <= weekEnd)
        if (!isInWeek) return false
      }
      return true
    })
  }, [tasks, priorityFilter, timeFilter])

  // 统计各状态任务数量（只统计主任务）
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      '待开始': 0, '进行中': 0, '已逾期': 0, '已完成': 0, '已放弃': 0,
    }
    tasks.forEach(task => {
      if (task.parent_ids && task.parent_ids.length > 0) return
      if (counts[task.status] !== undefined) counts[task.status]++
    })
    return counts
  }, [tasks])

  return {
    tasks, loading,
    activeStatus, setActiveStatus,
    priorityFilter, setPriorityFilter,
    timeFilter, setTimeFilter,
    filteredTasks, boardTasks, statusCounts,
    handleSaveTask, handleDeleteTask, handleTaskFieldUpdate,
    loadData,
    resetTasks: () => setTasks([]),
  }
}

import axios from 'axios'
import { Task, Stats, WeeklySummary } from './types'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// 添加缓存变量
let tasksCache: Task[] | null = null
let cacheTimestamp: number | null = null
const CACHE_DURATION = 30000 // 30秒缓存

// 组合数据缓存
let combinedDataCache: { tasks: Task[], stats: Stats } | null = null
let combinedCacheTimestamp: number | null = null
const COMBINED_CACHE_DURATION = 30000 // 30秒缓存

export const fetchTasks = async (filters?: {
  status?: string
  assignee?: string
  priority?: string
  type?: string
}): Promise<Task[]> => {
  // 如果没有过滤条件且缓存有效，则使用缓存
  if (!filters && tasksCache && cacheTimestamp && 
      (Date.now() - cacheTimestamp) < CACHE_DURATION) {
    console.log('📊 使用缓存的任务数据')
    return tasksCache
  }

  const response = await axios.get(`${API_BASE_URL}/tasks`, { params: filters })
  const data = response.data.data
  
  // 只在没有过滤条件时缓存数据
  if (!filters) {
    tasksCache = data
    cacheTimestamp = Date.now()
  }
  
  return data
}

export const fetchCombinedData = async (): Promise<{ tasks: Task[], stats: Stats }> => {
  // 检查组合数据缓存
  if (combinedDataCache && combinedCacheTimestamp && 
      (Date.now() - combinedCacheTimestamp) < COMBINED_CACHE_DURATION) {
    console.log('📊 使用缓存的组合数据')
    return combinedDataCache
  }

  const response = await axios.get(`${API_BASE_URL}/data`)
  const { tasks, stats } = response.data.data
  
  // 缓存组合数据
  combinedDataCache = { tasks, stats }
  combinedCacheTimestamp = Date.now()
  
  return { tasks, stats }
}

// 清除缓存
export const clearCache = () => {
  tasksCache = null
  cacheTimestamp = null
  combinedDataCache = null
  combinedCacheTimestamp = null
}

export const fetchTask = async (id: string): Promise<Task> => {
  const response = await axios.get(`${API_BASE_URL}/tasks/${id}`)
  return response.data.data
}

export const createTask = async (
  taskData: Partial<Task>
): Promise<Task> => {
  const response = await axios.post(`${API_BASE_URL}/tasks`, taskData)
  return response.data.data
}

export const updateTask = async (
  id: string,
  updates: Partial<Task>
): Promise<Task> => {
  const response = await axios.put(`${API_BASE_URL}/tasks/${id}`, updates)
  return response.data.data
}

export const fetchStats = async (): Promise<Stats> => {
  const response = await axios.get(`${API_BASE_URL}/stats`)
  return response.data.data
}

export const autoTransitionTasks = async (): Promise<{
  success: boolean
  data: {
    total_checked: number
    transitioned: number
    tasks: Array<{
      id: string
      name: string
      start_date: string
      priority: string
    }>
    timestamp: string
  }
  message: string
}> => {
  const response = await axios.post(`${API_BASE_URL}/tasks/auto-transition`)
  return response.data
}

export const sendNotification = async (
  type: 'daily_todo' | 'daily_done' | 'both',
  channels: string[],
  customTitle?: string,
  customMessage?: string
): Promise<any> => {
  const response = await axios.post(`${API_BASE_URL}/notify`, { 
    type, 
    channels,
    customTitle,
    customMessage
  })
  return response.data
}

export const getSchedules = async (): Promise<any[]> => {
  const response = await axios.get(`${API_BASE_URL}/schedule`)
  return response.data.data
}

export const saveSchedules = async (schedules: any[]): Promise<any> => {
  const response = await axios.post(`${API_BASE_URL}/schedule`, { schedules })
  return response.data
}

export const getConfig = async (): Promise<any> => {
  const response = await axios.get(`${API_BASE_URL}/config`)
  return response.data.data
}

export const updateConfig = async (config: any): Promise<any> => {
  const response = await axios.put(`${API_BASE_URL}/config`, config)
  return response.data
}

// 每周总结 API
export const fetchWeeklySummary = async (week: string = 'current'): Promise<WeeklySummary> => {
  const response = await axios.get(`${API_BASE_URL}/weekly-summary`, {
    params: { week }
  })
  return response.data.data
}

export const fetchAvailableWeeks = async (limit: number = 52): Promise<any[]> => {
  const response = await axios.get(`${API_BASE_URL}/weekly-summary/weeks`, {
    params: { limit }
  })
  return response.data.data
}

export const fetchWeeklySummaryMarkdown = async (week: string = 'current'): Promise<{ markdown: string, summary: WeeklySummary }> => {
  const response = await axios.get(`${API_BASE_URL}/weekly-summary/markdown`, {
    params: { week }
  })
  return response.data.data
}

export const pushWeeklySummary = async (week: string, channels: string[]): Promise<any> => {
  const response = await axios.post(`${API_BASE_URL}/weekly-summary/push`, {
    week,
    channels
  })
  return response.data
}

// 新格式周复盘 API
export const fetchNewFormatSummary = async (week: string = 'current'): Promise<any> => {
  const response = await axios.get(`${API_BASE_URL}/weekly-summary/new-format`, {
    params: { week }
  })
  return response.data.data
}

export const fetchNewFormatMarkdown = async (week: string = 'current'): Promise<{ markdown: string, summary: any }> => {
  const response = await axios.get(`${API_BASE_URL}/weekly-summary/new-format/markdown`, {
    params: { week }
  })
  return response.data.data
}

export const saveNewFormatSummary = async (week: string, data: any): Promise<any> => {
  const response = await axios.post(`${API_BASE_URL}/weekly-summary/new-format/save`, {
    week,
    data
  })
  return response.data
}

export const aiOptimizeSummary = async (section: string, data: any, context?: any): Promise<any> => {
  const response = await axios.post(`${API_BASE_URL}/weekly-summary/ai-optimize`, {
    section,
    data,
    context: context || {}
  })
  return response.data.data
}

// 上传图片到 Notion
export const uploadImage = async (file: File): Promise<{ file_upload_id: string; filename: string; size: number }> => {
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await axios.post(`${API_BASE_URL}/upload-image`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return response.data.data
}

// ==================== 习惯打卡 API ====================

// 获取习惯列表
export const fetchHabits = async (status?: '生效' | '失效'): Promise<any[]> => {
  const response = await axios.get(`${API_BASE_URL}/habits`, {
    params: { status }
  })
  return response.data.data
}

// 获取单个习惯
export const fetchHabit = async (id: string): Promise<any> => {
  const response = await axios.get(`${API_BASE_URL}/habits/${id}`)
  return response.data.data
}

// 创建习惯
export const createHabit = async (habitData: Partial<any>): Promise<any> => {
  const response = await axios.post(`${API_BASE_URL}/habits`, habitData)
  return response.data.data
}

// 更新习惯
export const updateHabit = async (id: string, updates: Partial<any>): Promise<any> => {
  const response = await axios.put(`${API_BASE_URL}/habits/${id}`, updates)
  return response.data.data
}

// 获取习惯统计
export const fetchHabitStats = async (): Promise<any> => {
  const response = await axios.get(`${API_BASE_URL}/habits/stats`)
  return response.data.data
}

// 获取打卡记录
export const fetchDailyLogs = async (params?: {
  habit_id?: string
  start_date?: string
  end_date?: string
  completed?: boolean
}): Promise<any[]> => {
  const response = await axios.get(`${API_BASE_URL}/daily-logs`, { params })
  return response.data.data
}

// 创建打卡记录
export const createDailyLog = async (logData: {
  habit_id: string
  date?: string
  completed: boolean
  notes?: string
}): Promise<any> => {
  const response = await axios.post(`${API_BASE_URL}/daily-logs`, logData)
  return response.data.data
}

// 更新打卡记录
export const updateDailyLog = async (id: string, updates: {
  completed?: boolean
  notes?: string
  date?: string
}): Promise<any> => {
  const response = await axios.put(`${API_BASE_URL}/daily-logs/${id}`, updates)
  return response.data.data
}

// 获取日历数据
export const fetchCalendarData = async (year?: number, month?: number): Promise<any[]> => {
  const response = await axios.get(`${API_BASE_URL}/daily-logs/calendar`, {
    params: { year, month }
  })
  return response.data.data
}

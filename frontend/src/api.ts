import axios from 'axios'
import type {
  Task, Stats, WeeklySummary, Habit, DailyLog, HabitStats, CalendarData,
  ApiResponse, AuthResponse, User, DbTable, DbQueryResult,
  NotificationCenterStatus, ChannelStatus, ScheduleItem, AppConfig,
  NewFormatSummary, AutoTransitionResult
} from './types'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// --- Auth Token Management ---
export const getAuthToken = (): string | null => localStorage.getItem('auth_token')
export const setAuthToken = (token: string) => localStorage.setItem('auth_token', token)
export const clearAuthToken = () => localStorage.removeItem('auth_token')
export const getUserInfo = (): User | null => {
  const raw = localStorage.getItem('auth_user')
  return raw ? JSON.parse(raw) : null
}
export const setUserInfo = (user: User) => localStorage.setItem('auth_user', JSON.stringify(user))
export const clearUserInfo = () => localStorage.removeItem('auth_user')

// Axios interceptor: inject token + handle 401
axios.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthToken()
      clearUserInfo()
      window.dispatchEvent(new CustomEvent('auth:logout'))
    }
    return Promise.reject(error)
  }
)

// --- Cache ---
let tasksCache: Task[] | null = null
let cacheTimestamp: number | null = null
const CACHE_DURATION = 30000

let combinedDataCache: { tasks: Task[], stats: Stats } | null = null
let combinedCacheTimestamp: number | null = null
const COMBINED_CACHE_DURATION = 30000

export const clearCache = () => {
  tasksCache = null
  cacheTimestamp = null
  combinedDataCache = null
  combinedCacheTimestamp = null
}

// ==================== Tasks ====================

export const fetchTasks = async (filters?: {
  status?: string
  assignee?: string
  priority?: string
  type?: string
}): Promise<Task[]> => {
  if (!filters && tasksCache && cacheTimestamp &&
      (Date.now() - cacheTimestamp) < CACHE_DURATION) {
    return tasksCache
  }

  const response = await axios.get<ApiResponse<Task[]>>(`${API_BASE_URL}/tasks`, { params: filters })
  const data = response.data.data

  if (!filters) {
    tasksCache = data
    cacheTimestamp = Date.now()
  }

  return data
}

export const fetchCombinedData = async (): Promise<{ tasks: Task[], stats: Stats }> => {
  if (combinedDataCache && combinedCacheTimestamp &&
      (Date.now() - combinedCacheTimestamp) < COMBINED_CACHE_DURATION) {
    return combinedDataCache
  }

  const response = await axios.get<ApiResponse<{ tasks: Task[], stats: Stats }>>(`${API_BASE_URL}/data`)
  const { tasks, stats } = response.data.data

  combinedDataCache = { tasks, stats }
  combinedCacheTimestamp = Date.now()

  return { tasks, stats }
}

export const fetchTask = async (id: string): Promise<Task> => {
  const response = await axios.get<ApiResponse<Task>>(`${API_BASE_URL}/tasks/${id}`)
  return response.data.data
}

export const createTask = async (taskData: Partial<Task>): Promise<Task> => {
  const response = await axios.post<ApiResponse<Task>>(`${API_BASE_URL}/tasks`, taskData)
  return response.data.data
}

export const updateTask = async (id: string, updates: Partial<Task>): Promise<Task> => {
  const response = await axios.put<ApiResponse<Task>>(`${API_BASE_URL}/tasks/${id}`, updates)
  return response.data.data
}

export const deleteTask = async (id: string): Promise<{ id: string; name: string; child_released: number }> => {
  const response = await axios.delete<ApiResponse<{ id: string; name: string; child_released: number }>>(`${API_BASE_URL}/tasks/${id}`)
  clearCache()
  return response.data.data
}

export const autoTransitionTasks = async (): Promise<ApiResponse<AutoTransitionResult>> => {
  const response = await axios.post<ApiResponse<AutoTransitionResult>>(`${API_BASE_URL}/tasks/auto-transition`)
  return response.data
}

// ==================== Stats ====================

export const fetchStats = async (): Promise<Stats> => {
  const response = await axios.get<ApiResponse<Stats>>(`${API_BASE_URL}/stats`)
  return response.data.data
}

// ==================== Notification Center ====================

export const fetchNotificationCenterStatus = async (): Promise<NotificationCenterStatus> => {
  const response = await axios.get<ApiResponse<NotificationCenterStatus>>(`${API_BASE_URL}/notification-center/status`)
  return response.data.data
}

export const saveChannelConfig = async (config: Record<string, unknown>): Promise<ApiResponse<unknown>> => {
  const response = await axios.put<ApiResponse<unknown>>(`${API_BASE_URL}/notification-center/config`, config)
  return response.data
}

export const testChannel = async (channel: string, message?: string): Promise<ApiResponse<unknown>> => {
  const response = await axios.post<ApiResponse<unknown>>(`${API_BASE_URL}/notification-center/test`, {
    channel,
    message: message || '这是一条测试消息'
  })
  return response.data
}

export const sendNotification = async (
  type: 'daily_todo' | 'daily_done' | 'both',
  channels: string[],
  customTitle?: string,
  customMessage?: string
): Promise<ApiResponse<unknown>> => {
  const response = await axios.post<ApiResponse<unknown>>(`${API_BASE_URL}/notification-center/send`, {
    type, channels, customTitle, customMessage
  })
  return response.data
}

export const getSchedules = async (): Promise<ScheduleItem[]> => {
  const response = await axios.get<ApiResponse<ScheduleItem[]>>(`${API_BASE_URL}/notification-center/schedules`)
  return response.data.data
}

export const saveSchedules = async (schedules: ScheduleItem[]): Promise<ApiResponse<unknown>> => {
  const response = await axios.post<ApiResponse<unknown>>(`${API_BASE_URL}/notification-center/schedules`, { schedules })
  return response.data
}

export const getConfig = async (): Promise<AppConfig> => {
  const response = await axios.get<ApiResponse<AppConfig>>(`${API_BASE_URL}/config`)
  return response.data.data
}

export const updateConfig = async (config: Partial<AppConfig>): Promise<ApiResponse<unknown>> => {
  const response = await axios.put<ApiResponse<unknown>>(`${API_BASE_URL}/config`, config)
  return response.data
}

// ==================== Weekly Summary ====================

export const fetchWeeklySummary = async (week: string = 'current'): Promise<WeeklySummary> => {
  const response = await axios.get<ApiResponse<WeeklySummary>>(`${API_BASE_URL}/weekly-summary`, { params: { week } })
  return response.data.data
}

export const fetchAvailableWeeks = async (limit: number = 52): Promise<string[]> => {
  const response = await axios.get<ApiResponse<string[]>>(`${API_BASE_URL}/weekly-summary/weeks`, { params: { limit } })
  return response.data.data
}

export const fetchWeeklySummaryMarkdown = async (week: string = 'current'): Promise<{ markdown: string, summary: WeeklySummary }> => {
  const response = await axios.get<ApiResponse<{ markdown: string, summary: WeeklySummary }>>(`${API_BASE_URL}/weekly-summary/markdown`, { params: { week } })
  return response.data.data
}

export const pushWeeklySummary = async (week: string, channels: string[]): Promise<ApiResponse<unknown>> => {
  const response = await axios.post<ApiResponse<unknown>>(`${API_BASE_URL}/weekly-summary/push`, { week, channels })
  return response.data
}

// 新格式周复盘
export const fetchNewFormatSummary = async (week: string = 'current'): Promise<NewFormatSummary> => {
  const response = await axios.get<ApiResponse<NewFormatSummary>>(`${API_BASE_URL}/weekly-summary/new-format`, { params: { week } })
  return response.data.data
}

export const fetchNewFormatMarkdown = async (week: string = 'current'): Promise<{ markdown: string, summary: NewFormatSummary }> => {
  const response = await axios.get<ApiResponse<{ markdown: string, summary: NewFormatSummary }>>(`${API_BASE_URL}/weekly-summary/new-format/markdown`, { params: { week } })
  return response.data.data
}

export const saveNewFormatSummary = async (week: string, data: NewFormatSummary): Promise<ApiResponse<unknown>> => {
  const response = await axios.post<ApiResponse<unknown>>(`${API_BASE_URL}/weekly-summary/new-format/save`, { week, data })
  return response.data
}

export const aiOptimizeSummary = async (section: string, data: Record<string, unknown>, context?: Record<string, unknown>): Promise<ApiResponse<unknown>> => {
  const response = await axios.post<ApiResponse<unknown>>(`${API_BASE_URL}/weekly-summary/ai-optimize`, {
    section, data, context: context || {}
  })
  return response.data
}

// ==================== Upload ====================

export const uploadImage = async (file: File): Promise<{ file_upload_id: string; filename: string; size: number }> => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await axios.post<ApiResponse<{ file_upload_id: string; filename: string; size: number }>>(
    `${API_BASE_URL}/upload-image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  return response.data.data
}

// ==================== Habits ====================

export const fetchHabits = async (status?: Habit['status']): Promise<Habit[]> => {
  const response = await axios.get<ApiResponse<Habit[]>>(`${API_BASE_URL}/habits`, { params: { status } })
  return response.data.data
}

export const fetchHabit = async (id: string): Promise<Habit> => {
  const response = await axios.get<ApiResponse<Habit>>(`${API_BASE_URL}/habits/${id}`)
  return response.data.data
}

export const createHabit = async (habitData: Partial<Habit>): Promise<Habit> => {
  const response = await axios.post<ApiResponse<Habit>>(`${API_BASE_URL}/habits`, habitData)
  return response.data.data
}

export const updateHabit = async (id: string, updates: Partial<Habit>): Promise<Habit> => {
  const response = await axios.put<ApiResponse<Habit>>(`${API_BASE_URL}/habits/${id}`, updates)
  return response.data.data
}

export const deleteHabit = async (id: string): Promise<{ id: string; name: string; logs_deleted: number }> => {
  const response = await axios.delete<ApiResponse<{ id: string; name: string; logs_deleted: number }>>(`${API_BASE_URL}/habits/${id}`)
  return response.data.data
}

export const fetchHabitStats = async (): Promise<HabitStats> => {
  const response = await axios.get<ApiResponse<HabitStats>>(`${API_BASE_URL}/habits/stats`)
  return response.data.data
}

// ==================== Daily Logs ====================

export const fetchDailyLogs = async (params?: {
  habit_id?: string
  start_date?: string
  end_date?: string
  completed?: boolean
}): Promise<DailyLog[]> => {
  const response = await axios.get<ApiResponse<DailyLog[]>>(`${API_BASE_URL}/daily-logs`, { params })
  return response.data.data
}

export const createDailyLog = async (logData: {
  habit_id: string
  date?: string
  completed: boolean
  notes?: string
}): Promise<DailyLog> => {
  const response = await axios.post<ApiResponse<DailyLog>>(`${API_BASE_URL}/daily-logs`, logData)
  return response.data.data
}

export const updateDailyLog = async (id: string, updates: {
  completed?: boolean
  notes?: string
  date?: string
}): Promise<DailyLog> => {
  const response = await axios.put<ApiResponse<DailyLog>>(`${API_BASE_URL}/daily-logs/${id}`, updates)
  return response.data.data
}

export const fetchCalendarData = async (year?: number, month?: number): Promise<CalendarData[]> => {
  const response = await axios.get<ApiResponse<CalendarData[]>>(`${API_BASE_URL}/daily-logs/calendar`, {
    params: { year, month }
  })
  return response.data.data
}

// ==================== DB Management ====================

export const fetchDbTables = async (): Promise<DbTable[]> => {
  const response = await axios.get<ApiResponse<DbTable[]>>(`${API_BASE_URL}/db/tables`)
  return response.data.data
}

export const executeDbQuery = async (sql: string): Promise<DbQueryResult> => {
  const response = await axios.post<ApiResponse<DbQueryResult>>(`${API_BASE_URL}/db/query`, { sql })
  return response.data.data
}

// ==================== Auth ====================

export const login = async (username: string, password: string): Promise<AuthResponse> => {
  const response = await axios.post<ApiResponse<AuthResponse>>(`${API_BASE_URL}/auth/login`, { username, password })
  return response.data.data
}

export const register = async (username: string, password: string, displayName?: string): Promise<AuthResponse> => {
  const response = await axios.post<ApiResponse<AuthResponse>>(`${API_BASE_URL}/auth/register`, { username, password, displayName })
  return response.data.data
}

export const fetchUsers = async (): Promise<User[]> => {
  const response = await axios.get<ApiResponse<User[]>>(`${API_BASE_URL}/users`)
  return response.data.data
}

// ==================== Share ====================

export const createShareLink = async (resourceType: string, resourceId?: string, title?: string): Promise<{ shareUrl: string; token: string }> => {
  const response = await axios.post<ApiResponse<{ shareUrl: string; token: string }>>(`${API_BASE_URL}/share`, {
    resourceType, resourceId, title
  })
  return response.data.data
}

// Re-export types for convenience
export type { DbTable, DbQueryResult, ChannelStatus, NotificationCenterStatus, ScheduleItem }

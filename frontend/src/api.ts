import axios from 'axios'
import { Task, Stats, WeeklySummary } from './types'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const fetchTasks = async (filters?: {
  status?: string
  assignee?: string
  priority?: string
  type?: string
}): Promise<Task[]> => {
  const response = await axios.get(`${API_BASE_URL}/tasks`, { params: filters })
  return response.data.data
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

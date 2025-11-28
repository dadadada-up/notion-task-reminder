import axios from 'axios'
import { Task, Stats } from './types'

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
  type: 'daily_todo' | 'daily_done',
  channels: string[]
): Promise<any> => {
  const response = await axios.post(`${API_BASE_URL}/notify`, { type, channels })
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

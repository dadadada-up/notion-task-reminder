export interface Task {
  id: string
  name: string
  status: '收集箱' | '暂停' | '已放弃' | '进行中' | '已完成'
  assignee: string
  priority: string
  task_type: string
  parent_ids: string[]
  child_ids: string[]
  blocked_by_ids: string[]
  created_time: string
  last_edited_time: string
  url: string
  start_date?: string
  deadline?: string
  completed_time?: string
  email?: string
  unique_id?: string
  notes?: string
}

export interface Stats {
  total: number
  by_status: Record<string, number>
  by_priority: Record<string, number>
  by_type: Record<string, number>
  by_assignee: Record<string, number>
  today_completed: number
  important_tasks: number
  urgent_tasks: number
}

export interface TaskImage {
  name: string
  url: string
  type: 'file' | 'external' | 'file_upload'
  expiry_time?: string
  file_upload_id?: string  // 用于上传的文件ID
}

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
  images?: TaskImage[]
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

// 每周总结相关类型
export interface WeeklySummary {
  week_start: string
  week_end: string
  week_number: number
  year: number
  theme: WeeklyTheme
  completed: CompletedSummary
  highlights: Highlight[]
  reflections: Reflections
}

export interface WeeklyTheme {
  title: string
  description: string
}

export interface CompletedSummary {
  total: number
  by_type: Record<string, TypeSummary>
  by_priority: Record<string, number>
  tasks: Task[]
}

export interface TypeSummary {
  count: number
  percentage: number
  key_items: string[]
  summary: string
  tasks: Task[]
}

export interface Highlight {
  title: string
  content: string
}

export interface Reflections {
  suggestions: string[]
  concerns: string[]
}

// =============================================
// Shared types for Personal Workbench
// =============================================

export type Bindings = {
  DB: D1Database
  BUCKET: R2Bucket
  JWT_SECRET: string
  APP_NAME: string
  ALLOWED_ORIGIN: string
  // Optional secrets (set via wrangler secret put)
  DEEPSEEK_API_KEY?: string
  PUSHPLUS_TOKEN?: string
  DINGTALK_WEBHOOK?: string
  EMAIL_SMTP_SERVER?: string
  EMAIL_SMTP_PORT?: string
  EMAIL_SENDER?: string
  EMAIL_PASSWORD?: string
  EMAIL_RECEIVER?: string
}

// User
export interface User {
  id: string
  username: string
  password_hash: string
  display_name: string | null
  avatar_url: string | null
  role: 'owner' | 'editor' | 'viewer'
  created_at: string
  updated_at: string
}

// JWT Payload
export interface JWTPayload {
  userId: string
  username: string
  role: string
  exp: number
}

// Task
export interface Task {
  id: string
  user_id: string
  name: string
  status: '待开始' | '进行中' | '已完成' | '已放弃' | '已逾期'
  assignee: string
  priority: 'P0 重要紧急' | 'P1 重要不紧急' | 'P2 紧急不重要' | 'P3 不重要不紧急'
  task_type: string
  parent_id: string | null
  start_date: string | null
  deadline: string | null
  completed_time: string | null
  email: string | null
  unique_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Computed fields (not in DB)
  child_ids?: string[]
  blocked_by_ids?: string[]
  images?: TaskImage[]
}

export interface TaskImage {
  id: string
  name: string
  url: string
  r2_key: string | null
}

// Habit
export interface Habit {
  id: string
  user_id: string
  name: string
  frequency: '每日' | '每周' | '每月' | '工作日' | '周末' | '不定期'
  status: '生效' | '失效'
  weekly_target: number | null
  monthly_target: number | null
  start_date: string | null
  end_date: string | null
  phase: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// Daily Log
export interface DailyLog {
  id: string
  habit_id: string
  user_id: string
  title: string | null
  log_date: string
  completed: number // 0 or 1
  notes: string | null
  created_at: string
  updated_at: string
}

// Share Link
export interface ShareLink {
  id: string
  user_id: string
  token: string
  resource_type: 'task' | 'weekly_summary' | 'habit_dashboard' | 'board'
  resource_id: string | null
  title: string | null
  password_hash: string | null
  expires_at: string | null
  view_count: number
  is_active: number
  created_at: string
}

// API Response format (compatible with existing frontend)
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  count?: number
  error?: string
  message?: string
}

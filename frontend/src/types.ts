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

// ===== 习惯打卡相关类型 =====

// 习惯定义
export interface Habit {
  id: string
  name: string
  frequency: '每日' | '每周' | '每月' | '工作日' | '周末' | '不定期'
  status: '生效' | '失效'
  weekly_target?: number
  monthly_target?: number
  start_date?: string
  end_date?: string
  phase?: string
  notes?: string
  daily_log_ids: string[]
  monthly_completed: number
  monthly_rate: string
  total_completed: number
  created_time: string
  last_edited_time: string
  url: string
}

// 打卡记录
export interface DailyLog {
  id: string
  title: string
  date: string
  habit_ids: string[]
  completed: boolean
  notes?: string
  weekday: string
  month: string
  created_time: string
  last_edited_time: string
  url: string
}

// 习惯统计
export interface HabitStats {
  today: HabitTodayStats
  week: HabitWeekStats
  month: HabitMonthStats
  habits: HabitDetail[]
}

export interface HabitTodayStats {
  total: number
  completed: number
  remaining: number
  completion_rate: number
}

export interface HabitWeekStats {
  completed: number
  target: number
  remaining: number
  completion_rate: number
  longest_streak: number
}

export interface HabitMonthStats {
  completed: number
  target: number
  completion_rate: number
}

export interface HabitDetail {
  habit_id: string
  habit_name: string
  frequency: string
  monthly_completed: number
  monthly_target: number
  completion_rate: number
  current_streak: number
  total_completed: number
}

// 日历数据
export interface CalendarData {
  date: string
  logs: DailyLog[]
  completed_count: number
  total_count: number
}

// ===== 任务统计相关类型 =====

export interface Stats {
  tasks: TaskStats
  habits: HabitStats
}

export interface TaskStats {
  today: TodayStats
  week: WeeklyStats
  health: HealthStats
  month: MonthlyStats
  distribution: DistributionStats
}

// 今日统计
export interface TodayStats {
  p0_urgent: number              // P0 紧急任务数
  p1_important: number           // P1 重要任务数
  p2_normal: number              // P2 普通任务数
  p3_low: number                 // P3 低优先级任务数
  completed: number              // 今日已完成
  target: number                 // 今日目标
  completion_rate: number        // 完成率 (0-100)
  suggestion: string             // 智能建议
}

// 本周统计
export interface WeeklyStats {
  completed: number              // 本周已完成
  target: number                 // 本周目标
  remaining: number              // 还需完成
  days_left: number              // 剩余天数
  completion_rate: number        // 完成率
  daily_trend: DailyTrend[]      // 每日趋势
  on_track: boolean              // 是否在正轨
  prediction: string             // 预测信息
}

// 每日趋势
export interface DailyTrend {
  date: string                   // "2024-12-02"
  day: string                    // "周一"
  completed: number              // 完成数
  is_today: boolean              // 是否今天
}

// 健康度统计
export interface HealthStats {
  risks: Risk[]                  // 风险列表
  flow: FlowMetrics              // 流动效率
  backlog: BacklogStatus         // 积压状态
  overall_score: number          // 综合健康分 (0-100)
  overall_level: 'excellent' | 'good' | 'poor'  // 健康等级
}

// 风险项
export interface Risk {
  type: 'p0_overload' | 'inbox_pile' | 'low_completion' | 'task_growth'
  severity: 'high' | 'medium' | 'low'
  message: string
  suggestion: string
  count?: number                 // 相关任务数
}

// 流动效率
export interface FlowMetrics {
  inbox_to_progress_rate: number   // 收集箱→进行中转化率
  progress_to_done_rate: number    // 进行中→完成转化率
  bottleneck: 'inbox' | 'progress' | null  // 瓶颈
  status_counts: {
    inbox: number
    in_progress: number
    done: number
  }
}

// 积压状态
export interface BacklogStatus {
  inbox_count: number
  in_progress_count: number
  status: 'healthy' | 'warning' | 'critical'
  recommendation: string
}

// 月度统计
export interface MonthlyStats {
  completed: number              // 本月完成
  target: number                 // 月度目标
  new_tasks: number              // 本月新增
  net_growth: number             // 净增长
  completion_rate: number        // 完成率
  trend: 'increasing' | 'stable' | 'decreasing'  // 趋势
  highlight: string              // 本月亮点
  improvement: string            // 改进建议
}

// 详细分布（原有）
export interface DistributionStats {
  total: number
  by_status: Record<string, number>
  by_priority: Record<string, number>
  by_type: Record<string, number>
  by_assignee: Record<string, number>
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

import { useState, useEffect, useMemo } from 'react'
import { Task } from './types'
import { fetchTasks, fetchStats, autoTransitionTasks, fetchCombinedData } from './api'
import { BarChart3, RefreshCw, Send, Plus, Inbox, PlayCircle, CheckCircle2, PauseCircle, XCircle, LayoutGrid, List, Settings, Cog, Calendar, ListTodo, Target } from 'lucide-react'
import TaskGallery from './components/TaskGallery'
import TaskTable from './components/TaskTable'
import TaskModal from './components/TaskModal'
import TaskDetailModal from './components/TaskDetailModal'
import ScheduleSettings from './components/ScheduleSettings'
import NotificationModal from './components/NotificationModal'
import ConfigSettings from './components/ConfigSettings'
import WeeklySummaryPage from './components/WeeklySummaryPage'
import HabitTracker from './components/habits/HabitTracker'

function App() {
  const [tasks, setTasks] = useState<Task[]>([])

  const [loading, setLoading] = useState(true)
  const [activeMenu, setActiveMenu] = useState<string>('我的一周')
  const [activeStatus, setActiveStatus] = useState<string>('进行中')
  const [viewMode, setViewMode] = useState<'gallery' | 'table'>('gallery')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [isScheduleSettingsOpen, setIsScheduleSettingsOpen] = useState(false)
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false)
  const [isConfigSettingsOpen, setIsConfigSettingsOpen] = useState(false)
  const [parentTaskForNewSubTask, setParentTaskForNewSubTask] = useState<Task | null>(null)
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null)
  const [timeFilter, setTimeFilter] = useState<'all' | 'week'>('all')
  const [isTransitioning, setIsTransitioning] = useState(false)

  const handleAutoTransition = async () => {
    setIsTransitioning(true)
    try {
      const result = await autoTransitionTasks()
      
      if (result.success) {
        const { transitioned, total_checked } = result.data
        
        if (transitioned > 0) {
          alert(`✅ 成功流转 ${transitioned} 个任务！\n\n检查了 ${total_checked} 个收集箱任务，其中 ${transitioned} 个已到开始时间，已自动转为进行中。`)
          // 刷新数据
          await loadData()
        } else {
          alert(`📭 暂无需要流转的任务\n\n检查了 ${total_checked} 个收集箱任务，都还未到开始时间。`)
        }
      } else {
        alert('❌ 自动流转失败，请稍后重试')
      }
    } catch (error) {
      console.error('Auto transition failed:', error)
      alert('❌ 自动流转失败，请检查网络连接')
    } finally {
      setIsTransitioning(false)
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      // 使用优化的组合API端点
      const { tasks: tasksData } = await fetchCombinedData()
      
      console.log('📊 获取到的任务数据:', tasksData)
      console.log('📊 任务状态分布:', tasksData.reduce((acc: any, task: Task) => {
        acc[task.status] = (acc[task.status] || 0) + 1
        return acc
      }, {}))
      setTasks(tasksData)
      // setStats(statsData) // 已移除stats状态，不再设置
    } catch (error) {
      console.error('Failed to load data:', error)
      // 回退到原始方法
      try {
        const [tasksData] = await Promise.all([
          fetchTasks(),
          fetchStats()
        ])
        setTasks(tasksData)
        // setStats(statsData) // 已移除stats状态，不再设置
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // 当切换到"已完成"tab时，自动切换到列表视图
  useEffect(() => {
    if (activeStatus === '已完成') {
      setViewMode('table')
    }
  }, [activeStatus])

  // 删除旧的 handleSendNotification，使用 NotificationModal 替代

  const handleSaveTask = async (taskData: Partial<Task>) => {
    const { createTask, updateTask } = await import('./api')
    
    if (selectedTask) {
      // 编辑任务
      await updateTask(selectedTask.id, taskData)
      setTasks(tasks.map(t => t.id === selectedTask.id ? { ...t, ...taskData } : t))
    } else {
      // 新建任务
      const newTask = await createTask(taskData)
      setTasks([...tasks, newTask])
    }
    
    await loadData() // 重新加载数据
  }

  const handleTaskClick = (task: Task) => {
    setDetailTask(task)
    setIsDetailModalOpen(true)
  }

  const handleEditTask = (task: Task) => {
    setSelectedTask(task)
    setIsModalOpen(true)
    setIsDetailModalOpen(false)
  }

  const handleNewTask = () => {
    setSelectedTask(null)
    setIsModalOpen(true)
  }

  const handleCreateSubTask = (parentTask: Task) => {
    // 设置父任务信息，用于新建子任务
    setParentTaskForNewSubTask(parentTask)
    setSelectedTask(null)
    setIsDetailModalOpen(false)
    setIsModalOpen(true)
  }

  // 根据状态、优先级、时间筛选任务，并过滤掉子任务（只显示主任务）
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // 只显示匹配状态的任务
      if (task.status !== activeStatus) return false
      
      // 过滤掉子任务（有parent_ids的任务）
      if (task.parent_ids && task.parent_ids.length > 0) return false
      
      // 优先级筛选
      if (priorityFilter && task.priority !== priorityFilter) return false
      
      // 时间筛选（本周）
      if (timeFilter === 'week') {
        const now = new Date()
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay() + 1) // 本周一
        weekStart.setHours(0, 0, 0, 0)
        
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6) // 本周日
        weekEnd.setHours(23, 59, 59, 999)
        
        // 检查任务是否在本周内有活动
        const deadline = task.deadline ? new Date(task.deadline) : null
        const lastEdited = new Date(task.last_edited_time)
        
        const isInWeek = (
          (deadline && deadline >= weekStart && deadline <= weekEnd) ||
          (lastEdited >= weekStart && lastEdited <= weekEnd)
        )
        
        if (!isInWeek) return false
      }
      
      return true
    })
  }, [tasks, activeStatus, priorityFilter, timeFilter])

  // 统计各状态任务数量（只统计主任务，不包括子任务）
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      '收集箱': 0,
      '进行中': 0,
      '暂停': 0,
      '已完成': 0,
      '已放弃': 0,
    }
    tasks.forEach(task => {
      // 只统计主任务（没有parent_ids的任务）
      if (task.parent_ids && task.parent_ids.length > 0) return
      
      if (counts[task.status] !== undefined) {
        counts[task.status]++
      }
    })
    return counts
  }, [tasks])

  // 侧边栏菜单项
  const menuItems = [
    { menu: '我的一周', icon: Calendar, color: 'text-indigo-600', bgColor: 'bg-indigo-50', hoverColor: 'hover:bg-indigo-100' },
    { menu: '我的任务', icon: ListTodo, color: 'text-blue-600', bgColor: 'bg-blue-50', hoverColor: 'hover:bg-blue-100' },
    { menu: '习惯打卡', icon: Target, color: 'text-green-600', bgColor: 'bg-green-50', hoverColor: 'hover:bg-green-100', badge: 'NEW' },
  ]

  // 任务状态标签页
  const statusTabs = [
    { status: '收集箱', icon: Inbox, color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-500' },
    { status: '进行中', icon: PlayCircle, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-500' },
    { status: '暂停', icon: PauseCircle, color: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-500' },
    { status: '已完成', icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-500' },
    { status: '已放弃', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-500' },
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">任务管理</h1>
              <p className="text-xs text-gray-500">Notion Task Manager</p>
            </div>
          </div>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeMenu === item.menu
            
            // 计算"我的任务"的总数
            let count = 0
            if (item.menu === '我的任务') {
              count = Object.values(statusCounts).reduce((sum, c) => sum + c, 0)
            }
            
            return (
              <button
                key={item.menu}
                onClick={() => {
                  setActiveMenu(item.menu)
                  if (item.menu === '我的任务') {
                    // 默认显示"进行中"
                    setActiveStatus('进行中')
                  }
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                  isActive 
                    ? `${item.bgColor} ${item.color} font-medium shadow-sm` 
                    : `text-gray-600 ${item.hoverColor}`
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-5 h-5" />
                  <span>{item.menu}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.menu === '我的任务' && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      isActive ? 'bg-white bg-opacity-50' : 'bg-gray-100'
                    }`}>
                      {count}
                    </span>
                  )}
                  {item.badge && (
                    <span className="px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-xs font-bold">
                      {item.badge}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <button
            onClick={handleNewTask}
            className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            新建任务
          </button>
          <button
            onClick={() => setIsNotificationModalOpen(true)}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Send className="w-4 h-4 mr-2" />
            发送提醒
          </button>
          <button
            onClick={() => setIsScheduleSettingsOpen(true)}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-4 h-4 mr-2" />
            定时设置
          </button>
          <button
            onClick={() => setIsConfigSettingsOpen(true)}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Cog className="w-4 h-4 mr-2" />
            系统配置
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {activeMenu}
                  {activeMenu === '我的任务' && priorityFilter && (
                    <span className="text-lg font-normal text-blue-600 ml-2">· {priorityFilter}</span>
                  )}
                  {activeMenu === '我的任务' && timeFilter === 'week' && (
                    <span className="text-lg font-normal text-purple-600 ml-2">· 本周任务</span>
                  )}
                </h2>
                {activeMenu === '我的任务' && (
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-500">共 {filteredTasks.length} 个任务</p>
                    {(priorityFilter || timeFilter === 'week') && (
                      <button
                        onClick={() => {
                          setPriorityFilter(null)
                          setTimeFilter('all')
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 underline"
                      >
                        清除筛选
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-3">
                {/* View Mode Toggle - 只在我的任务页面显示 */}
                {activeMenu === '我的任务' && (
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('gallery')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        viewMode === 'gallery'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        viewMode === 'table'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <button
                  onClick={handleAutoTransition}
                  disabled={isTransitioning}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  title="将收集箱中已到开始时间的任务自动转为进行中"
                >
                  <PlayCircle className={`w-4 h-4 mr-2 ${isTransitioning ? 'animate-spin' : ''}`} />
                  自动流转
                </button>
                <button
                  onClick={loadData}
                  disabled={loading}
                  className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  刷新
                </button>
              </div>
            </div>
          </div>

          {/* Status Tabs - 只在"我的任务"页面显示 */}
          {activeMenu === '我的任务' && (
            <div className="px-6 pb-3 border-t border-gray-100">
              <div className="flex space-x-1 overflow-x-auto">
                {statusTabs.map((tab) => {
                  const Icon = tab.icon
                  const count = statusCounts[tab.status] || 0
                  const isActive = activeStatus === tab.status
                  
                  return (
                    <button
                      key={tab.status}
                      onClick={() => setActiveStatus(tab.status)}
                      className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-lg transition-all whitespace-nowrap ${
                        isActive
                          ? `${tab.bgColor} ${tab.color} font-medium border-b-2 ${tab.borderColor}`
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.status}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                        isActive ? 'bg-white' : 'bg-gray-100'
                      }`}>
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeMenu === '习惯打卡' ? (
            // 习惯打卡页面
            <HabitTracker />
          ) : activeMenu === '我的一周' ? (
            <WeeklySummaryPage />
          ) : activeMenu === '我的任务' ? (
            loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              </div>
            ) : (
              // 任务列表页面
              <>
                {viewMode === 'gallery' ? (
                  <TaskGallery tasks={filteredTasks} onTaskClick={handleTaskClick} onTaskUpdate={loadData} />
                ) : (
                  <TaskTable tasks={filteredTasks} onTaskClick={handleTaskClick} />
                )}
              </>
            )
          ) : null}
        </div>
      </main>

      {/* Modals */}
      <TaskModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setParentTaskForNewSubTask(null)
        }}
        onSave={handleSaveTask}
        parentTask={parentTaskForNewSubTask}
      />
      
      <TaskDetailModal
        task={detailTask}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onEdit={handleEditTask}
        onCreateSubTask={handleCreateSubTask}
      />

      <ScheduleSettings
        isOpen={isScheduleSettingsOpen}
        onClose={() => setIsScheduleSettingsOpen(false)}
      />
      
      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
      />
      
      <ConfigSettings
        isOpen={isConfigSettingsOpen}
        onClose={() => setIsConfigSettingsOpen(false)}
      />
    </div>
  )
}

export default App

import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Task } from './types'
import { BarChart3, Send, Plus, Inbox, PlayCircle, CheckCircle2, AlertTriangle, XCircle, LayoutGrid, List, KanbanSquare, Calendar, ListTodo, Target, LogOut, User, Home, Database } from 'lucide-react'
import LoginPage from './components/LoginPage'
import ShareViewPage from './components/ShareViewPage'
import TaskGallery from './components/TaskGallery'
import TaskTable from './components/TaskTable'
import TaskBoard from './components/TaskBoard'
import TaskModal from './components/TaskModal'
import TaskDetailModal from './components/TaskDetailModal'
import NotificationCenter from './components/NotificationCenter'
import WeeklySummaryPage from './components/WeeklySummaryPage'
import HabitTracker from './components/habits/HabitTracker'
import DashboardPage from './components/dashboard/DashboardPage'
import DbManager from './components/DbManager'
import { useAuth } from './hooks/useAuth'
import { useTasks } from './hooks/useTasks'

// 菜单路径映射
const MENU_PATH_MAP: Record<string, string> = {
  '工作台': '/dashboard',
  '我的一周': '/weekly',
  '我的任务': '/tasks',
  '习惯打卡': '/habits',
  '数据库': '/db',
}
const PATH_MENU_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(MENU_PATH_MAP).map(([k, v]) => [v, k])
)

function AppContent() {
  const navigate = useNavigate()
  const location = useLocation()

  // --- Hooks ---
  const { isAuthenticated, currentUser, handleLoginSuccess, handleLogout: authLogout } = useAuth()
  const {
    tasks, loading,
    activeStatus, setActiveStatus,
    priorityFilter, setPriorityFilter,
    timeFilter, setTimeFilter,
    filteredTasks, boardTasks, statusCounts,
    handleSaveTask, handleDeleteTask, handleTaskFieldUpdate,
    resetTasks,
  } = useTasks(isAuthenticated)

  // --- Local UI State ---
  const [activeMenu, setActiveMenu] = useState<string>(PATH_MENU_MAP[location.pathname] || '工作台')
  const [viewMode, setViewMode] = useState<'gallery' | 'table' | 'board'>('gallery')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false)
  const [parentTaskForNewSubTask, setParentTaskForNewSubTask] = useState<Task | null>(null)
  const [copySourceTask, setCopySourceTask] = useState<Task | null>(null)

  // URL 变化时同步 activeMenu
  useEffect(() => {
    const menu = PATH_MENU_MAP[location.pathname]
    if (menu) setActiveMenu(menu)
  }, [location.pathname])

  // 切换到"已完成"tab时，自动切换到列表视图
  useEffect(() => {
    if (activeStatus === '已完成') setViewMode('table')
  }, [activeStatus])

  const handleLogout = useCallback(() => {
    authLogout()
    resetTasks()
  }, [authLogout, resetTasks])

  // --- Task Interaction Handlers ---
  const handleTaskClick = (task: Task) => {
    setDetailTask(task)
    setIsDetailModalOpen(true)
  }

  const handleDrillStatus = (status: string) => {
    setActiveStatus(status)
    setViewMode('gallery')
    setActiveMenu('我的任务')
    navigate('/tasks')
  }

  const handleNavigateToBoard = () => {
    setViewMode('board')
    setActiveMenu('我的任务')
    navigate('/tasks')
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
    setParentTaskForNewSubTask(parentTask)
    setSelectedTask(null)
    setIsDetailModalOpen(false)
    setIsModalOpen(true)
  }

  const handleCopyTask = (task: Task) => {
    setCopySourceTask(task)
    setParentTaskForNewSubTask(null)
    setSelectedTask(null)
    setIsDetailModalOpen(false)
    setIsModalOpen(true)
  }

  const onDeleteTask = async (task: Task) => {
    const ok = await handleDeleteTask(task)
    if (ok) {
      setIsDetailModalOpen(false)
      setIsModalOpen(false)
      setSelectedTask(null)
    }
  }

  const onSaveTask = async (taskData: Partial<Task>) => {
    await handleSaveTask(taskData, selectedTask)
  }

  // --- UI Constants ---
  const menuItems: { menu: string; icon: any; color: string; bgColor: string; hoverColor: string }[] = [
    { menu: '工作台', icon: Home, color: 'text-purple-600', bgColor: 'bg-purple-50', hoverColor: 'hover:bg-purple-100' },
    { menu: '我的一周', icon: Calendar, color: 'text-indigo-600', bgColor: 'bg-indigo-50', hoverColor: 'hover:bg-indigo-100' },
    { menu: '我的任务', icon: ListTodo, color: 'text-blue-600', bgColor: 'bg-blue-50', hoverColor: 'hover:bg-blue-100' },
    { menu: '习惯打卡', icon: Target, color: 'text-green-600', bgColor: 'bg-green-50', hoverColor: 'hover:bg-green-100' },
    ...(currentUser?.role === 'owner' ? [{ menu: '数据库', icon: Database, color: 'text-orange-600', bgColor: 'bg-orange-50', hoverColor: 'hover:bg-orange-100' }] : []),
  ]

  const statusTabs = [
    { status: '待开始', icon: Inbox, color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-500' },
    { status: '进行中', icon: PlayCircle, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-500' },
    { status: '已逾期', icon: AlertTriangle, color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-500' },
    { status: '已完成', icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-500' },
    { status: '已放弃', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-500' },
  ]

  // --- Render ---
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar */}
      <aside className="w-52 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900">任务管理</h1>
              <p className="text-[10px] text-gray-500">Personal Workbench</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeMenu === item.menu
            let count = 0
            if (item.menu === '我的任务') {
              count = Object.values(statusCounts).reduce((sum, c) => sum + c, 0)
            }
            return (
              <button
                key={item.menu}
                onClick={() => {
                  setActiveMenu(item.menu)
                  navigate(MENU_PATH_MAP[item.menu] || '/')
                  if (item.menu === '我的任务') setActiveStatus('进行中')
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-sm ${
                  isActive ? `${item.bgColor} ${item.color} font-medium shadow-sm` : `text-gray-600 ${item.hoverColor}`
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.menu}</span>
                </div>
                {item.menu === '我的任务' && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${isActive ? 'bg-white bg-opacity-50' : 'bg-gray-100'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {currentUser && (
          <div className="px-3 py-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-800">{currentUser.displayName || currentUser.username}</p>
                  <p className="text-[10px] text-gray-400">{currentUser.role}</p>
                </div>
              </div>
              <button onClick={handleLogout} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="退出登录">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="px-3 py-2 border-t border-gray-200 space-y-1.5">
          <button onClick={handleNewTask} className="w-full flex items-center justify-center px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            新建任务
          </button>
          <button onClick={() => setIsNotificationCenterOpen(true)} className="w-full flex items-center justify-center px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <Send className="w-3.5 h-3.5 mr-1.5" />
            通知中心
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
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
                      <button onClick={() => { setPriorityFilter(null); setTimeFilter('all') }} className="text-xs text-blue-600 hover:text-blue-700 underline">
                        清除筛选
                      </button>
                    )}
                  </div>
                )}
              </div>
              {activeMenu === '我的任务' && (
                <div className="flex bg-gray-100 rounded-lg p-1">
                  {(['gallery', 'board', 'table'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        viewMode === mode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {mode === 'gallery' ? <LayoutGrid className="w-4 h-4" /> : mode === 'board' ? <KanbanSquare className="w-4 h-4" /> : <List className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

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
                        isActive ? `${tab.bgColor} ${tab.color} font-medium border-b-2 ${tab.borderColor}` : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.status}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${isActive ? 'bg-white' : 'bg-gray-100'}`}>
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
          {activeMenu === '工作台' ? (
            <DashboardPage
              tasks={tasks}
              onTaskClick={handleTaskClick}
              onTaskUpdate={handleTaskFieldUpdate}
              onDrillStatus={handleDrillStatus}
              onNavigateToBoard={handleNavigateToBoard}
              onNavigateToHabits={() => { setActiveMenu('习惯打卡'); navigate('/habits') }}
            />
          ) : activeMenu === '习惯打卡' ? (
            <HabitTracker />
          ) : activeMenu === '数据库' ? (
            <DbManager />
          ) : activeMenu === '我的一周' ? (
            <WeeklySummaryPage />
          ) : activeMenu === '我的任务' ? (
            loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              </div>
            ) : viewMode === 'board' ? (
              <TaskBoard tasks={boardTasks} onTaskClick={handleTaskClick} onTaskUpdate={handleTaskFieldUpdate} />
            ) : viewMode === 'gallery' ? (
              <TaskGallery tasks={filteredTasks} onTaskClick={handleTaskClick} onTaskUpdate={handleTaskFieldUpdate} onCopy={handleCopyTask} />
            ) : (
              <TaskTable tasks={filteredTasks} onTaskClick={handleTaskClick} onCopy={handleCopyTask} />
            )
          ) : null}
        </div>
      </main>

      {/* Modals */}
      {isModalOpen && (
        <TaskModal
          task={selectedTask}
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setParentTaskForNewSubTask(null); setCopySourceTask(null) }}
          onSave={onSaveTask}
          onDelete={onDeleteTask}
          parentTask={parentTaskForNewSubTask}
          copyTask={copySourceTask}
        />
      )}

      {isDetailModalOpen && detailTask && (
        <TaskDetailModal
          task={detailTask}
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          onEdit={handleEditTask}
          onDelete={onDeleteTask}
          onCreateSubTask={handleCreateSubTask}
          onCopy={handleCopyTask}
        />
      )}

      {isNotificationCenterOpen && (
        <NotificationCenter isOpen={isNotificationCenterOpen} onClose={() => setIsNotificationCenterOpen(false)} />
      )}
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/share/:token" element={<ShareViewPage />} />
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<AppContent />} />
      </Routes>
    </BrowserRouter>
  )
}

function RootRedirect() {
  const navigate = useNavigate()
  useEffect(() => { navigate('/dashboard', { replace: true }) }, [])
  return null
}

export default App

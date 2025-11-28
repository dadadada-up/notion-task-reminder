import { useState, useEffect, useMemo } from 'react'
import { BarChart3, RefreshCw, Send, Plus, Inbox, PlayCircle, CheckCircle2, PauseCircle, XCircle, LayoutGrid, List } from 'lucide-react'
import TaskGallery from './components/TaskGallery'
import TaskTable from './components/TaskTable'
import StatsPanel from './components/StatsPanel'
import TaskModal from './components/TaskModal'
import TaskDetailModal from './components/TaskDetailModal'
import { Task, Stats } from './types'
import { fetchTasks, fetchStats, sendNotification } from './api'

function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeStatus, setActiveStatus] = useState<string>('进行中')
  const [viewMode, setViewMode] = useState<'gallery' | 'table'>('gallery')
  const [sending, setSending] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [detailTask, setDetailTask] = useState<Task | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [tasksData, statsData] = await Promise.all([
        fetchTasks(),
        fetchStats()
      ])
      console.log('📊 获取到的任务数据:', tasksData)
      console.log('📊 任务状态分布:', tasksData.reduce((acc: any, task: Task) => {
        acc[task.status] = (acc[task.status] || 0) + 1
        return acc
      }, {}))
      setTasks(tasksData)
      setStats(statsData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSendNotification = async (type: 'daily_todo' | 'daily_done') => {
    setSending(true)
    try {
      await sendNotification(type, ['pushplus', 'email'])
      alert('通知发送成功！')
    } catch (error) {
      alert('通知发送失败：' + error)
    } finally {
      setSending(false)
    }
  }

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

  // 根据状态筛选任务
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => task.status === activeStatus)
  }, [tasks, activeStatus])

  // 统计各状态任务数量
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      '收集箱': 0,
      '进行中': 0,
      '暂停': 0,
      '已完成': 0,
      '已放弃': 0,
    }
    tasks.forEach(task => {
      if (counts[task.status] !== undefined) {
        counts[task.status]++
      }
    })
    return counts
  }, [tasks])

  const statusItems = [
    { status: '收集箱', icon: Inbox, color: 'text-yellow-600', bgColor: 'bg-yellow-50', hoverColor: 'hover:bg-yellow-100' },
    { status: '进行中', icon: PlayCircle, color: 'text-blue-600', bgColor: 'bg-blue-50', hoverColor: 'hover:bg-blue-100' },
    { status: '暂停', icon: PauseCircle, color: 'text-gray-600', bgColor: 'bg-gray-50', hoverColor: 'hover:bg-gray-100' },
    { status: '已完成', icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-50', hoverColor: 'hover:bg-green-100' },
    { status: '已放弃', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50', hoverColor: 'hover:bg-red-100' },
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

        {/* Status Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {statusItems.map((item) => {
            const Icon = item.icon
            const count = statusCounts[item.status] || 0
            const isActive = activeStatus === item.status
            
            return (
              <button
                key={item.status}
                onClick={() => setActiveStatus(item.status)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                  isActive 
                    ? `${item.bgColor} ${item.color} font-medium shadow-sm` 
                    : `text-gray-600 ${item.hoverColor}`
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-5 h-5" />
                  <span>{item.status}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  isActive ? 'bg-white bg-opacity-50' : 'bg-gray-100'
                }`}>
                  {count}
                </span>
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
            onClick={() => handleSendNotification('daily_todo')}
            disabled={sending}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4 mr-2" />
            发送提醒
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{activeStatus}</h2>
              <p className="text-sm text-gray-500">共 {filteredTasks.length} 个任务</p>
            </div>
            <div className="flex items-center space-x-3">
              {/* View Mode Toggle */}
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
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <>
              {viewMode === 'gallery' ? (
                <TaskGallery tasks={filteredTasks} onTaskClick={handleTaskClick} />
              ) : (
                <TaskTable tasks={filteredTasks} onTaskClick={handleTaskClick} />
              )}
              
              {/* Stats Panel */}
              {stats && (
                <div className="mt-8">
                  <StatsPanel stats={stats} />
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Modals */}
      <TaskModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
      />
      
      <TaskDetailModal
        task={detailTask}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onEdit={handleEditTask}
      />
    </div>
  )
}

export default App

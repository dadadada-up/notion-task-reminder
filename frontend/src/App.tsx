import { useState, useEffect } from 'react'
import { BarChart3, RefreshCw, Send, Plus } from 'lucide-react'
import TaskBoard from './components/TaskBoard'
import StatsPanel from './components/StatsPanel'
import TaskModal from './components/TaskModal'
import { Task, Stats } from './types'
import { fetchTasks, fetchStats, sendNotification } from './api'

function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'today' | 'week'>('today')
  const [sending, setSending] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [tasksData, statsData] = await Promise.all([
        fetchTasks(),
        fetchStats()
      ])
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
    setSelectedTask(task)
    setIsModalOpen(true)
  }

  const handleNewTask = () => {
    setSelectedTask(null)
    setIsModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Notion Task Manager</h1>
                <p className="text-sm text-gray-500">现代化任务管理系统</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Filter Buttons */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setFilter('today')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    filter === 'today'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  今日
                </button>
                <button
                  onClick={() => setFilter('week')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    filter === 'week'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  本周
                </button>
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  全部
                </button>
              </div>

              {/* Action Buttons */}
              <button
                onClick={handleNewTask}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                新建任务
              </button>

              <button
                onClick={() => handleSendNotification('daily_todo')}
                disabled={sending}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4 mr-2" />
                发送待办提醒
              </button>

              <button
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                刷新
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Task Board */}
            <TaskBoard 
              tasks={tasks} 
              onTasksChange={setTasks}
              onTaskClick={handleTaskClick}
            />

            {/* Stats Panel - 移到底部 */}
            {stats && <StatsPanel stats={stats} />}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            Notion Task Manager · Powered by React + Flask
          </p>
        </div>
      </footer>

      {/* Task Modal */}
      <TaskModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
      />
    </div>
  )
}

export default App

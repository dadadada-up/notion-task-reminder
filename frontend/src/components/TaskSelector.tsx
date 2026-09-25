import { useState, useEffect } from 'react'
import { Search, X, CheckCircle2 } from 'lucide-react'
import { Task } from '../types'
import { fetchTasks } from '../api'

interface TaskSelectorProps {
  selectedIds: string[]
  onSelect: (taskIds: string[]) => void
  excludeIds?: string[]
  label: string
  placeholder?: string
  multiple?: boolean
}

const TaskSelector = ({ 
  selectedIds, 
  onSelect, 
  excludeIds = [], 
  placeholder = "搜索任务...",
  multiple = true
}: TaskSelectorProps) => {
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    setLoading(true)
    try {
      const tasks = await fetchTasks()
      setAllTasks(tasks)
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTasks = allTasks.filter(task => {
    // 排除已选择的和需要排除的任务
    if (excludeIds.includes(task.id)) return false
    
    // 搜索过滤
    if (searchTerm) {
      return task.name.toLowerCase().includes(searchTerm.toLowerCase())
    }
    return true
  })

  const selectedTasks = allTasks.filter(task => selectedIds.includes(task.id))

  const handleToggleTask = (taskId: string) => {
    if (multiple) {
      if (selectedIds.includes(taskId)) {
        onSelect(selectedIds.filter(id => id !== taskId))
      } else {
        onSelect([...selectedIds, taskId])
      }
    } else {
      onSelect([taskId])
      setIsOpen(false)
    }
  }

  const handleRemoveTask = (taskId: string) => {
    onSelect(selectedIds.filter(id => id !== taskId))
  }

  const getStatusDot = (status: string) => {
    const colors: Record<string, string> = {
      '待开始': 'bg-yellow-400',
      '进行中': 'bg-blue-400',
      '已逾期': 'bg-orange-400',
      '已完成': 'bg-green-400',
      '已放弃': 'bg-red-400',
    }
    return colors[status] || 'bg-gray-300'
  }

  return (
    <div>
      {/* 已选择的任务 */}
      {selectedTasks.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedTasks.map(task => (
            <div
              key={task.id}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg text-xs font-medium"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span className="max-w-[120px] truncate">{task.name}</span>
              <button
                type="button"
                onClick={() => handleRemoveTask(task.id)}
                className="hover:bg-purple-200 rounded p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 搜索框 */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />
        </div>

        {/* 下拉列表 */}
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute z-20 w-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-400 text-sm">
                  加载中...
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="p-4 text-center text-gray-400 text-sm">
                  {searchTerm ? '未找到匹配的任务' : '暂无可选任务'}
                </div>
              ) : (
                filteredTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => handleToggleTask(task.id)}
                    className={`px-4 py-2.5 cursor-pointer hover:bg-purple-50 transition-colors ${
                      selectedIds.includes(task.id) ? 'bg-purple-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusDot(task.status)}`} />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate">
                            {task.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            {task.status} · {task.priority}
                          </div>
                        </div>
                      </div>
                      {selectedIds.includes(task.id) && (
                        <CheckCircle2 className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default TaskSelector

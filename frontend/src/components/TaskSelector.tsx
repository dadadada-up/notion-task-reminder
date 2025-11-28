import { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'
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
  label,
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

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>

      {/* 已选择的任务 */}
      {selectedTasks.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedTasks.map(task => (
            <div
              key={task.id}
              className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
            >
              <span>{task.name}</span>
              <button
                type="button"
                onClick={() => handleRemoveTask(task.id)}
                className="hover:bg-blue-200 rounded-full p-0.5"
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
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* 下拉列表 */}
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">
                  加载中...
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {searchTerm ? '未找到匹配的任务' : '暂无可选任务'}
                </div>
              ) : (
                filteredTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => handleToggleTask(task.id)}
                    className={`px-4 py-2 cursor-pointer hover:bg-purple-50 ${
                      selectedIds.includes(task.id) ? 'bg-purple-100' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {task.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {task.status} · {task.priority}
                        </div>
                      </div>
                      {selectedIds.includes(task.id) && (
                        <div className="text-purple-600">✓</div>
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

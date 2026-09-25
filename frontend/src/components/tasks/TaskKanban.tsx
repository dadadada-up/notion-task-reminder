import { useMemo, useRef, useState } from 'react'
import { Inbox, Flame, CheckCircle2 } from 'lucide-react'
import { Task } from '../../types'
import { useTaskStatus } from '../../hooks/useTaskStatus'
import { celebrate } from '../../utils/celebrate'
import { getTodayStr } from '../../utils/dateFormat'
import KanbanCard from './KanbanCard'

const PRIORITY_ORDER: Record<string, number> = {
  'P0 重要紧急': 0,
  'P1 重要不紧急': 1,
  'P2 紧急不重要': 2,
  'P3 不重要不紧急': 3,
}

interface TaskKanbanProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void
  /** 高亮"下一步"卡片（今日待办列首张） */
  highlightNext?: boolean
  /** 已完成列最大高度（px），超出滚动 */
  doneMaxHeight?: number
}

export default function TaskKanban({
  tasks,
  onTaskClick,
  onTaskUpdate,
  highlightNext = false,
  doneMaxHeight,
}: TaskKanbanProps) {
  const { busyIds, changeStatus, complete, undoComplete } = useTaskStatus(tasks, onTaskUpdate)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<string | null>(null)
  const dragFromRef = useRef<Task['status'] | null>(null)

  const todayStr = useMemo(() => getTodayStr(), [])

  const byPriority = (a: Task, b: Task) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 9
    const pb = PRIORITY_ORDER[b.priority] ?? 9
    if (pa !== pb) return pa - pb
    return (a.deadline || '9999-12-31').localeCompare(b.deadline || '9999-12-31')
  }

  const cols = useMemo(() => {
    const todo: Task[] = []
    const doing: Task[] = []
    const done: Task[] = []
    for (const t of tasks) {
      if (t.status === '进行中') doing.push(t)
      else if (t.status === '已完成') done.push(t)
      else if (t.status === '已放弃') continue
      else todo.push(t) // 待开始 / 已逾期
    }
    todo.sort(byPriority)
    doing.sort(byPriority)
    done.sort((a, b) => (b.completed_time || '').localeCompare(a.completed_time || ''))
    return { todo, doing, done }
  }, [tasks])

  // 彩带庆祝
  const burst = (e: React.MouseEvent | HTMLElement) => {
    const el = e instanceof HTMLElement ? e : (e.target as HTMLElement)
    celebrate(el)
  }

  const handleComplete = async (task: Task, e: React.MouseEvent) => {
    const ok = await complete(task)
    if (ok) burst(e)
  }

  const handleDrop = async (toStatus: Task['status']) => {
    setOverCol(null)
    const id = dragId
    const from = dragFromRef.current
    setDragId(null)
    dragFromRef.current = null
    if (!id || !from || from === toStatus) return
    const task = tasks.find(t => t.id === id)
    if (!task) return
    const ok = await changeStatus(task, toStatus)
    if (ok && toStatus === '已完成') {
      const col = document.querySelector(`[data-col="${toStatus}"]`)
      if (col) burst(col as HTMLElement)
    }
  }

  const columns: {
    key: Task['status']
    title: string
    icon: any
    accent: string
    list: Task[]
    mode: 'active' | 'done'
  }[] = [
    { key: '待开始', title: '今日待办', icon: Inbox, accent: 'text-yellow-600 bg-yellow-50', list: cols.todo, mode: 'active' },
    { key: '进行中', title: '进行中', icon: Flame, accent: 'text-blue-600 bg-blue-50', list: cols.doing, mode: 'active' },
    { key: '已完成', title: '已完成', icon: CheckCircle2, accent: 'text-green-600 bg-green-50', list: cols.done, mode: 'done' },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {columns.map(col => {
        const Icon = col.icon
        return (
          <div
            key={col.key}
            data-col={col.key}
            onDragOver={(e) => { e.preventDefault(); setOverCol(col.key) }}
            onDragLeave={() => setOverCol(prev => (prev === col.key ? null : prev))}
            onDrop={() => handleDrop(col.key)}
            className={`rounded-xl border p-2.5 transition-colors ${
              overCol === col.key ? 'border-indigo-300 bg-indigo-50/50' : 'border-gray-100 bg-gray-50/60'
            }`}
          >
            <div className="flex items-center justify-between px-1 mb-2">
              <div className={`flex items-center gap-1.5 text-xs font-bold ${col.accent.split(' ')[0]}`}>
                <span className={`w-5 h-5 rounded-md ${col.accent.split(' ')[1]} flex items-center justify-center`}>
                  <Icon className="w-3.5 h-3.5" />
                </span>
                {col.title}
              </div>
              <span className="text-[11px] font-semibold text-gray-400 bg-white border border-gray-100 rounded-full px-2 min-w-[22px] text-center">
                {col.list.length}
              </span>
            </div>

            <div className="min-h-[60px]" style={col.key === '已完成' && doneMaxHeight ? { maxHeight: doneMaxHeight, overflowY: 'auto' } : undefined}>
              {col.list.length === 0 ? (
                <div className="border border-dashed border-gray-200 rounded-lg py-6 text-center text-[11px] text-gray-300">
                  {col.key === '已完成' ? '拖拽或点 ✓ 完成' : '暂无'}
                </div>
              ) : (
                col.list.map((task, i) => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    todayStr={todayStr}
                    mode={col.mode}
                    busy={busyIds.has(task.id)}
                    draggable
                    highlight={highlightNext && col.key === '待开始' && i === 0}
                    onOpen={onTaskClick}
                    onComplete={handleComplete}
                    onUndo={undoComplete}
                    onDragStart={(t) => { setDragId(t.id); dragFromRef.current = t.status }}
                    onDragEnd={() => { setDragId(null); dragFromRef.current = null; setOverCol(null) }}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

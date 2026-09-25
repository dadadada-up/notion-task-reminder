import { Task } from '../../types'
import { Check, Undo2, Loader2, Grip } from 'lucide-react'
import { formatDate } from '../../utils/dateFormat'

const PRIORITY_CHIP: Record<string, string> = {
  'P0': 'bg-red-100 text-red-700',
  'P1': 'bg-indigo-100 text-indigo-700',
  'P2': 'bg-orange-100 text-orange-700',
  'P3': 'bg-gray-100 text-gray-600',
}

const priorityCode = (p: string): string => {
  if (p.includes('P0')) return 'P0'
  if (p.includes('P1')) return 'P1'
  if (p.includes('P2')) return 'P2'
  return 'P3'
}

interface KanbanCardProps {
  task: Task
  todayStr: string
  mode: 'active' | 'done'
  busy?: boolean
  highlight?: boolean
  /** 单行紧凑模式（今日待办清单用） */
  compact?: boolean
  draggable?: boolean
  onOpen: (task: Task) => void
  onComplete?: (task: Task, e: React.MouseEvent) => void
  onUndo?: (task: Task, e: React.MouseEvent) => void
  onDragStart?: (task: Task) => void
  onDragEnd?: () => void
}

export default function KanbanCard({
  task,
  todayStr,
  mode,
  busy,
  highlight,
  compact,
  draggable,
  onOpen,
  onComplete,
  onUndo,
  onDragStart,
  onDragEnd,
}: KanbanCardProps) {
  const pc = priorityCode(task.priority)
  const isOverdue = task.status === '已逾期' || (!!task.deadline && task.deadline < todayStr)
  const isDone = mode === 'done'

  // 单行紧凑模式：标题 + 元信息 + 操作按钮同行，消除中间空白
  if (compact) {
    return (
      <div
        onClick={() => onOpen(task)}
        className={`group flex items-center gap-2.5 bg-white border rounded-lg px-3 py-2.5 mb-2 cursor-pointer transition-all hover:shadow-sm ${
          isDone ? 'border-green-100 bg-green-50/40' : 'border-gray-200 hover:border-indigo-200'
        }`}
      >
        <div className="flex-1 min-w-0">
          <p className={`text-[13px] font-medium truncate ${isDone ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
            {task.name}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {!isDone && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${PRIORITY_CHIP[pc]}`}>{pc}</span>}
          {isOverdue && !isDone && (
            <span className="text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">逾期</span>
          )}
          {task.deadline && (
            <span className={`text-[10.5px] whitespace-nowrap ${isOverdue && !isDone ? 'text-red-500' : 'text-gray-400'}`}>
              {formatDate(task.deadline)}
            </span>
          )}
          {task.task_type && task.task_type !== '未分类' && (
            <span className="text-[10px] text-gray-400 whitespace-nowrap hidden xl:inline">· {task.task_type}</span>
          )}
        </div>
        {isDone ? (
          <button
            onClick={(e) => { e.stopPropagation(); onUndo?.(task, e) }}
            disabled={busy}
            title="撤销完成"
            className="w-6 h-6 rounded-md border border-green-200 bg-white flex items-center justify-center text-green-500 hover:bg-green-50 transition-colors disabled:opacity-50 flex-shrink-0"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onComplete?.(task, e) }}
            disabled={busy}
            title="标记完成"
            className="w-6 h-6 rounded-md border-2 border-gray-200 bg-white flex items-center justify-center text-transparent hover:border-green-500 hover:bg-green-50 hover:text-green-500 transition-all disabled:opacity-50 flex-shrink-0"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 text-green-500 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      draggable={draggable && !isDone && !busy}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        onDragStart?.(task)
      }}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(task)}
      className={`group relative bg-white border rounded-xl px-3 py-2.5 mb-2 shadow-sm transition-all ${
        isDone
          ? 'border-green-100 bg-green-50/40 cursor-pointer'
          : 'border-gray-200 hover:shadow-md hover:-translate-y-px cursor-pointer'
      } ${highlight ? 'ring-2 ring-amber-300 shadow-amber-100' : ''}`}
    >
      {/* 下一步角标 */}
      {highlight && (
        <span className="absolute top-2 right-2 text-[9px] font-bold text-amber-700 bg-amber-100 rounded px-1.5 py-0.5">
          下一步
        </span>
      )}

      {/* 拖拽把手 */}
      {draggable && !isDone && (
        <Grip className="absolute bottom-2 left-1 w-3 h-3 text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}

      <p className={`text-[13px] font-medium leading-snug pr-6 ${isDone ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
        {task.name}
      </p>

      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
        {!isDone && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${PRIORITY_CHIP[pc]}`}>{pc}</span>}
        {isOverdue && !isDone && (
          <span className="text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">逾期</span>
        )}
        {task.deadline && (
          <span className={`text-[10.5px] ${isOverdue && !isDone ? 'text-red-500' : 'text-gray-400'}`}>
            {formatDate(task.deadline)}
          </span>
        )}
        {task.task_type && task.task_type !== '未分类' && (
          <span className="text-[10px] text-gray-400">· {task.task_type}</span>
        )}
      </div>

      {/* 操作按钮 */}
      {isDone ? (
        <button
          onClick={(e) => { e.stopPropagation(); onUndo?.(task, e) }}
          disabled={busy}
          title="撤销完成"
          className="absolute bottom-2 right-2 flex items-center gap-0.5 text-[10px] text-green-600 bg-white border border-green-200 rounded-md px-1.5 py-0.5 opacity-0 group-hover:opacity-100 hover:bg-green-50 transition-opacity disabled:opacity-50"
        >
          <Undo2 className="w-3 h-3" /> 撤销
        </button>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); onComplete?.(task, e) }}
          disabled={busy}
          title="标记完成"
          className="absolute bottom-2 right-2 w-6 h-6 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-transparent hover:border-green-500 hover:bg-green-50 hover:text-green-500 transition-all disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 text-green-500 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  )
}

import { useMemo, useState } from 'react'
import { CalendarClock, ArrowRight, Check, Undo2, Loader2, ChevronRight, Lock } from 'lucide-react'
import { Task } from '../../types'
import { useTaskStatus } from '../../hooks/useTaskStatus'
import { celebrate } from '../../utils/celebrate'
import { getTodayStr, toBeijingDateStr } from '../../utils/dateFormat'

interface TodayTasksProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void
  /** 跳转到 /tasks 全量看板 */
  onManageAll?: () => void
}

const PRIORITY_ORDER: Record<string, number> = {
  'P0 重要紧急': 0,
  'P1 重要不紧急': 1,
  'P2 紧急不重要': 2,
  'P3 不重要不紧急': 3,
}

const priorityCode = (p?: string) => (p || '').split(' ')[0] || 'P3'

/** 计算相对时间：返回主标签/副标签/紧迫度档位 */
function timeInfo(task: Task, todayStr: string) {
  const today = new Date(todayStr)
  const due = task.deadline ? new Date(task.deadline) : null
  const isOverdue = task.status === '已逾期' || (!!task.deadline && task.deadline < todayStr)

  if (isOverdue && due) {
    const days = Math.max(1, Math.round((today.getTime() - due.getTime()) / 86400000))
    return { top: '逾期', bottom: `${days} 天`, tone: 'overdue' as const }
  }
  if (!due) return { top: '无期限', bottom: '', tone: 'later' as const }
  const days = Math.round((due.getTime() - today.getTime()) / 86400000)
  if (days === 0) return { top: '今天', bottom: fmtMD(task.deadline!), tone: 'today' as const }
  if (days <= 3) return { top: fmtMD(task.deadline), bottom: `${days} 天后`, tone: 'soon' as const }
  return { top: fmtMD(task.deadline), bottom: `${days} 天后`, tone: 'later' as const }
}

function fmtMD(iso?: string) {
  if (!iso) return ''
  const [, m, d] = iso.split('-')
  return `${Number(m)}/${Number(d)}`
}

const TONE: Record<string, { bar: string; top: string; bottom: string; hover: string }> = {
  overdue: { bar: 'bg-red-400', top: 'text-red-600', bottom: 'text-red-400', hover: 'hover:bg-red-50/50' },
  today: { bar: 'bg-indigo-500', top: 'text-indigo-600', bottom: 'text-indigo-400', hover: 'hover:bg-indigo-50/50' },
  soon: { bar: 'bg-amber-400', top: 'text-amber-600', bottom: 'text-amber-400', hover: 'hover:bg-amber-50/40' },
  later: { bar: 'bg-gray-200', top: 'text-gray-600', bottom: 'text-gray-400', hover: 'hover:bg-gray-50' },
}

export default function TodayTasks({ tasks, onTaskClick, onTaskUpdate, onManageAll }: TodayTasksProps) {
  const { busyIds, complete, undoComplete } = useTaskStatus(tasks, onTaskUpdate)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const todayStr = useMemo(() => getTodayStr(), [])

  // 父任务 id → 子任务列表（子任务通过 parent_ids 指向父）
  const childMap = useMemo(() => {
    const map: Record<string, Task[]> = {}
    tasks.forEach(t => (t.parent_ids || []).forEach(pid => {
      ;(map[pid] ||= []).push(t)
    }))
    return map
  }, [tasks])

  const toggleExpand = (id: string) =>
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const { pending, doneToday } = useMemo(() => {
    const main = tasks.filter(t => !t.parent_ids?.length)
    const pend = main.filter(task => {
      if (task.status === '进行中' || task.status === '已逾期') return true
      if (task.status === '待开始') {
        const start = task.start_date || ''
        const deadline = task.deadline || ''
        return (!start || start <= todayStr) && (!deadline || deadline >= todayStr)
      }
      return false
    })
    pend.sort((a, b) => {
      const oa = a.status === '已逾期' || (a.deadline && a.deadline < todayStr) ? 0 : 1
      const ob = b.status === '已逾期' || (b.deadline && b.deadline < todayStr) ? 0 : 1
      if (oa !== ob) return oa - ob
      const da = a.deadline || '9999-12-31'
      const db = b.deadline || '9999-12-31'
      if (da !== db) return da.localeCompare(db)
      return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)
    })
    const done = main
      .filter(t => t.status === '已完成' && toBeijingDateStr(t.completed_time) === todayStr)
      .sort((a, b) => (b.completed_time || '').localeCompare(a.completed_time || ''))
    return { pending: pend.slice(0, 15), doneToday: done }
  }, [tasks, todayStr])

  const handleComplete = async (task: Task, e: React.MouseEvent) => {
    const ok = await complete(task)
    if (ok) celebrate(e.currentTarget as HTMLElement)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-indigo-600" />
          今日待办
        </h3>
        <div className="flex items-center gap-3">
          {onManageAll && (
            <button onClick={onManageAll} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium">
              管理全部 <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {pending.length === 0 && doneToday.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">今天没有待办任务 🎉</p>
            <p className="text-xs text-gray-400 mt-1">去创建新任务或查看待开始任务</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {pending.map(task => {
              const t = timeInfo(task, todayStr)
              const tone = TONE[t.tone]
              const busy = busyIds.has(task.id)
              const children = childMap[task.id] || []
              const hasChildren = children.length > 0
              const doneCount = children.filter(c => c.status === '已完成').length
              const allDone = hasChildren && doneCount === children.length
              const expanded = expandedIds.has(task.id)

              return (
                <div key={task.id}>
                  {/* 父任务行 */}
                  <div
                    onClick={() => onTaskClick(task)}
                    className={`group flex items-stretch gap-3 px-5 py-3 cursor-pointer transition-colors ${tone.hover}`}
                  >
                    {/* 时间轨 */}
                    <div className="w-14 flex-shrink-0 flex flex-col items-start justify-center">
                      <span className={`text-[13px] font-bold leading-tight ${tone.top}`}>{t.top}</span>
                      {t.bottom && <span className={`text-[11px] ${tone.bottom}`}>{t.bottom}</span>}
                    </div>
                    {/* 色条 */}
                    <div className={`w-[3px] self-stretch rounded-full flex-shrink-0 my-0.5 ${tone.bar}`} />
                    {/* 内容 */}
                    <div className="flex-1 min-w-0 py-0.5">
                      <div className="flex items-center gap-1.5">
                        {hasChildren && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleExpand(task.id) }}
                            className="flex-shrink-0 -ml-1 p-0.5 text-gray-400 hover:text-gray-600"
                            title={expanded ? '收起子任务' : '展开子任务'}
                          >
                            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                          </button>
                        )}
                        <span className="text-[13.5px] font-semibold text-gray-900 truncate">{task.name}</span>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded flex-shrink-0">
                          {priorityCode(task.priority)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {task.task_type && task.task_type !== '未分类' && (
                          <span className="text-[11px] text-gray-400 truncate">{task.task_type}</span>
                        )}
                        {hasChildren && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleExpand(task.id) }}
                            className="inline-flex items-center gap-1 text-[10.5px] font-medium text-indigo-600 bg-indigo-50 rounded px-1.5 py-0.5 flex-shrink-0"
                          >
                            子任务
                            <span className="inline-flex gap-0.5">
                              {children.slice(0, 6).map(c => (
                                <span key={c.id} className={`w-1.5 h-1.5 rounded-full ${c.status === '已完成' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                              ))}
                            </span>
                            {doneCount}/{children.length}
                          </button>
                        )}
                      </div>
                    </div>
                    {/* 完成按钮：有未完成子任务时置灰带锁 */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleComplete(task, e) }}
                      disabled={busy}
                      title={hasChildren && !allDone ? `还有 ${children.length - doneCount} 个子任务未完成` : '标记完成'}
                      className={`self-center w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all disabled:opacity-50 flex-shrink-0 ${
                        hasChildren && !allDone
                          ? 'border-gray-200 bg-gray-50 text-gray-300'
                          : 'border-gray-300 text-transparent hover:border-green-500 hover:bg-green-50 hover:text-green-500'
                      }`}
                    >
                      {busy
                        ? <Loader2 className="w-3 h-3 text-green-500 animate-spin" />
                        : hasChildren && !allDone
                          ? <Lock className="w-3 h-3" />
                          : <Check className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* 展开的子任务 */}
                  {expanded && children.map(child => {
                    const cBusy = busyIds.has(child.id)
                    const cDone = child.status === '已完成'
                    const cOverdue = !cDone && (child.status === '已逾期' || (!!child.deadline && child.deadline < todayStr))
                    return (
                      <div
                        key={child.id}
                        onClick={() => onTaskClick(child)}
                        className="flex items-center gap-2.5 pl-[86px] pr-5 py-1.5 bg-gray-50/70 cursor-pointer hover:bg-gray-100/70 transition-colors"
                      >
                        {cDone ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); undoComplete(child) }}
                            disabled={cBusy}
                            title="撤销完成"
                            className="w-4 h-4 rounded border-2 border-emerald-500 bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 disabled:opacity-50"
                          >
                            {cBusy ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Check className="w-2.5 h-2.5" />}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleComplete(child, e) }}
                            disabled={cBusy}
                            title="标记完成"
                            className="w-4 h-4 rounded border-2 border-gray-300 bg-white hover:border-emerald-500 flex items-center justify-center flex-shrink-0 disabled:opacity-50"
                          >
                            {cBusy && <Loader2 className="w-2.5 h-2.5 text-emerald-500 animate-spin" />}
                          </button>
                        )}
                        <span className={`flex-1 text-[12.5px] truncate ${cDone ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                          {child.name}
                        </span>
                        {child.deadline && (
                          <span className={`text-[10.5px] flex-shrink-0 ${cOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                            {fmtMD(child.deadline)}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {doneToday.map(task => {
              const busy = busyIds.has(task.id)
              return (
                <div
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className="group flex items-stretch gap-3 px-5 py-2.5 cursor-pointer opacity-60 hover:opacity-90 transition-opacity"
                >
                  <div className="w-14 flex-shrink-0 flex flex-col items-start justify-center">
                    <span className="text-[11px] text-green-500 font-medium">已完成</span>
                  </div>
                  <div className="w-[3px] self-stretch rounded-full flex-shrink-0 my-0.5 bg-green-300" />
                  <div className="flex-1 min-w-0 py-0.5">
                    <span className="text-[13px] text-gray-400 line-through truncate block">{task.name}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); undoComplete(task) }}
                    disabled={busy}
                    title="撤销完成"
                    className="self-center w-5 h-5 rounded-md border border-green-200 flex items-center justify-center text-green-500 hover:bg-green-50 transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

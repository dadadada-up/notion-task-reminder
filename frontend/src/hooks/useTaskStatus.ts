import { useState, useCallback, useRef } from 'react'
import { Task } from '../types'
import { updateTask } from '../api'
import { useToast } from '../components/ui/Toast'

/**
 * 任务状态变更共享逻辑：乐观更新 + 失败回滚 + Toast 反馈 + 子任务拦截。
 * dashboard 微看板与 /tasks 看板共用，保证行为一致。
 */
export function useTaskStatus(
  tasks: Task[],
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void
) {
  const toast = useToast()
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  // 记录完成前的原始状态，撤销时精确恢复
  const prevStatusRef = useRef<Record<string, Task['status']>>({})

  const setBusy = (id: string, v: boolean) =>
    setBusyIds(prev => {
      const next = new Set(prev)
      if (v) next.add(id)
      else next.delete(id)
      return next
    })

  const changeStatus = useCallback(
    async (task: Task, toStatus: Task['status']): Promise<boolean> => {
      if (task.status === toStatus) return false

      // 完成父任务前，拦截未完成子任务
      if (toStatus === '已完成' && task.child_ids && task.child_ids.length > 0) {
        const children = tasks.filter(t => task.child_ids.includes(t.id))
        if (children.some(c => c.status !== '已完成')) {
          toast.warning('请先完成所有子任务', '完成全部子任务后再完成父任务')
          return false
        }
      }

      const fromStatus = task.status
      const updates: Partial<Task> = { status: toStatus }
      if (toStatus === '已完成') {
        updates.completed_time = new Date().toISOString()
        prevStatusRef.current[task.id] = fromStatus
      } else if (fromStatus === '已完成') {
        updates.completed_time = undefined
      }

      // 乐观更新
      onTaskUpdate?.(task.id, updates)
      setBusy(task.id, true)
      try {
        await updateTask(task.id, updates)
        return true
      } catch (error) {
        console.error('Failed to update task status:', error)
        // 回滚
        onTaskUpdate?.(task.id, { status: fromStatus, completed_time: task.completed_time })
        toast.error('更新任务状态失败', '请重试')
        return false
      } finally {
        setBusy(task.id, false)
      }
    },
    [tasks, onTaskUpdate, toast]
  )

  const complete = useCallback(
    (task: Task) => changeStatus(task, '已完成'),
    [changeStatus]
  )

  const undoComplete = useCallback(
    (task: Task) => changeStatus(task, prevStatusRef.current[task.id] || '进行中'),
    [changeStatus]
  )

  return { busyIds, changeStatus, complete, undoComplete }
}

import { useMemo } from 'react'
import { Task } from '../../types'
import { getTodayStr, toBeijingDateStr } from '../../utils/dateFormat'

interface StatsOverviewProps {
  tasks: Task[]
  /** 点击 KPI 下钻到 /tasks 对应状态 */
  onDrillStatus?: (status: string) => void
}

export default function StatsOverview({ tasks, onDrillStatus }: StatsOverviewProps) {
  const { inProgress, completedThisWeek, overdue, todayDone, todayTotal } = useMemo(() => {
    const main = tasks.filter(t => !t.parent_ids?.length)
    const todayStr = getTodayStr()

    // 以北京时间今天为基准，用 UTC 纯日期运算推算本周区间（仅比较日期，不受时区影响）
    const base = new Date(todayStr + 'T00:00:00Z')
    const dow = base.getUTCDay() || 7
    const weekStart = new Date(base)
    weekStart.setUTCDate(base.getUTCDate() - dow + 1)
    const weekEnd = new Date(weekStart)
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6)
    const weekStartStr = weekStart.toISOString().split('T')[0]
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    const inProgress = main.filter(t => t.status === '进行中').length
    const completedThisWeek = main.filter(t => {
      const cd = toBeijingDateStr(t.completed_time)
      return t.status === '已完成' && cd !== '' && cd >= weekStartStr && cd <= weekEndStr
    }).length
    const overdue = main.filter(t =>
      t.status === '已逾期' ||
      (t.status !== '已完成' && t.status !== '已放弃' && t.deadline && t.deadline < todayStr)
    ).length

    // 今日完成 / 今日总量
    const todayDone = main.filter(t =>
      t.status === '已完成' && toBeijingDateStr(t.completed_time) === todayStr
    ).length
    const todayPending = main.filter(t => {
      if (t.status === '进行中' || t.status === '已逾期') return true
      if (t.status === '待开始') {
        const start = t.start_date || ''
        const deadline = t.deadline || ''
        return (!start || start <= todayStr) && (!deadline || deadline >= todayStr)
      }
      return false
    }).length
    return { inProgress, completedThisWeek, overdue, todayDone, todayTotal: todayDone + todayPending }
  }, [tasks])

  const greet = useMemo(() => {
    const h = new Date().getHours()
    if (h < 6) return '夜深了'
    if (h < 12) return '早上好'
    if (h < 18) return '下午好'
    return '晚上好'
  }, [])

  const dateStr = useMemo(() => {
    const now = new Date()
    const wd = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()]
    return `${wd} · ${now.getMonth() + 1}月${now.getDate()}日`
  }, [])

  const pct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0

  const kpis = [
    { label: '进行中', value: inProgress, status: '进行中', color: 'text-white' },
    { label: '已逾期', value: overdue, status: '已逾期', color: overdue > 0 ? 'text-amber-300' : 'text-white/70' },
    { label: '本周完成', value: completedThisWeek, status: '已完成', color: 'text-emerald-200' },
  ]

  return (
    <div className="rounded-2xl p-5 sm:p-6 text-white shadow-lg shadow-indigo-500/20 bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 flex items-center justify-between gap-4 flex-wrap">
      {/* 左：问候 + 日期 */}
      <div className="min-w-[180px]">
        <div className="text-xl sm:text-2xl font-bold">{greet}，dada 👋</div>
        <div className="text-sm text-white/80 mt-1">{dateStr}</div>
        {overdue > 0 && (
          <div className="text-xs text-amber-200 mt-2 bg-white/10 rounded-lg px-2.5 py-1 inline-block">
            ⚠ 今天有 {overdue} 个逾期需优先处理
          </div>
        )}
      </div>

      {/* 中：可点击 KPI */}
      <div className="flex items-center gap-2 sm:gap-5 flex-1 justify-center">
        {kpis.map(k => (
          <button
            key={k.label}
            onClick={() => onDrillStatus?.(k.status)}
            className="group text-center px-2 sm:px-3 rounded-xl transition-colors hover:bg-white/10"
            title={`查看「${k.label}」任务`}
          >
            <div className={`text-2xl sm:text-3xl font-extrabold leading-none ${k.color}`}>{k.value}</div>
            <div className="text-[11px] text-white/70 mt-1.5 flex items-center gap-1 justify-center">
              {k.label}
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px]">↗</span>
            </div>
          </button>
        ))}
      </div>

      {/* 右：今日完成进度环 */}
      <div className="flex items-center gap-3">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center relative"
          style={{ background: `conic-gradient(#34d399 0 ${pct}%, rgba(255,255,255,.25) ${pct}% 100%)` }}
        >
          <div className="absolute inset-[6px] rounded-full bg-indigo-600 flex items-center justify-center">
            <span className="text-sm font-bold">{pct}%</span>
          </div>
        </div>
        <div className="text-xs text-white/80 leading-tight">
          <div className="font-semibold text-white">今日进度</div>
          <div>{todayDone} / {todayTotal}</div>
        </div>
      </div>
    </div>
  )
}

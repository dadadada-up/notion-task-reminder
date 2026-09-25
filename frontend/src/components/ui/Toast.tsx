import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, X, XCircle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning'

interface ToastItem {
  id: number
  type: ToastType
  title: string
  message?: string
}

interface ToastApi {
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastApi | undefined>(undefined)

/** 非阻塞通知：toast.success('保存成功') / toast.error('保存失败', '请重试') */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast 必须在 <ToastProvider> 内使用')
  return ctx
}

const TOAST_STYLES: Record<ToastType, { icon: ReactNode; badge: string; bar: string }> = {
  success: { icon: <CheckCircle2 className="w-4 h-4" />, badge: 'bg-emerald-100 text-emerald-600', bar: 'bg-emerald-500' },
  error: { icon: <XCircle className="w-4 h-4" />, badge: 'bg-red-100 text-red-600', bar: 'bg-red-500' },
  warning: { icon: <AlertTriangle className="w-4 h-4" />, badge: 'bg-amber-100 text-amber-600', bar: 'bg-amber-500' },
}

const EXIT_DURATION = 220

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const [leaving, setLeaving] = useState(false)
  const style = TOAST_STYLES[item.type]

  // 进度条动画结束（或手动关闭）后播退场动画再卸载；悬停卡片会暂停进度条
  const close = () => {
    if (leaving) return
    setLeaving(true)
    window.setTimeout(onClose, EXIT_DURATION)
  }

  return (
    <div
      className={`relative overflow-hidden flex items-start gap-3 rounded-2xl border border-black/5 bg-white/90 backdrop-blur-xl p-3.5 shadow-[0_14px_36px_-8px_rgba(0,0,0,0.2)] group ${
        leaving ? 'animate-toast-out' : 'animate-toast-in'
      }`}
    >
      <div className={`w-[34px] h-[34px] rounded-xl flex items-center justify-center shrink-0 ${style.badge}`}>{style.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-semibold text-gray-900 leading-snug">{item.title}</p>
        {item.message && <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{item.message}</p>}
      </div>
      <button type="button" onClick={close} className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
      <span
        className={`absolute left-0 bottom-0 h-[2.5px] w-full origin-left opacity-85 group-hover:[animation-play-state:paused] ${style.bar} ${
          leaving ? '' : 'animate-toast-bar'
        }`}
        onAnimationEnd={close}
      />
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const push = useCallback((type: ToastType, title: string, message?: string) => {
    const id = ++idRef.current
    // 新通知插入顶部，最多同时显示 3 条
    setItems(prev => [{ id, type, title, message }, ...prev].slice(0, 3))
  }, [])

  const dismiss = useCallback((id: number) => {
    setItems(prev => prev.filter(t => t.id !== id))
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      success: (title, message) => push('success', title, message),
      error: (title, message) => push('error', title, message),
      warning: (title, message) => push('warning', title, message),
    }),
    [push]
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2.5 w-[min(430px,calc(100vw-32px))] pointer-events-none">
        {items.map(t => (
          <div key={t.id} className="w-full pointer-events-auto">
            <ToastCard item={t} onClose={() => dismiss(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

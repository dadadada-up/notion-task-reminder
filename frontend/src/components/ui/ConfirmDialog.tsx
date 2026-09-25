import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Check, CheckCircle2, PauseCircle, Trash2 } from 'lucide-react'

export type DialogType = 'info' | 'danger' | 'warning' | 'success'

export interface ConfirmOptions {
  /** 弹窗标题 */
  title: string
  /** 描述文案，支持富文本节点 */
  message?: ReactNode
  /** 语义类型，决定图标与确认按钮配色，默认 info（品牌紫） */
  type?: DialogType
  /** 覆盖默认语义图标 */
  icon?: ReactNode
  confirmText?: string
  cancelText?: string
}

export interface PromptOptions {
  title: string
  message?: ReactNode
  placeholder?: string
  initial?: string
  confirmText?: string
  cancelText?: string
}

interface DialogState {
  mode: 'confirm' | 'prompt'
  type: DialogType
  title: string
  message?: ReactNode
  icon: ReactNode
  confirmText: string
  cancelText: string
  placeholder?: string
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>
type PromptFn = (options: PromptOptions) => Promise<string | null>

interface DialogApi {
  confirm: ConfirmFn
  promptText: PromptFn
}

const DialogContext = createContext<DialogApi | undefined>(undefined)

/** Promise 化确认弹窗：const ok = await confirm({ title: '删除任务', type: 'danger' }) */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useConfirm 必须在 <DialogProvider> 内使用')
  return ctx.confirm
}

/** Promise 化输入弹窗（替代 window.prompt）：const name = await promptText({ title: '添加习惯项' })，取消返回 null */
export function usePromptText(): PromptFn {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('usePromptText 必须在 <DialogProvider> 内使用')
  return ctx.promptText
}

const TYPE_STYLES: Record<DialogType, { badge: string; button: string }> = {
  info: {
    badge: 'bg-primary-100 text-primary-600',
    button: 'bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-600/30',
  },
  danger: {
    badge: 'bg-red-100 text-red-600',
    button: 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30',
  },
  warning: {
    badge: 'bg-amber-100 text-amber-600',
    button: 'bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-600/30',
  },
  success: {
    badge: 'bg-emerald-100 text-emerald-600',
    button: 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/30',
  },
}

const DEFAULT_ICONS: Record<DialogType, ReactNode> = {
  info: <Check className="w-6 h-6" strokeWidth={2.6} />,
  danger: <Trash2 className="w-6 h-6" />,
  warning: <PauseCircle className="w-6 h-6" />,
  success: <CheckCircle2 className="w-6 h-6" />,
}

const EXIT_DURATION = 170

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [closing, setClosing] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const resolveRef = useRef<((value: any) => void) | null>(null)
  const closingRef = useRef(false)
  const modeRef = useRef<'confirm' | 'prompt'>('confirm')
  const inputRef = useRef('')
  const confirmBtnRef = useRef<HTMLButtonElement>(null)
  const inputElRef = useRef<HTMLInputElement>(null)

  /** 播放退场动画后结算 Promise；prompt 模式确认时返回输入值 */
  const settle = useCallback((value: boolean) => {
    if (!resolveRef.current || closingRef.current) return
    closingRef.current = true
    setClosing(true)
    window.setTimeout(() => {
      const resolve = resolveRef.current
      resolveRef.current = null
      if (modeRef.current === 'prompt') {
        resolve?.(value ? inputRef.current.trim() || null : null)
      } else {
        resolve?.(value)
      }
      setDialog(null)
      setClosing(false)
    }, EXIT_DURATION)
  }, [])

  const confirm = useCallback<ConfirmFn>(options => {
    return new Promise(resolve => {
      const type = options.type ?? 'info'
      modeRef.current = 'confirm'
      resolveRef.current = resolve
      setDialog({
        mode: 'confirm',
        type,
        title: options.title,
        message: options.message,
        icon: options.icon ?? DEFAULT_ICONS[type],
        confirmText: options.confirmText ?? '确定',
        cancelText: options.cancelText ?? '取消',
      })
    })
  }, [])

  const promptText = useCallback<PromptFn>(options => {
    return new Promise(resolve => {
      modeRef.current = 'prompt'
      resolveRef.current = resolve
      inputRef.current = options.initial ?? ''
      setInputValue(options.initial ?? '')
      setDialog({
        mode: 'prompt',
        type: 'info',
        title: options.title,
        message: options.message,
        icon: DEFAULT_ICONS.info,
        confirmText: options.confirmText ?? '确定',
        cancelText: options.cancelText ?? '取消',
        placeholder: options.placeholder ?? '',
      })
    })
  }, [])

  const api = useMemo<DialogApi>(() => ({ confirm, promptText }), [confirm, promptText])

  // 键盘可达（Esc 取消 / Enter 确认）+ 打开期间锁定页面滚动 + 自动聚焦
  useEffect(() => {
    if (!dialog) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') settle(false)
      if (e.key === 'Enter') {
        e.preventDefault()
        settle(true)
      }
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    if (dialog.mode === 'prompt') {
      inputElRef.current?.focus()
    } else {
      confirmBtnRef.current?.focus()
    }
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [dialog, settle])

  return (
    <DialogContext.Provider value={api}>
      {children}
      {dialog && (
        <div
          className={`fixed inset-0 z-[100] flex items-center justify-center p-5 bg-slate-900/45 backdrop-blur-[7px] ${
            closing ? 'animate-overlay-out' : 'animate-overlay-in'
          }`}
          onMouseDown={e => {
            if (e.target === e.currentTarget) settle(false)
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label={dialog.title}
            className={`w-full max-w-[400px] rounded-3xl bg-white/95 backdrop-blur-xl px-7 pt-8 pb-6 text-center shadow-[0_32px_64px_-16px_rgba(0,0,0,0.32)] ${
              closing ? 'animate-dialog-out' : 'animate-dialog-in'
            }`}
          >
            <div className={`mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center ${TYPE_STYLES[dialog.type].badge}`}>
              {dialog.icon}
            </div>
            <h3 className="text-[17px] font-bold text-gray-900 tracking-tight">{dialog.title}</h3>
            {dialog.message && (
              <p className="mt-2 text-sm leading-relaxed text-gray-500 [&>b]:text-gray-900 [&>b]:font-semibold">{dialog.message}</p>
            )}
            {dialog.mode === 'prompt' && (
              <input
                ref={inputElRef}
                value={inputValue}
                onChange={e => {
                  setInputValue(e.target.value)
                  inputRef.current = e.target.value
                }}
                placeholder={dialog.placeholder}
                maxLength={50}
                className="mt-4 w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50/60 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 focus:bg-white transition-all"
              />
            )}
            <div className="flex gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => settle(false)}
                className="flex-1 h-11 rounded-[13px] text-[15px] font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-[0.96] transition-all duration-150"
              >
                {dialog.cancelText}
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                onClick={() => settle(true)}
                className={`flex-1 h-11 rounded-[13px] text-[15px] font-semibold text-white hover:-translate-y-px active:scale-[0.96] transition-all duration-150 ${TYPE_STYLES[dialog.type].button}`}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  )
}

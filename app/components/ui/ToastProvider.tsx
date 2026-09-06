"use client"

import {
  CircleAlert,
  CircleCheck,
  Info,
  X,
} from "lucide-react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type { TenantId } from "@/app/lib/tenant"

type ToastVariant = "success" | "error" | "info"

type Toast = {
  id: number
  title: string
  description?: string
  variant: ToastVariant
}

type ToastInput = Omit<Toast, "id"> & { duration?: number }

type ToastContextValue = {
  toast: (input: ToastInput) => void
  dismissToast: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TOAST_STYLE: Record<ToastVariant, { icon: typeof CircleCheck; className: string; iconClassName: string }> = {
  success: { icon: CircleCheck, className: "border-success/50 bg-surface/95", iconClassName: "text-success" },
  error: { icon: CircleAlert, className: "border-danger/50 bg-surface/95", iconClassName: "text-danger" },
  info: { icon: Info, className: "border-accent/50 bg-surface/95", iconClassName: "text-accent" },
}

export function ToastProvider({ children, theme }: { children: ReactNode; theme: TenantId }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismissToast = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const toast = useCallback((input: ToastInput) => {
    const id = nextId.current++
    setToasts((current) => [...current, { ...input, id }].slice(-4))
    const duration = input.duration ?? (input.variant === "error" ? 8000 : 5000)
    timers.current.set(id, setTimeout(() => dismissToast(id), duration))
  }, [dismissToast])

  useEffect(() => () => {
    timers.current.forEach((timer) => clearTimeout(timer))
    timers.current.clear()
  }, [])

  return (
    <ToastContext.Provider value={{ toast, dismissToast }}>
      {children}
      <div
        data-theme={theme}
        aria-label="Meddelanden"
        className="pointer-events-none fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[80] flex flex-col items-end gap-2 sm:left-auto sm:bottom-5 sm:right-5 sm:w-96"
      >
        {toasts.map((item) => {
          const style = TOAST_STYLE[item.variant]
          const Icon = style.icon
          return (
            <section
              key={item.id}
              role={item.variant === "error" ? "alert" : "status"}
              aria-live={item.variant === "error" ? "assertive" : "polite"}
              className={`pointer-events-auto flex w-full items-center gap-2.5 rounded-lg border px-3.5 py-3 shadow-lg backdrop-blur-sm ${style.className}`}
            >
              <Icon size={18} className={`shrink-0 ${style.iconClassName}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text">{item.title}</p>
                {item.description ? <p className="mt-0.5 text-sm text-text-muted">{item.description}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(item.id)}
                className="-mr-2 -my-2 flex size-9 shrink-0 items-center justify-center rounded-md text-text-faint transition-colors hover:bg-surface-2 hover:text-text"
                aria-label="Stäng meddelande"
              >
                <X size={16} />
              </button>
            </section>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error("useToast måste användas inom ToastProvider.")
  return context
}

import { useCallback, useEffect, useRef, useState } from "react"

/** Boolean open/close state that closes itself on outside click or Escape. */
export function useDismissableOpen<T extends HTMLElement>(options?: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Replaces the default close; told whether Escape or a press outside dismissed it. */
  onDismiss?: (reason: "escape" | "outside") => void
}) {
  const [openState, setOpenState] = useState(false)
  const open = options?.open ?? openState
  const onOpenChange = options?.onOpenChange
  const onDismiss = options?.onDismiss
  const ref = useRef<T>(null)
  const setOpen = useCallback((next: boolean | ((current: boolean) => boolean)) => {
    const nextOpen = typeof next === "function" ? next(open) : next
    setOpenState(nextOpen)
    onOpenChange?.(nextOpen)
  }, [open, onOpenChange])

  // The latest onDismiss, so an inline function does not re-attach the listeners on every render.
  const onDismissRef = useRef(onDismiss)
  useEffect(() => {
    onDismissRef.current = onDismiss
  })

  useEffect(() => {
    if (!open) return
    const dismiss = (reason: "escape" | "outside") =>
      onDismissRef.current ? onDismissRef.current(reason) : setOpen(false)
    const onClickOutside = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) dismiss("outside")
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss("escape")
    }
    document.addEventListener("mousedown", onClickOutside)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onClickOutside)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open, setOpen])

  return { open, setOpen, ref }
}

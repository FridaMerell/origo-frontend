import { useCallback, useEffect, useRef, useState } from "react"

/** Boolean open/close state that closes itself on outside click or Escape. */
export function useDismissableOpen<T extends HTMLElement>(options?: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onDismiss?: () => void
}) {
  const [openState, setOpenState] = useState(false)
  const open = options?.open ?? openState
  const ref = useRef<T>(null)
  const setOpen = useCallback((nextOpen: boolean) => {
    setOpenState(nextOpen)
    options?.onOpenChange?.(nextOpen)
  }, [options?.onOpenChange])

  useEffect(() => {
    if (!open) return
    const dismiss = options?.onDismiss ?? (() => setOpen(false))
    const onClickOutside = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) dismiss()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss()
    }
    document.addEventListener("mousedown", onClickOutside)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onClickOutside)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open, options?.onDismiss, setOpen])

  return { open, setOpen, ref }
}

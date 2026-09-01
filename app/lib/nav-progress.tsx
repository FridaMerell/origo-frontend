"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

const ReportContext = createContext<(delta: number) => void>(() => {})
const ActiveContext = createContext(false)

export function useNavProgressReport() {
  return useContext(ReportContext)
}

/**
 * Tracks how many `<AppLink>`s are currently mid-navigation. Lives at the root
 * so every AppLink can reach it; the visible bar is rendered separately, inside
 * each tenant's `data-theme` wrapper, so `--accent` resolves.
 */
export function NavProgressProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false)
  const pending = useRef(0)

  const report = useCallback((delta: number) => {
    pending.current = Math.max(0, pending.current + delta)
    setActive(pending.current > 0)
  }, [])

  return (
    <ReportContext.Provider value={report}>
      <ActiveContext.Provider value={active}>{children}</ActiveContext.Provider>
    </ReportContext.Provider>
  )
}

export function NavProgressBar() {
  const active = useContext(ActiveContext)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (!active) return
    // Small delay so instant navigations don't flash the bar.
    const timer = setTimeout(() => setShown(true), 120)
    return () => {
      clearTimeout(timer)
      setShown(false)
    }
  }, [active])

  if (!active || !shown) return null

  return (
    <div
      data-nav-progress
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-0.5 overflow-hidden"
    >
      <div
        className="h-full w-1/3 bg-accent"
        style={{ animation: "nav-progress-slide 1s ease-in-out infinite" }}
      />
    </div>
  )
}

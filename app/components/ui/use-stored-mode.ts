import { useSyncExternalStore } from "react"

export type ColorMode = "light" | "dark"

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener("storage", listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}

function readMode(key: string): ColorMode | null {
  const stored = localStorage.getItem(key)
  return stored === "dark" || stored === "light" ? stored : null
}

// The mode is also kept in a cookie of the same name, so the server can render
// the page in it and the first paint never shows the system's mode instead.
function writeCookie(key: string, mode: ColorMode) {
  document.cookie = `${key}=${mode}; path=/; max-age=31536000; samesite=lax`
}

/**
 * An app's light/dark mode, kept in localStorage and a cookie under `key`.
 * `initial` is the mode the server read from that cookie; the server and the
 * first client render use it (or `fallback` without one), so they agree and
 * nothing flashes. After that the stored mode, or `fallback` when none is stored. Setting it stores it and
 * updates every user of the key.
 */
export function useStoredMode(key: string, fallback: ColorMode | null = null, initial: ColorMode | null = null) {
  const mode = useSyncExternalStore(
    (listener) => {
      // A mode stored before the cookie existed is copied into it once.
      const stored = readMode(key)
      if (stored && stored !== initial) writeCookie(key, stored)
      return subscribe(listener)
    },
    () => readMode(key) ?? initial ?? fallback,
    () => initial ?? fallback,
  )
  const setMode = (next: ColorMode) => {
    localStorage.setItem(key, next)
    writeCookie(key, next)
    listeners.forEach((listener) => listener())
  }
  return [mode, setMode] as const
}

import { useEffect } from "react"
import { useStored } from "@/app/lib/use-stored"

export type ColorMode = "light" | "dark"

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
  const [stored, store] = useStored(key)
  const storedMode: ColorMode | null = stored === "dark" || stored === "light" ? stored : null

  // A mode stored before the cookie existed is copied into it.
  useEffect(() => {
    if (storedMode && storedMode !== initial) writeCookie(key, storedMode)
  }, [key, storedMode, initial])

  const setMode = (next: ColorMode) => {
    store(next)
    writeCookie(key, next)
  }
  return [storedMode ?? initial ?? fallback, setMode] as const
}

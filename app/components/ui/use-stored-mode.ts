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

/**
 * An app's light/dark mode, kept in localStorage under `key`. The server and
 * the first client render see null; after that the stored mode, or `fallback`
 * when none is stored. Setting it stores it and updates every user of the key.
 */
export function useStoredMode(key: string, fallback: ColorMode | null = null) {
  const mode = useSyncExternalStore(
    subscribe,
    () => readMode(key) ?? fallback,
    () => null,
  )
  const setMode = (next: ColorMode) => {
    localStorage.setItem(key, next)
    listeners.forEach((listener) => listener())
  }
  return [mode, setMode] as const
}

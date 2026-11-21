import { useSyncExternalStore } from "react"

// "Håll tid och plats uppdaterad" is remembered per device in localStorage, read
// through useSyncExternalStore: the server and the first client render see it off,
// and every quick observation and menu updates when it changes (here or in another tab).
const KEY = "tempus:quick-observation-keep-current"
const listeners = new Set<() => void>()

function read() {
  try {
    return window.localStorage.getItem(KEY) === "1"
  } catch {
    return false
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener("storage", listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}

/** Saves the choice; returns why the browser would not store it, or null when it did. */
function store(next: boolean) {
  try {
    if (next) window.localStorage.setItem(KEY, "1")
    else window.localStorage.removeItem(KEY)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return `Inställningen kunde inte sparas i webbläsaren (${reason}).`
  }
  listeners.forEach((listener) => listener())
  return null
}

/** Whether the quick observation fetches the current time and position at every save. */
export function useKeepTimeAndPlaceCurrent() {
  const value = useSyncExternalStore(subscribe, read, () => false)
  return [value, store] as const
}

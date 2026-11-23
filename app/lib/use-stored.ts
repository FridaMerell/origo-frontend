import { useSyncExternalStore } from "react"

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener("storage", listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}

// Browsers that refuse storage (e.g. Safari in private mode): the value is kept here and
// then only lasts until the page is reloaded.
const memory = new Map<string, string | null>()

/** The stored text under `key`, or null. Safe outside the browser and where storage is refused. */
export function readStored(key: string): string | null {
  try {
    const stored = localStorage.getItem(key)
    if (stored !== null) return stored
  } catch {}
  return memory.get(key) ?? null
}

/**
 * Stores `value` under `key` (null removes it) and updates every useStored of that key.
 * Returns why the browser would not keep it, or null when it did.
 */
export function writeStored(key: string, value: string | null): string | null {
  memory.set(key, value)
  let refused: string | null = null
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch (error) {
    refused = error instanceof Error ? error.message : String(error)
  }
  for (const listener of listeners) listener()
  return refused
}

/**
 * A text value in the browser's localStorage, shared by every component using the same key
 * and updated from other tabs. It is null during the server render and the first client
 * render, so the page matches what the server sent.
 */
export function useStored(key: string): [string | null, (value: string | null) => string | null] {
  const value = useSyncExternalStore(
    subscribe,
    () => readStored(key),
    () => null,
  )
  return [value, (next) => writeStored(key, next)]
}

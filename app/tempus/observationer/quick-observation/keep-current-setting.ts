import { useStored } from "@/app/lib/use-stored"

// "Håll tid och plats uppdaterad" is remembered per device in localStorage: the server
// and the first client render see it off, and every quick observation and menu updates
// when it changes (here or in another tab).
const KEY = "tempus:quick-observation-keep-current"

/** Whether the quick observation fetches the current time and position at every save. */
export function useKeepTimeAndPlaceCurrent() {
  const [stored, store] = useStored(KEY)
  /** Saves the choice; returns why the browser would not store it, or null when it did. */
  const setKeepCurrent = (next: boolean) => {
    const refused = store(next ? "1" : null)
    return refused ? `Inställningen kunde inte sparas i webbläsaren (${refused}).` : null
  }
  return [stored === "1", setKeepCurrent] as const
}

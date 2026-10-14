"use client"

import { usePushNotifications } from "@/app/lib/use-push-notifications"

/**
 * Turning this app's push notifications on, testing them and turning them off, as plain buttons
 * in the app's own style: `item` is each button's classes and `note` those of the explanations
 * and results. The parent lays them out. Renders nothing where the browser has no push.
 */
export function PushControls({ item, note }: { item: string; note: string }) {
  const { state, message, enable, disable, test } = usePushNotifications()

  if (state === "loading" || state === "unsupported") return null

  return (
    <>
      {state === "ios-install" ? (
        <p className={note}>Lägg till appen på hemskärmen för att få pushnotiser på iOS.</p>
      ) : state === "no-worker" ? (
        <p className={note}>Pushnotiser går inte att slå på här: webbläsaren tillåter inte sidans service worker.</p>
      ) : state === "denied" ? (
        <p className={note}>Pushnotiser är blockerade. Tillåt notiser för sidan i webbläsarinställningarna.</p>
      ) : state === "on" ? (
        <>
          <button type="button" onClick={() => void test()} className={item}>
            Skicka testnotis
          </button>
          <button type="button" onClick={() => void disable()} className={item}>
            Stäng av pushnotiser
          </button>
        </>
      ) : (
        <button type="button" onClick={() => void enable()} disabled={state === "busy"} className={item}>
          {state === "busy" ? "Aktiverar …" : "Slå på pushnotiser"}
        </button>
      )}
      {message && <p className={note}>{message}</p>}
    </>
  )
}

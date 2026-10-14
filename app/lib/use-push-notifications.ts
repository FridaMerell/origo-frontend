"use client"

import { useEffect, useState } from "react"
import { removePushSubscription, savePushSubscription, sendTestPush } from "@/app/actions/push"
import {
  currentTenant,
  isIOS,
  isPushSupported,
  isStandalone,
  registerServiceWorker,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/app/lib/push-client"

export type PushState =
  | "loading"
  | "unsupported"
  | "no-worker"
  | "ios-install"
  | "denied"
  | "off"
  | "on"
  | "busy"

// `navigator.serviceWorker.ready` never settles without a registered worker, which would leave
// the controls loading forever, so register it here if ServiceWorkerRegistrar has not.
async function workerRegistration() {
  return (await navigator.serviceWorker.getRegistration()) ?? (await registerServiceWorker().catch(() => null))
}

export async function hasWorker() {
  return Boolean(await workerRegistration())
}

/** Subscribes this browser to the current app's push and stores it; throws when it can't. */
export async function subscribeAndSave() {
  const subscription = await subscribeToPush()
  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Kunde inte skapa prenumerationen.")
  }
  const result = await savePushSubscription(
    { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } },
    { tenant: currentTenant(), userAgent: navigator.userAgent },
  )
  if (!result.ok) {
    await subscription.unsubscribe().catch(() => {})
    throw new Error(result.error ?? "Kunde inte spara prenumerationen.")
  }
}

/**
 * Push notifications for the current app: whether they are on in this browser, and turning them
 * on, off and testing them. Each app is its own origin with its own subscription, so this only
 * concerns the app it is used in.
 */
export function usePushNotifications() {
  const [state, setState] = useState<PushState>("loading")
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      let next: PushState
      if (!isPushSupported()) next = "unsupported"
      else if (isIOS() && !isStandalone()) next = "ios-install"
      else if (Notification.permission === "denied") next = "denied"
      else {
        const registration = await workerRegistration()
        next = !registration
          ? "no-worker"
          : (await registration.pushManager.getSubscription())
            ? "on"
            : "off"
      }
      if (!cancelled) setState(next)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const enable = async () => {
    setMessage(null)
    setState("busy")
    try {
      await subscribeAndSave()
      setState("on")
    } catch (error) {
      if (error instanceof Error && error.message === "permission-denied") {
        setState("denied")
        return
      }
      setState("off")
      setMessage(error instanceof Error ? error.message : "Något gick fel.")
    }
  }

  const disable = async () => {
    setMessage(null)
    setState("busy")
    try {
      const endpoint = await unsubscribeFromPush()
      if (endpoint) await removePushSubscription(endpoint)
    } finally {
      setState("off")
    }
  }

  const test = async () => {
    setMessage(null)
    const result = await sendTestPush(currentTenant())
    setMessage(result.ok ? "Testnotis skickad." : result.error ?? "Kunde inte skicka testnotis.")
  }

  return { state, message, enable, disable, test }
}

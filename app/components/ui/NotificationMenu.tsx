"use client"

import { startTransition, useCallback, useEffect, useState, type ReactNode } from "react"
import {
  getNotificationSummary,
  getNotification,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationPreview,
} from "@/app/actions/notifications"
import { removePushSubscription, savePushSubscription, sendTestPush } from "@/app/actions/push"
import {
  currentTenant,
  getExistingSubscription,
  isIOS,
  isPushSupported,
  isStandalone,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/app/lib/push-client"
import { useUser } from "@/app/lib/user-context"
import { useDismissableOpen } from "./use-dismissable-open"

type PushState = "loading" | "unsupported" | "denied" | "off" | "on" | "busy"

function PushToggle() {
  const [state, setState] = useState<PushState>("loading")
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!isPushSupported()) {
        if (!cancelled) setState("unsupported")
        return
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setState("denied")
        return
      }
      const subscription = await getExistingSubscription()
      if (!cancelled) setState(subscription ? "on" : "off")
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const enable = async () => {
    setMessage(null)
    setState("busy")
    try {
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
        setState("off")
        setMessage(result.error ?? "Kunde inte spara prenumerationen.")
        return
      }
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
    const result = await sendTestPush()
    setMessage(result.ok ? "Testnotis skickad." : result.error ?? "Kunde inte skicka testnotis.")
  }

  if (state === "loading" || state === "unsupported") return null

  return (
    <div className="border-b border-border px-3 py-2 text-xs">
      {isIOS() && !isStandalone() ? (
        <p className="text-text-muted">
          Lägg till appen på hemskärmen för att få pushnotiser på iOS.
        </p>
      ) : state === "denied" ? (
        <p className="text-text-muted">
          Pushnotiser är blockerade. Tillåt notiser för sidan i webbläsarinställningarna.
        </p>
      ) : state === "on" ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-text-muted">Pushnotiser är på.</span>
          <span className="flex gap-3">
            <button type="button" onClick={() => void test()} className="font-medium text-accent hover:text-accent-hover">
              Skicka testnotis
            </button>
            <button type="button" onClick={() => void disable()} className="font-medium text-text-muted hover:text-text">
              Stäng av
            </button>
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void enable()}
          disabled={state === "busy"}
          className="font-medium text-accent hover:text-accent-hover disabled:opacity-50"
        >
          {state === "busy" ? "Aktiverar …" : "Slå på pushnotiser"}
        </button>
      )}
      {message && <p className="mt-1 text-text-faint">{message}</p>}
    </div>
  )
}

type NotificationMenuProps = {
  align?: "left" | "right"
  dropUp?: boolean
  footer?: ReactNode
  children: (props: {
    unreadCount: number
    notificationLabel: string | number
    isOpen: boolean
    toggle: () => void
  }) => ReactNode
}

function formatNotificationTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export function NotificationMenu({ align = "right", dropUp = false, footer, children }: NotificationMenuProps) {
  const user = useUser()
  const { open, setOpen, ref } = useDismissableOpen<HTMLDivElement>()
  const [unreadCount, setUnreadCount] = useState(user?.open_notifications ?? 0)
  const [notifications, setNotifications] = useState<NotificationPreview[]>([])
  const [expandedNotificationId, setExpandedNotificationId] = useState<string | null>(null)
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false)

  const loadNotifications = useCallback(() => {
    startTransition(() => {
      void getNotificationSummary().then((summary) => {
        setUnreadCount(summary.unreadCount)
        setNotifications(summary.notifications)
      })
    })
  }, [])

  const toggle = () => {
    const willOpen = !open
    setOpen(willOpen)
    if (willOpen) loadNotifications()
  }

  const openNotification = async (notification: NotificationPreview) => {
    const willExpand = expandedNotificationId !== notification.id
    setExpandedNotificationId(willExpand ? notification.id : null)
    if (!willExpand) return

    if (!notification.isRead && await markNotificationAsRead(notification.id)) {
      setNotifications((current) => current.map((item) => (
        item.id === notification.id ? { ...item, isRead: true } : item
      )))
      setUnreadCount((current) => Math.max(0, current - 1))
    }

    const detailedNotification = await getNotification(notification.id)
    if (!detailedNotification) return

    setNotifications((current) => current.map((item) => (
      item.id === notification.id ? { ...detailedNotification, isRead: true } : item
    )))
  }

  const markAllAsRead = async () => {
    setMarkingAllAsRead(true)
    const didMarkAll = await markAllNotificationsAsRead()
    setMarkingAllAsRead(false)
    if (!didMarkAll) return

    setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })))
    setUnreadCount(0)
  }

  const notificationLabel = unreadCount > 99 ? "99+" : unreadCount
  const panelPosition = dropUp ? "bottom-full mb-2" : "top-full mt-2"

  return (
    <div ref={ref} className="relative">
      {children({ unreadCount, notificationLabel, isOpen: open, toggle })}
      {open && (
        <section
          aria-label="Notifikationer"
          className={`absolute ${align}-0 z-50 w-[28rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-md border border-border bg-surface py-1 shadow-md ${panelPosition}`}
        >
          <div className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="font-display text-sm font-semibold text-text">Notifikationer</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllAsRead()}
                disabled={markingAllAsRead}
                className="text-xs font-medium text-accent hover:text-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                Markera alla som lästa
              </button>
            )}
          </div>
          <PushToggle />
          <div className="max-h-80 overflow-y-auto border-y border-border">
            {notifications.length > 0 ? notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => void openNotification(notification)}
                aria-expanded={expandedNotificationId === notification.id}
                className={`block w-full px-3 py-2.5 text-left hover:bg-accent-wash ${notification.isRead ? "text-text-muted" : "bg-surface-2 text-text"}`}
              >
                <span className="flex items-start justify-between gap-3 text-sm font-medium">
                  <span>{notification.title}</span>
                  <span aria-hidden className="shrink-0 text-text-faint">{expandedNotificationId === notification.id ? "−" : "+"}</span>
                </span>
                {notification.body && notification.body !== notification.title && (
                  <span
                    className="mt-1 block whitespace-pre-wrap text-xs leading-relaxed"
                    style={expandedNotificationId === notification.id ? undefined : {
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 2,
                      overflow: "hidden",
                    }}
                  >
                    {notification.body}
                  </span>
                )}
                {notification.createdAt && (
                  <time className="mt-1 block text-[11px] text-text-faint">
                    {formatNotificationTime(notification.createdAt)}
                  </time>
                )}
                {notification.body && notification.body !== notification.title && expandedNotificationId !== notification.id && (
                  <span className="mt-1 block text-xs font-medium text-accent">Visa hela notifikationen</span>
                )}
              </button>
            )) : (
              <p className="px-3 py-5 text-center text-sm text-text-muted">Inga notifikationer ännu.</p>
            )}
          </div>
          {footer}
        </section>
      )}
    </div>
  )
}

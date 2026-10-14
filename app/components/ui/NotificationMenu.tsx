"use client"

import { startTransition, useCallback, useEffect, useState, type ReactNode } from "react"
import {
  getNotificationSummary,
  getNotification,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationPreview,
} from "@/app/actions/notifications"
import { currentTenant } from "@/app/lib/push-client"
import { useUser } from "@/app/lib/user-context"
import { PushControls } from "./PushControls"
import { useDismissableOpen } from "./use-dismissable-open"

// In a side menu the panel's rows are indented to the text of the menu items, past their icons
// (px-3 + an 18px icon + gap-3), so they read as belonging to the item above.
const INLINE_INDENT = "pl-8.25 pr-3"

function PushToggle({ inline }: { inline: boolean }) {
  return (
    <div
      className={`flex flex-wrap gap-x-3 gap-y-1 text-xs empty:hidden ${inline ? `${INLINE_INDENT} py-1.5` : "border-b border-border px-3 py-2"}`}
    >
      <PushControls
        item="cursor-pointer font-medium text-accent hover:text-accent-hover disabled:opacity-50"
        note="w-full text-text-muted"
      />
    </div>
  )
}

type NotificationMenuProps = {
  align?: "left" | "right"
  // In a side menu (Tempus, Flux) the notifications unfold in place in the menu, below the
  // trigger, instead of in a floating box over it.
  inline?: boolean
  // The floating panel opens upwards, from a trigger at the bottom of the screen (Verso).
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

export function NotificationMenu({ align = "right", inline = false, dropUp = false, footer, children }: NotificationMenuProps) {
  const user = useUser()
  const { open, setOpen, ref } = useDismissableOpen<HTMLDivElement>()
  // The user's open_notifications counts every app; the badge counts this app's own, so it is
  // read with the list below.
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<NotificationPreview[]>([])
  const [expandedNotificationId, setExpandedNotificationId] = useState<string | null>(null)
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false)

  const loadNotifications = useCallback(() => {
    startTransition(() => {
      void getNotificationSummary(currentTenant()).then((summary) => {
        setUnreadCount(summary.unreadCount)
        setNotifications(summary.notifications)
      })
    })
  }, [])

  useEffect(() => {
    if (user) loadNotifications()
  }, [user, loadNotifications])

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
    const didMarkAll = await markAllNotificationsAsRead(currentTenant())
    setMarkingAllAsRead(false)
    if (!didMarkAll) return

    setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })))
    setUnreadCount(0)
  }

  const notificationLabel = unreadCount > 99 ? "99+" : unreadCount
  return (
    <div ref={ref} className="relative">
      {children({ unreadCount, notificationLabel, isOpen: open, toggle })}
      {open && (
        <section
          aria-label="Notifikationer"
          className={
            inline
              ? "py-1"
              : `absolute ${align}-0 ${dropUp ? "bottom-full mb-2" : "top-full mt-2"} z-50 w-[28rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-md border border-border bg-surface py-1 shadow-md`
          }
        >
          <div className={`flex items-center gap-3 ${inline ? `${INLINE_INDENT} py-1.5 empty:hidden` : "justify-between px-3 py-2"}`}>
            {/* In the menu the trigger beside it already says what this is. */}
            {!inline && <span className="font-display text-sm font-semibold text-text">Notifikationer</span>}
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
          <PushToggle inline={inline} />
          {/* In the menu the menu itself scrolls, so the list gets no scroll box of its own. */}
          <div
            className={inline ? "grid gap-0.5" : "max-h-80 overflow-y-auto border-y border-border [scrollbar-color:var(--text-faint)_transparent] [scrollbar-width:thin]"}
          >
            {notifications.length > 0 ? notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => void openNotification(notification)}
                aria-expanded={expandedNotificationId === notification.id}
                // A faint wash of the text colour: some themes (Opus) use dark surface-2 and
                // accent-wash tokens even in light mode.
                className={`block w-full cursor-pointer text-left hover:bg-text/8 ${inline ? `rounded-md py-2 ${INLINE_INDENT}` : "px-3 py-2.5"} ${notification.isRead ? "text-text-muted" : "bg-text/5 text-text"}`}
              >
                <span className="flex items-start justify-between gap-3 text-sm font-medium">
                  <span>{notification.title}</span>
                  <span aria-hidden className="shrink-0 text-text-faint">{expandedNotificationId === notification.id ? "−" : "+"}</span>
                </span>
                {notification.body && notification.body !== notification.title && (
                  <span
                    className={`mt-1 block whitespace-pre-wrap text-xs leading-relaxed ${expandedNotificationId === notification.id ? "" : "line-clamp-2"}`}
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

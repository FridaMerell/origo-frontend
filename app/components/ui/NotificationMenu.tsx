"use client"

import { startTransition, useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import {
  getNotificationSummary,
  getNotification,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationPreview,
} from "@/app/actions/notifications"
import { useUser } from "@/app/lib/user-context"

type NotificationMenuProps = {
  align?: "left" | "right"
  dropUp?: boolean
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

export function NotificationMenu({ align = "right", dropUp = false, children }: NotificationMenuProps) {
  const user = useUser()
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(user?.open_notifications ?? 0)
  const [notifications, setNotifications] = useState<NotificationPreview[]>([])
  const [expandedNotificationId, setExpandedNotificationId] = useState<string | null>(null)
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const loadNotifications = useCallback(() => {
    startTransition(() => {
      void getNotificationSummary().then((summary) => {
        setUnreadCount(summary.unreadCount)
        setNotifications(summary.notifications)
      })
    })
  }, [])

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
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
        </section>
      )}
    </div>
  )
}

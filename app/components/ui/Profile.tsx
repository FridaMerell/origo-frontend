"use client"

import { startTransition, useCallback, useEffect, useRef, useState } from "react"
import { Avatar } from "./Avatar"
import { Icon } from "./Icon"
import { logout } from "@/app/actions/auth"
import {
  getNotificationSummary,
  getNotification,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationPreview,
} from "@/app/actions/notifications"
import { useUser, formatUserName } from "@/app/lib/user-context"

function formatNotificationTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export function Profile() {
  const user = useUser()
  const [open, setOpen] = useState(false)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(user?.open_notifications ?? 0)
  const [notifications, setNotifications] = useState<NotificationPreview[]>([])
  const [expandedNotificationId, setExpandedNotificationId] = useState<string | null>(null)
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const name = user ? formatUserName(user) : "Okänd"

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  const loadNotifications = useCallback(() => {
    startTransition(() => {
      void getNotificationSummary().then((summary) => {
        setUnreadNotificationCount(summary.unreadCount)
        setNotifications(summary.notifications)
      })
    })
  }, [])

  const notificationLabel = unreadNotificationCount > 99 ? "99+" : unreadNotificationCount

  const toggleMenu = () => {
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
      setUnreadNotificationCount((current) => Math.max(0, current - 1))
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
    setUnreadNotificationCount(0)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggleMenu}
        className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-sm text-text-muted hover:bg-accent-wash hover:text-accent"
      >
        <span className="relative shrink-0">
          <Avatar name={name} size={24} />
          {unreadNotificationCount > 0 && (
            <span
              aria-label={`${unreadNotificationCount} olästa notifieringar`}
              className="absolute -right-1.5 -top-1.5 flex min-w-4.5 h-4.5 items-center justify-center rounded-full bg-accent px-1 font-body text-[10px] font-semibold leading-none text-accent-contrast ring-2 ring-surface"
            >
              {notificationLabel}
            </span>
          )}
        </span>
        <span className="truncate">{name}</span>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-10 mb-1 w-[28rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-md border border-border bg-surface py-1 shadow-sm">
          <div className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="font-display text-sm font-semibold text-text">Notifikationer</span>
            {unreadNotificationCount > 0 && (
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
          {user && <button
            type="button"
            onClick={async () => {
              await logout();
              window.location.href = "/login";
            }}
            className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm text-text hover:bg-accent-wash hover:text-accent"
          >
            <Icon name="log-out" size={14} />
            Logga ut
          </button>}
        </div>
      )}
    </div>
  )
}

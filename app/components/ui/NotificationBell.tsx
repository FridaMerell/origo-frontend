"use client"

import { Bell } from "lucide-react"
import { NotificationMenu } from "./NotificationMenu"

/**
 * A bell that opens the notification panel (notifications plus turning push on, testing and
 * turning it off). `className` shapes the button like the app's own icon buttons beside it.
 */
export function NotificationBell({ align = "right", className }: { align?: "left" | "right"; className: string }) {
  return (
    <NotificationMenu align={align}>
      {({ unreadCount, notificationLabel, toggle, isOpen }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={isOpen}
          aria-label="Notifikationer"
          title="Notifikationer"
          className={`relative cursor-pointer ${className}`}
        >
          <Bell size={16} aria-hidden />
          {unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] font-bold leading-4 text-accent-contrast">
              {notificationLabel}
            </span>
          )}
        </button>
      )}
    </NotificationMenu>
  )
}

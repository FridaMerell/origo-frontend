"use client"

import { LogOut } from "lucide-react"
import { Avatar } from "./Avatar"
import { NotificationMenu } from "./NotificationMenu"
import { logout } from "@/app/actions/auth"
import { useUser, formatUserName } from "@/app/lib/user-context"

export function Profile() {
  const user = useUser()
  const name = user ? formatUserName(user) : "Okänd"

  return (
    <NotificationMenu
      align="left"
      dropUp
      footer={user && (
        <button
          type="button"
          onClick={async () => {
            await logout();
            window.location.href = "/login";
          }}
          className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm text-text hover:bg-accent-wash hover:text-accent"
        >
          <LogOut size={14} />
          Logga ut
        </button>
      )}
    >
      {({ unreadCount, notificationLabel, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-sm text-text-muted hover:bg-accent-wash hover:text-accent"
        >
          <span className="relative shrink-0">
            <Avatar name={name} size={24} />
            {unreadCount > 0 && (
              <span
                aria-label={`${unreadCount} olästa notifieringar`}
                className="absolute -right-1.5 -top-1.5 flex min-w-4.5 h-4.5 items-center justify-center rounded-full bg-accent px-1 font-body text-[10px] font-semibold leading-none text-accent-contrast ring-2 ring-surface"
              >
                {notificationLabel}
              </span>
            )}
          </span>
          <span className="truncate">{name}</span>
        </button>
      )}
    </NotificationMenu>
  )
}

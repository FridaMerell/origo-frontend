"use client"

import { useEffect, useRef, useState } from "react"
import { Avatar } from "./Avatar"
import { Icon } from "./Icon"
import { logout } from "@/app/actions/auth"
import { useUser } from "@/app/lib/user-context"

export function Profile(props: any) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const user = useUser()

  const name = user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.username || "Okänd"

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-sm text-text-muted hover:bg-accent-wash hover:text-accent"
      >
        <Avatar name={name} size={24} />
        <span className="truncate">{name}</span>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 right-0 z-10 mb-1 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-sm">
          
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm text-text hover:bg-accent-wash hover:text-accent"
            >
              <Icon name="log-out" size={14} />
              Logga ut
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

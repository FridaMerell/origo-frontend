"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Icon } from "@/app/components/ui/Icon"
import { Avatar } from "@/app/components/ui/Avatar"
import { TaskFormModal } from "@/app/flux/tasks/task-form-modal"
import { ProjectFormModal } from "@/app/flux/projects/project-form-modal"
import { useFluxTasks } from "@/app/lib/flux-context"

type NavItem = {
  label: string
  href: string
  icon: string
  count?: number
  tone?: "accent" | "muted" | "danger"
}

type ToolbarProps = {
  mode: "light" | "dark" | null
  onToggleMode: () => void
  userName: string
}

const Toolbar = ({ mode, onToggleMode, userName }: ToolbarProps) => {
  const pathname = usePathname()
  const tasks = useFluxTasks()
  const [showMoreSheet, setShowMoreSheet] = useState(false)
  const [drawer, setDrawer] = useState<"task" | "project" | null>(null)

  const createLabel = pathname === "/projects" ? "New project" : "New task"
  const openCreateDrawer = () => setDrawer(pathname === "/projects" ? "project" : "task")

  const backlogCount = tasks.filter((task) => !task.due_date).length

  const left: NavItem[] = [
    { label: "Projects", href: "/projects", icon: "folder" },
    { label: "Tasks", href: "/tasks", icon: "square-check", count: tasks.length, tone: "accent" },
  ]
  const right: NavItem[] = [
    { label: "Timeline", href: "/timeline", icon: "route" },
    { label: "Backlog", href: "/backlog", icon: "inbox", count: backlogCount, tone: "muted" },
  ]
  const moreItems = [right[0]!]

  const badge = (item: NavItem) =>
    !!item.count && (
      <span
        className={`absolute -right-2 -top-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 font-mono text-[9px] font-semibold ${
          item.tone === "danger"
            ? "bg-danger text-white"
            : item.tone === "accent"
              ? "bg-accent text-accent-contrast"
              : "bg-surface-2 text-text-faint"
        }`}
      >
        {item.count}
      </span>
    )

  const dockItem = (item: NavItem) => {
    const active = pathname === item.href
    return (
      <Link
        key={item.label}
        href={item.href}
        className={`relative flex flex-col items-center gap-0.5 rounded-[22px] px-3 py-1.5 no-underline duration-200 ${active ? "bg-accent-wash" : "hover:bg-surface-2"}`}
      >
        <span className="relative">
          <Icon name={item.icon} size={18} className={active ? "text-accent" : "text-text-muted"} />
          {badge(item)}
        </span>
        <span
          className={`font-mono text-[9px] font-semibold uppercase tracking-wide ${active ? "text-accent" : "text-text-faint"}`}
        >
          {item.label}
        </span>
      </Link>
    )
  }

  const mobileNavItem = (item: NavItem) => {
    const active = pathname === item.href
    return (
      <Link
        key={item.label}
        href={item.href}
        className="flex flex-1 flex-col items-center gap-1 py-1.5 no-underline"
      >
        <span className="relative">
          <Icon name={item.icon} size={20} className={active ? "text-accent" : "text-text-muted"} />
          {badge(item)}
        </span>
        <span
          className={`font-body text-[11px] font-medium ${active ? "text-accent" : "text-text-muted"}`}
        >
          {item.label}
        </span>
      </Link>
    )
  }

  return (
    <>
      {/* Desktop / tablet floating dock */}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 hidden items-center justify-center sm:flex">
        <nav className="pointer-events-auto flex items-center gap-1.5 rounded-[32px] border border-border bg-surface p-2 shadow-lg">
          {left.map(dockItem)}

          <button
            type="button"
            aria-label={createLabel}
            onClick={openCreateDrawer}
            className="mx-1 flex size-13 shrink-0 items-center justify-center rounded-full bg-accent shadow-md hover:bg-accent"
          >
            <Icon name="plus" size={24} className="text-accent-contrast" />
          </button>

          {right.map(dockItem)}
        </nav>

        <div className="pointer-events-auto absolute right-6 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-[32px] border border-border bg-surface p-2 shadow-lg">
          <button
            type="button"
            role="switch"
            aria-checked={mode === "dark"}
            aria-label="Toggle dark mode"
            onClick={onToggleMode}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-surface-2"
          >
            <Icon name={mode === "dark" ? "sun" : "moon"} size={16} />
          </button>

          <Avatar name={userName} size={34} />
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center rounded-t-2xl border border-border bg-surface px-2 pb-[env(safe-area-inset-bottom)] shadow-lg sm:hidden">
        {mobileNavItem(left[0]!)}
        {mobileNavItem(left[1]!)}

        <div className="flex flex-1 flex-col items-center py-1.5">
          <button
            type="button"
            aria-label={createLabel}
            onClick={openCreateDrawer}
            className="-mt-6 flex size-12 shrink-0 items-center justify-center rounded-full bg-accent shadow-lg hover:bg-accent"
          >
            <Icon name="plus" size={22} className="text-accent-contrast" />
          </button>
        </div>

        {mobileNavItem(right[1]!)}

        <button
          type="button"
          aria-label="More"
          onClick={() => setShowMoreSheet(true)}
          className="flex flex-1 flex-col items-center gap-1 py-1.5"
        >
          <Icon name="ellipsis" size={20} className="text-text-muted" />
          <span className="font-body text-[11px] font-medium text-text-muted">More</span>
        </button>
      </nav>

      {/* Mobile "More" sheet */}
      <div
        className={`fixed inset-0 z-50 sm:hidden ${showMoreSheet ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!showMoreSheet}
      >
        <div
          className={`absolute inset-0 bg-black/35 transition-opacity duration-200 ${showMoreSheet ? "opacity-100" : "opacity-0"}`}
          onClick={() => setShowMoreSheet(false)}
        />
        <div
          className={`absolute inset-x-0 bottom-0 flex flex-col gap-1 rounded-t-2xl border border-border bg-surface p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-lg transition-transform duration-200 ${showMoreSheet ? "translate-y-0" : "translate-y-full"}`}
        >
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border" />
          <div className="mb-1 flex items-center justify-between">
            <h2 className="m-0 font-display text-base font-semibold text-text">More</h2>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setShowMoreSheet(false)}
              className="text-text-faint"
            >
              <Icon name="x" size={18} />
            </button>
          </div>

          {moreItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setShowMoreSheet(false)}
              className="flex items-center gap-3 rounded-lg px-2 py-3 no-underline hover:bg-surface-2"
            >
              <Icon name={item.icon} size={18} className="text-text-muted" />
              <span className="flex-1 font-body text-sm text-text">{item.label}</span>
              {!!item.count && (
                <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-xs text-text-faint">
                  {item.count}
                </span>
              )}
            </Link>
          ))}

          <button
            type="button"
            onClick={onToggleMode}
            className="flex items-center gap-3 rounded-lg px-2 py-3 text-left hover:bg-surface-2"
          >
            <Icon name={mode === "dark" ? "sun" : "moon"} size={18} className="text-text-muted" />
            <span className="flex-1 font-body text-sm text-text">
              {mode === "dark" ? "Light mode" : "Dark mode"}
            </span>
          </button>

          <div className="mt-1 flex items-center gap-3 border-t border-border px-2 pt-3">
            <Avatar name={userName} size={28} />
            <span className="font-body text-sm text-text">{userName}</span>
          </div>
        </div>
      </div>

      <TaskFormModal open={drawer === "task"} onClose={() => setDrawer(null)} />
      <ProjectFormModal open={drawer === "project"} onClose={() => setDrawer(null)} />
    </>
  )
}

export default Toolbar

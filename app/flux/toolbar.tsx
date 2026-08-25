"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Icon } from "@/app/components/ui/Icon"
import { Avatar } from "@/app/components/ui/Avatar"
import { Button } from "@/app/components/ui/Button"
import { TaskFormModal } from "@/app/flux/tasks/task-form-modal"
import { ProjectFormModal } from "@/app/flux/projects/project-form-modal"
import { useFluxProjects } from "@/app/lib/flux-context"
import Logo from "./ui/Logo"

type NavLink = { label: string; href: string; icon: string }

const NAV_LINKS: NavLink[] = [
  { label: "Uppgifter", href: "/tasks", icon: "list" },
  { label: "Tidslinje", href: "/timeline", icon: "route" },
  { label: "Backlog", href: "/backlog", icon: "inbox" },
]

type ToolbarProps = {
  mode: "light" | "dark" | null
  onToggleMode: () => void
  userName: string
}

function versoHref() {
  if (typeof window === "undefined") return "#"
  const { hostname, protocol, port } = window.location
  const parts = hostname.split(".")
  parts[0] = "verso"
  return `${protocol}//${parts.join(".")}${port ? `:${port}` : ""}/`
}

const Toolbar = ({ mode, onToggleMode, userName }: ToolbarProps) => {
  const pathname = usePathname()
  const projects = useFluxProjects()
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [drawer, setDrawer] = useState<"task" | "project" | null>(null)

  const createLabel = pathname === "/projects" ? "New project" : "New task"
  const openCreateDrawer = () => {
    setDesktopMenuOpen(false)
    setMobileMenuOpen(false)
    setDrawer(pathname === "/projects" ? "project" : "task")
  }

  const projectName = projects[0]?.name ?? "Projekt"

  const overflowItems = (closeMenu: () => void) => (
    <>
      <Button variant="primary" size="md" onClick={openCreateDrawer} className="justify-center">
        <Icon name="plus" size={16} className="text-accent-contrast" />
        {createLabel}
      </Button>
      <button
        type="button"
        className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left font-body text-sm text-text hover:bg-surface-2"
      >
        <Icon name="bell" size={16} className="text-text-muted" />
        Notifications
      </button>
      <button
        type="button"
        onClick={() => {
          onToggleMode()
          closeMenu()
        }}
        className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left font-body text-sm text-text hover:bg-surface-2"
      >
        <Icon name={mode === "dark" ? "sun" : "moon"} size={16} className="text-text-muted" />
        {mode === "dark" ? "Light mode" : "Dark mode"}
      </button>
      <a
        href={versoHref()}
        className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 font-body text-sm text-text no-underline hover:bg-surface-2"
      >
        <Icon name="arrow-left-right" size={16} className="text-text" />
        Go to Verso
      </a>
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <Avatar name={userName} size={24} />
        <span className="font-body text-sm text-text-muted">{userName}</span>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop floating bar */}
      <div className="pointer-events-none fixed inset-x-0 top-5 z-40 hidden justify-center sm:flex">
        <div className="pointer-events-auto relative">
          <nav className="flex items-center gap-2.5 whitespace-nowrap rounded-[44px] border border-border bg-surface px-4 py-3 shadow-md">
            <Link href="/" className="flex items-center  no-underline">
              <Logo width={70} className="text-accent" />
              <span className="font-display text-[22px] font-bold tracking-tight text-text">flux</span>
            </Link>

            <div className="h-8 w-px bg-border" />

            <Link
              href="/projects"
              className="flex items-center gap-2 rounded-3xl px-3.5 py-2.5 font-body text-base font-semibold text-text no-underline hover:bg-surface-2"
            >
              {projectName}
              <Icon name="chevron-down" size={16} className="text-text-faint" />
            </Link>

            {NAV_LINKS.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-3xl px-4 py-2.5 font-body text-base font-medium no-underline ${
                    active ? "bg-surface-2 text-text" : "text-text-muted hover:bg-surface-2"
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}

            <div className="h-8 w-px bg-border" />

            <button
              type="button"
              aria-label="More"
              onClick={() => setDesktopMenuOpen((v) => !v)}
              className={`flex size-10 shrink-0 items-center justify-center rounded-full ${desktopMenuOpen ? "bg-surface-2" : "hover:bg-surface-2"}`}
            >
              <Icon name="ellipsis" size={18} className="text-text-muted" />
            </button>
          </nav>

          {desktopMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDesktopMenuOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-2 flex min-w-[200px] flex-col gap-0.5 rounded-2xl border border-border bg-surface p-2 shadow-md">
                {overflowItems(() => setDesktopMenuOpen(false))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile dock */}
      <div className="pointer-events-none fixed inset-x-0 bottom-3 z-40 flex justify-center px-2.5 sm:hidden">
        <div className="pointer-events-auto relative w-full">
          {mobileMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMobileMenuOpen(false)} />
              <div className="absolute inset-x-0 bottom-[68px] z-20 flex flex-col gap-0.5 rounded-2xl border border-border bg-surface p-2 shadow-md">
                {overflowItems(() => setMobileMenuOpen(false))}
              </div>
            </>
          )}

          <nav className="flex items-center justify-center gap-1 rounded-[28px] border border-border bg-surface px-2.5 py-2 shadow-md">
            <Logo height={12} width={18} className="mr-0.5 shrink-0 text-accent" />
            <Link
              href="/projects"
              className="flex items-center gap-1 whitespace-nowrap rounded-2xl px-2 py-1.5 font-body text-xs font-semibold text-text no-underline"
            >
              {projectName}
              <Icon name="chevron-down" size={12} className="text-text-faint" />
            </Link>
            <Link
              href="/tasks"
              className={`whitespace-nowrap rounded-2xl px-2.5 py-1.5 font-body text-xs font-medium no-underline ${
                pathname === "/tasks" ? "bg-surface-2 text-text" : "text-text"
              }`}
            >
              Uppgifter
            </Link>
            <button
              type="button"
              aria-label="More"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className={`ml-0.5 flex size-[26px] shrink-0 items-center justify-center rounded-full ${mobileMenuOpen ? "bg-surface-2" : ""}`}
            >
              <Icon name="ellipsis" size={16} className="text-text-muted" />
            </button>
          </nav>
        </div>
      </div>

      <TaskFormModal open={drawer === "task"} onClose={() => setDrawer(null)} />
      <ProjectFormModal open={drawer === "project"} onClose={() => setDrawer(null)} />
    </>
  )
}

export default Toolbar

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Icon } from "@/app/components/ui/Icon"
import { Avatar } from "@/app/components/ui/Avatar"
import { Button } from "@/app/components/ui/Button"
import { TaskFormDrawer } from "@/app/flux/tasks/task-form-drawer"
import { ProjectFormDrawer } from "@/app/flux/projects/project-form-drawer"
import { useFluxProjects, useSelectedFluxProject } from "@/app/lib/flux-context"
import { useUser, formatUserName } from "@/app/lib/user-context"
import { logout } from "@/app/actions/auth"
import { ORIGO_VERSION } from "@/app/lib/config"
import { APP_LINKS, appHref } from "@/app/lib/tenant-links"
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
}

type ProjectSelectorProps = {
  labelClassName: string
  chevronSize: number
  dropUp?: boolean
}

const ProjectSelector = ({ labelClassName, chevronSize, dropUp }: ProjectSelectorProps) => {
  const projects = useFluxProjects()
  const { selectedProject, selectProject } = useSelectedFluxProject()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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
        className={labelClassName}
      >
        {selectedProject?.name ?? "Projekt"}
        <Icon
          name="chevron-down"
          size={chevronSize}
          className={`text-text-faint transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          className={`absolute left-0 z-20 min-w-[180px] overflow-hidden rounded-2xl border border-border bg-surface py-1 shadow-md ${dropUp ? "bottom-full mb-2" : "top-full mt-2"
            }`}
        >
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => {
                setOpen(false)
                if (project.id !== selectedProject?.id) selectProject(String(project.id))
              }}
              className="block w-full truncate px-3 py-1.5 text-left font-body text-sm text-text hover:bg-surface-2"
            >
              {project.name}
            </button>
          ))}
          <Link
            href="/projects"
            onClick={() => setOpen(false)}
            className="block w-full truncate border-t border-border px-3 py-1.5 text-left font-body text-sm text-text-muted no-underline hover:bg-surface-2"
          >
            Alla projekt
          </Link>
        </div>
      )}
    </div>
  )
}

const Toolbar = ({ mode, onToggleMode }: ToolbarProps) => {
  const pathname = usePathname()
  const user = useUser()
  const userName = user ? formatUserName(user) : "?"
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [drawer, setDrawer] = useState<"task" | "project" | null>(null)

  const createLabel = pathname === "/projects" ? "Nytt projekt" : "Ny uppgift"
  const openCreateDrawer = () => {
    setDesktopMenuOpen(false)
    setMobileMenuOpen(false)
    setDrawer(pathname === "/projects" ? "project" : "task")
  }

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
        Aviseringar
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
        {mode === "dark" ? "Ljust läge" : "Mörkt läge"}
      </button>
      <div className="my-1 border-t border-border" />
      <div className="flex flex-wrap gap-x-3 gap-y-1 px-3 py-2 font-body text-xs text-text-muted">
        {APP_LINKS.filter((app) => app.id !== "flux").map((app) => (
          <a
            key={app.id}
            href={appHref(app.id)}
            className="no-underline hover:text-text hover:underline"
          >
            {app.name}
          </a>
        ))}
      </div>
      <div className="my-1 border-t border-border" />
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <Avatar name={userName} size={24} />
        <span className="font-body text-sm text-text-muted">{userName}</span>
      </div>
      <button
        type="button"
        onClick={async () => {
          closeMenu()
          await logout()
          window.location.href = "/login"
        }}
        className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left font-body text-sm text-text hover:bg-surface-2"
      >
        <Icon name="log-out" size={16} className="text-text-muted" />
        Logga ut
      </button>
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
              <div className=" flex flex-col items-start">
                <span className="font-display text-[25px] font-bold tracking-tight text-text leading-5.5">flux</span>
                <span className="font-body text-[7px] font-medium text-text-muted">ORIGO {ORIGO_VERSION}</span>
              </div>
            </Link>

            <div className="h-8 w-px bg-border" />

            <ProjectSelector
              labelClassName="flex items-center gap-2 rounded-3xl px-3.5 py-2.5 font-body text-base font-semibold text-text hover:bg-surface-2"
              chevronSize={16}
            />

            {NAV_LINKS.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-3xl px-4 py-2.5 font-body text-base font-medium no-underline ${active ? "bg-surface-2 text-text" : "text-text-muted hover:bg-surface-2"
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

          <nav className="flex items-center justify-center gap-0.5 rounded-[28px] border border-border bg-surface px-2 py-2 shadow-md">
            <Link href="/" className="mr-0.5 flex shrink-0 items-center no-underline">
              <Logo height={36} width={54} className="text-accent" />
            </Link>
            <ProjectSelector
              labelClassName="flex items-center gap-0.5 whitespace-nowrap rounded-2xl px-1.5 py-1.5 font-body text-xs font-semibold text-text"
              chevronSize={12}
              dropUp
            />
            <Link
              href="/tasks"
              className={`whitespace-nowrap rounded-2xl px-1.5 py-1.5 font-body text-xs font-medium no-underline ${pathname === "/tasks" ? "bg-surface-2 text-text" : "text-text"
                }`}
            >
              Uppgifter
            </Link>
            <Link
              href="/timeline"
              className={`whitespace-nowrap rounded-2xl px-1.5 py-1.5 font-body text-xs font-medium no-underline ${pathname === "/timeline" ? "bg-surface-2 text-text" : "text-text"
                }`}
            >
              Tidslinje
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

      <TaskFormDrawer open={drawer === "task"} onClose={() => setDrawer(null)} />
      <ProjectFormDrawer open={drawer === "project"} onClose={() => setDrawer(null)} />
    </>
  )
}

export default Toolbar

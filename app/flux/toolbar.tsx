"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Avatar } from "@/app/components/ui/Avatar"
import { Button } from "@/app/components/ui/Button"
import { Icon } from "@/app/components/ui/Icon"
import { NotificationMenu } from "@/app/components/ui/NotificationMenu"
import { TaskFormDrawer } from "@/app/flux/tasks/task-form-drawer"
import { ProjectFormDrawer } from "@/app/flux/projects/project-form-drawer"
import { useFluxProjects, useSelectedFluxProject } from "@/app/lib/flux-context"
import { useUser, formatUserName } from "@/app/lib/user-context"
import { logout } from "@/app/actions/auth"
import { ORIGO_VERSION } from "@/app/lib/config"
import { APP_LINKS, appHref } from "@/app/lib/tenant-links"
import Logo from "./ui/Logo"

const NAV_LINKS = [
  { label: "Uppgifter", href: "/tasks" },
  { label: "Tidslinje", href: "/timeline" },
  { label: "Backlog", href: "/backlog" },
]

function ProjectSelector({ dropUp = false, compact = false }: { dropUp?: boolean; compact?: boolean }) {
  const projects = useFluxProjects()
  const { selectedProject, selectProject } = useSelectedFluxProject()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const close = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [])
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className={compact ? "flex max-w-28 items-center gap-1 rounded-2xl px-2 py-2 text-xs font-semibold text-text hover:bg-surface-2" : "flex items-center gap-2 rounded-3xl px-3.5 py-2.5 text-base font-semibold text-text hover:bg-surface-2"}>
        <span className="truncate">{selectedProject?.name ?? "Projekt"}</span><Icon name="chevron-down" size={compact ? 13 : 16} className={["shrink-0 text-text-faint transition-transform", open ? "rotate-180" : ""].join(" ")} />
      </button>
      {open && <div className={dropUp ? "absolute bottom-full left-0 z-50 mb-2 min-w-52 overflow-hidden rounded-2xl border border-border bg-surface py-1 shadow-md" : "absolute left-0 top-full z-50 mt-2 min-w-52 overflow-hidden rounded-2xl border border-border bg-surface py-1 shadow-md"}>
        {projects.map((project) => <button key={project.id} type="button" onClick={() => { setOpen(false); if (project.id === selectedProject?.id) return; selectProject(String(project.id)); if (/^\/projects\/[^/]+$/.test(pathname)) router.push("/projects/" + project.id) }} className="block w-full truncate px-3 py-2 text-left text-sm text-text hover:bg-surface-2">{project.name}</button>)}
        <Link href="/projects" onClick={() => setOpen(false)} className="block border-t border-border px-3 py-2 text-sm text-text-muted no-underline hover:bg-surface-2">Alla projekt</Link>
      </div>}
    </div>
  )
}

export default function Toolbar({ mode, onToggleMode }: { mode: "light" | "dark" | null; onToggleMode: () => void }) {
  const pathname = usePathname()
  const user = useUser()
  const userName = user ? formatUserName(user) : "?"
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [drawer, setDrawer] = useState<"task" | "project" | null>(null)
  const create = () => { setMenuOpen(false); setMobileMenuOpen(false); setDrawer(pathname === "/projects" ? "project" : "task") }
  return <>
    <div className="pointer-events-none fixed inset-x-0 top-5 z-40 hidden justify-center sm:flex">
      <div className="pointer-events-auto relative">
        <nav className="flex items-center gap-2.5 whitespace-nowrap rounded-[44px] border border-border bg-surface px-4 py-3 shadow-md">
          <Link href="/" className="flex items-center no-underline"><Logo width={58} className="text-accent" /><span className="flex flex-col"><span className="font-display text-[25px] font-bold leading-5 tracking-tight text-text">flux</span><span className="text-[7px] font-medium text-text-muted">ORIGO {ORIGO_VERSION}</span></span></Link>
          <div className="h-8 w-px bg-border" /><ProjectSelector />
          {NAV_LINKS.map((item) => <Link key={item.href} href={item.href} className={pathname === item.href ? "rounded-3xl bg-surface-2 px-4 py-2.5 text-base font-medium text-text no-underline" : "rounded-3xl px-4 py-2.5 text-base font-medium text-text-muted no-underline hover:bg-surface-2"}>{item.label}</Link>)}
          <Button variant="primary" size="sm" onClick={create} className="rounded-3xl"><Icon name="plus" size={16} className="text-accent-contrast" />Ny</Button>
          <button type="button" aria-label="Mer" onClick={() => setMenuOpen((value) => !value)} className={menuOpen ? "flex size-10 items-center justify-center rounded-full bg-surface-2" : "flex size-10 items-center justify-center rounded-full hover:bg-surface-2"}><Icon name="ellipsis" size={18} className="text-text-muted" /></button>
        </nav>
        {menuOpen && <div className="absolute right-0 top-full z-50 mt-2 flex min-w-52 flex-col rounded-2xl border border-border bg-surface p-2 shadow-md">
          <Link href="/projects" onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-2 text-sm text-text no-underline hover:bg-surface-2">Projekt</Link>
          <button type="button" onClick={() => { onToggleMode(); setMenuOpen(false) }} className="rounded-md px-3 py-2 text-left text-sm text-text hover:bg-surface-2">{mode === "dark" ? "Ljust läge" : "Mörkt läge"}</button>
          <NotificationMenu align="right">
            {({ unreadCount, notificationLabel, toggle, isOpen }) => (
              <button type="button" onClick={toggle} className={isOpen ? "relative flex items-center gap-2 rounded-md bg-surface-2 px-3 py-2 text-sm text-text" : "relative flex items-center gap-2 rounded-md px-3 py-2 text-sm text-text hover:bg-surface-2"}>
                <Icon name="bell" size={16} /> Aviseringar
                {unreadCount > 0 && <span className="ml-auto min-w-4 rounded-full bg-accent px-1 text-[10px] font-bold leading-4 text-accent-contrast">{notificationLabel}</span>}
              </button>
            )}
          </NotificationMenu>
          <div className="my-1 border-t border-border" /><div className="flex items-center gap-2 px-3 py-2"><Avatar name={userName} size={24} /><span className="text-sm text-text-muted">{userName}</span></div>
          {user && <button type="button" onClick={() => void logout().then(() => { window.location.href = "/login" })} className="rounded-md px-3 py-2 text-left text-sm text-text hover:bg-surface-2">Logga ut</button>}
          <div className="mt-1 border-t border-border px-3 py-2">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-text-faint">Byt produkt</span>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {APP_LINKS.filter((app) => app.id !== "flux").map((app) => <a key={app.id} href={appHref(app.id)} className="text-sm text-text-muted no-underline hover:text-text hover:underline">{app.name}</a>)}
            </div>
          </div>
        </div>}
      </div>
    </div>
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-40 flex justify-center px-3 sm:hidden">
      <div className="pointer-events-auto relative w-full max-w-md">
        {mobileMenuOpen && <div className="absolute inset-x-0 bottom-[68px] z-20 rounded-2xl border border-border bg-surface p-2 shadow-md">
          <Button variant="primary" size="sm" onClick={create} className="mb-1 w-full justify-center rounded-md"><Icon name="plus" size={16} className="text-accent-contrast" />Ny uppgift</Button>
          <NotificationMenu align="left" dropUp>{({ unreadCount, notificationLabel, toggle }) => <button type="button" onClick={toggle} className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-text hover:bg-surface-2"><Icon name="bell" size={16} />Aviseringar{unreadCount > 0 && <span className="ml-auto min-w-4 rounded-full bg-accent px-1 text-[10px] font-bold leading-4 text-accent-contrast">{notificationLabel}</span>}</button>}</NotificationMenu>
          <button type="button" onClick={() => { onToggleMode(); setMobileMenuOpen(false) }} className="block w-full rounded-md px-3 py-2.5 text-left text-sm text-text hover:bg-surface-2">{mode === "dark" ? "Ljust läge" : "Mörkt läge"}</button>
          <div className="my-1 border-t border-border" />
          <div className="px-3 py-2"><span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-text-faint">Byt produkt</span><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">{APP_LINKS.filter((app) => app.id !== "flux").map((app) => <a key={app.id} href={appHref(app.id)} className="text-sm text-text-muted no-underline hover:text-text hover:underline">{app.name}</a>)}</div></div>
          <div className="my-1 border-t border-border" />
          <div className="flex items-center gap-2 px-3 py-2"><Avatar name={userName} size={24} /><span className="text-sm text-text-muted">{userName}</span></div>
          {user && <button type="button" onClick={() => void logout().then(() => { window.location.href = "/login" })} className="block w-full rounded-md px-3 py-2.5 text-left text-sm text-text hover:bg-surface-2">Logga ut</button>}
        </div>}
        <nav className="flex items-center justify-between gap-1 rounded-3xl border border-border bg-surface px-2 py-2 shadow-md">
          <Link href="/" className="flex shrink-0 items-center no-underline"><Logo width={42} className="text-accent" /></Link>
          <ProjectSelector dropUp compact />
          <Link href="/tasks" className={pathname === "/tasks" ? "rounded-2xl bg-surface-2 px-2 py-2 text-xs font-semibold text-text no-underline" : "rounded-2xl px-2 py-2 text-xs font-medium text-text no-underline"}>Uppgifter</Link>
          <Link href="/timeline" className={pathname === "/timeline" ? "rounded-2xl bg-surface-2 px-2 py-2 text-xs font-semibold text-text no-underline" : "rounded-2xl px-2 py-2 text-xs font-medium text-text no-underline"}>Tidslinje</Link>
          <button type="button" aria-label="Öppna fler meny" onClick={() => setMobileMenuOpen((open) => !open)} className={mobileMenuOpen ? "rounded-full bg-surface-2 p-2 text-text" : "rounded-full p-2 text-text-muted"}><Icon name="ellipsis" size={18} /></button>
        </nav>
      </div>
    </div>
    <TaskFormDrawer open={drawer === "task"} onClose={() => setDrawer(null)} /><ProjectFormDrawer open={drawer === "project"} onClose={() => setDrawer(null)} />
  </>
}

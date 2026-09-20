"use client"

import { AppLink as Link } from "@/app/components/ui/AppLink"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Avatar } from "@/app/components/ui/Avatar"
import { Button } from "@/app/components/ui/Button"
import { NotificationMenu } from "@/app/components/ui/NotificationMenu"
import { useDismissableOpen } from "@/app/components/ui/use-dismissable-open"
import { TaskFormDrawer } from "@/app/flux/tasks/task-form-drawer"
import { ProjectFormDrawer } from "@/app/flux/projects/project-form-drawer"
import { useFluxProjects, useSelectedFluxProject } from "@/app/flux/_state/flux-context"
import { useUser, formatUserName } from "@/app/lib/user-context"
import type { User } from "@/app/lib/dal"
import { logout } from "@/app/actions/auth"
import { ORIGO_VERSION } from "@/app/lib/config"
import { APP_LINKS, appHref } from "@/app/lib/tenant-links"
import Logo from "./ui/Logo"
import { Bell, ChevronDown, Ellipsis, Plus } from "lucide-react"

type NavItem = {
  label: string
  href: string
}

const TIMELINE_LINK: NavItem = { label: "Tidslinje", href: "/timeline" }

const BUILD_NAV: NavItem[] = [{ label: "Datamodell", href: "/model" }]
const IDENTITY_NAV: NavItem = { label: "Identitet", href: "/identity" }

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavLink({ label, href, pathname, onClick, compact = false }: NavItem & {
  pathname: string
  onClick?: () => void
  compact?: boolean
}) {
  const active = isActive(pathname, href)

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={[
        "flex items-center gap-1.5 no-underline transition-colors",
        compact ? "rounded-xl px-2.5 py-2 text-xs" : "rounded-2xl px-3 py-2 text-sm",
        active
          ? "bg-surface-2 font-semibold text-text"
          : "font-medium text-text-muted hover:bg-surface-2 hover:text-text",
      ].join(" ")}
    >
      {label}
    </Link>
  )
}

function Navigation({ items, pathname, onClick, compact = false }: {
  items: NavItem[]
  pathname: string
  onClick?: () => void
  compact?: boolean
}) {
  return (
    <div className={`flex items-center gap-0.5 ${compact ? "flex-wrap" : ""}`}>
      {items.map(item => (
        <NavLink key={item.href} {...item} pathname={pathname} onClick={onClick} compact={compact} />
      ))}
    </div>
  )
}

function SwitchProductMenu() {
  return (
    <div>
      <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-text-faint">Byt produkt</span>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
        {APP_LINKS.filter(app => app.id !== "flux").map(app => (
          <a key={app.id} href={appHref(app.id)} className="text-sm text-text-muted no-underline hover:text-text hover:underline">
            {app.name}
          </a>
        ))}
      </div>
    </div>
  )
}

function UserSummaryRow({ userName }: { userName: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <Avatar name={userName} size={24} />
      <span className="text-sm text-text-muted">{userName}</span>
    </div>
  )
}

function LogoutButton({ className }: { className: string }) {
  return (
    <button
      type="button"
      onClick={() => void logout().then(() => { window.location.href = "/login" })}
      className={className}
    >
      Logga ut
    </button>
  )
}

function ProjectSelector({ dropUp = false, compact = false }: { dropUp?: boolean; compact?: boolean }) {
  const projects = useFluxProjects()
  const { selectedProject, selectProject } = useSelectedFluxProject()
  const { open, setOpen, ref } = useDismissableOpen<HTMLDivElement>()

  return (
    <div ref={ref} className="relative">
      <div className={compact ? "flex items-center rounded-xl text-xs font-semibold" : "flex items-center rounded-2xl text-sm font-semibold"}>
        {selectedProject ? (
          <Link
            href={`/projects/${selectedProject.id}`}
            aria-label={`Öppna projektet ${selectedProject.name}`}
            className={compact ? "max-w-28 truncate rounded-l-xl px-2 py-2 text-text no-underline hover:bg-surface-2" : "max-w-40 truncate rounded-l-2xl px-3 py-2 text-text no-underline hover:bg-surface-2"}
          >
            {selectedProject.name}
          </Link>
        ) : (
          <span className={compact ? "px-2 py-2 text-text-faint" : "px-3 py-2 text-text-faint"}>Projekt</span>
        )}
        <button
          type="button"
          aria-expanded={open}
          aria-label="Välj projekt"
          onClick={() => setOpen(value => !value)}
          className={compact ? "rounded-r-xl px-1.5 py-2 text-text-faint hover:bg-surface-2" : "rounded-r-2xl px-2 py-2 text-text-faint hover:bg-surface-2"}
        >
          <ChevronDown size={compact ? 13 : 15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      {open && (
        <div className={`absolute ${dropUp ? "bottom-full mb-2" : "top-full mt-2"} left-0 z-50 min-w-52 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-md`}>
          {projects.map(project => (
            <button
              key={project.id}
              type="button"
              onClick={() => { setOpen(false); if (project.id !== selectedProject?.id) selectProject(String(project.id)) }}
              className="block w-full truncate px-3 py-2 text-left text-sm text-text hover:bg-surface-2"
            >
              {project.name}
            </button>
          ))}
          <Link href="/projects" onClick={() => setOpen(false)} className="block border-t border-border px-3 py-2 text-sm text-text-muted no-underline hover:bg-surface-2">
            Alla projekt
          </Link>
        </div>
      )}
    </div>
  )
}

function NotificationButton({ dropUp = false }: { dropUp?: boolean }) {
  return (
    <NotificationMenu align={dropUp ? "left" : "right"} dropUp={dropUp}>
      {({ unreadCount, notificationLabel, toggle, isOpen }) => (
        <button type="button" onClick={toggle} className={`relative flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-text hover:bg-surface-2 ${isOpen ? "bg-surface-2" : ""}`}>
          <Bell size={16} aria-hidden />
          Aviseringar
          {unreadCount > 0 && <span className="ml-auto min-w-4 rounded-full bg-accent px-1 text-center text-[10px] font-bold leading-4 text-accent-contrast">{notificationLabel}</span>}
        </button>
      )}
    </NotificationMenu>
  )
}

function OverflowMenu({ mode, onToggleMode, userName, user, pathname, onClose }: {
  mode: "light" | "dark" | null
  onToggleMode: () => void
  userName: string
  user: User | null
  pathname: string
  onClose: () => void
}) {
  return (
    <div className="absolute right-0 top-full z-50 mt-2 flex min-w-56 flex-col rounded-xl border border-border bg-surface p-2 shadow-md">
      <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-faint">Verktyg och konto</div>
      <NavLink {...TIMELINE_LINK} pathname={pathname} onClick={onClose} />
      <Link href="/projects" onClick={onClose} className="rounded-md px-3 py-2 text-sm text-text no-underline hover:bg-surface-2">Projekt</Link>
      <button type="button" onClick={() => { onToggleMode(); onClose() }} className="rounded-md px-3 py-2 text-left text-sm text-text hover:bg-surface-2">{mode === "dark" ? "Ljust läge" : "Mörkt läge"}</button>
      <NotificationButton />
      <div className="my-1 border-t border-border" />
      <UserSummaryRow userName={userName} />
      {user && <LogoutButton className="rounded-md px-3 py-2 text-left text-sm text-text hover:bg-surface-2" />}
      <div className="mt-1 border-t border-border px-3 py-2"><SwitchProductMenu /></div>
    </div>
  )
}

export default function Toolbar({ mode, onToggleMode }: { mode: "light" | "dark" | null; onToggleMode: () => void }) {
  const pathname = usePathname()
  const user = useUser()
  const userName = user ? formatUserName(user) : "?"
  const { selectedProject } = useSelectedFluxProject()
  const buildNav = selectedProject?.include_identity ? [...BUILD_NAV, IDENTITY_NAV] : BUILD_NAV
  const [openMenu, setOpenMenu] = useState<"desktop" | "mobile" | null>(null)
  const [drawer, setDrawer] = useState<"task" | "project" | null>(null)
  const create = () => {
    setOpenMenu(null)
    setDrawer(pathname === "/projects" ? "project" : "task")
  }
  const closeMobile = () => setOpenMenu(null)
  const desktopMenuOpen = openMenu === "desktop"
  const mobileMenuOpen = openMenu === "mobile"

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-5 z-40 hidden justify-center sm:flex">
        <div className="pointer-events-auto relative">
          <nav aria-label="Flux huvudnavigation" className="flex items-center gap-2 rounded-[32px] border border-border bg-surface px-3 py-2 shadow-md">
            <Link href="/" className="flex shrink-0 items-center gap-1.5 px-2 no-underline" aria-label="Flux startsida">
              <Logo width={48} className="text-accent" />
              <span className="flex flex-col"><span className="font-display text-xl font-bold leading-4 tracking-tight text-text">flux</span><span className="text-[6px] font-medium text-text-muted">ORIGO {ORIGO_VERSION}</span></span>
            </Link>
            <div className="h-7 w-px bg-border" />
            <ProjectSelector />
            <div className="h-7 w-px bg-border" />
            <Navigation items={buildNav} pathname={pathname} />
            <Button variant="primary" size="sm" onClick={create} className="ml-1 rounded-2xl"><Plus size={16} aria-hidden />Ny</Button>
            <button type="button" aria-label="Öppna verktyg och konto" aria-expanded={desktopMenuOpen} onClick={() => setOpenMenu(value => value === "desktop" ? null : "desktop")} className={`flex size-9 items-center justify-center rounded-full ${desktopMenuOpen ? "bg-surface-2" : "hover:bg-surface-2"}`}><Ellipsis size={18} className="text-text-muted" /></button>
          </nav>
          {desktopMenuOpen && <OverflowMenu mode={mode} onToggleMode={onToggleMode} userName={userName} user={user} pathname={pathname} onClose={() => setOpenMenu(null)} />}
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-3 z-40 flex justify-center px-3 sm:hidden">
        <div className="pointer-events-auto relative w-full max-w-md">
          {mobileMenuOpen && (
            <div className="absolute inset-x-0 bottom-16 z-20 rounded-2xl border border-border bg-surface p-2 shadow-md">
              <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-faint">Flux navigation</div>
              <NavLink {...BUILD_NAV[0]} pathname={pathname} onClick={closeMobile} compact />
              {selectedProject?.include_identity && <NavLink {...IDENTITY_NAV} pathname={pathname} onClick={closeMobile} compact />}
              <NavLink {...TIMELINE_LINK} pathname={pathname} onClick={closeMobile} compact />
              <Button variant="primary" size="sm" onClick={create} className="mt-1 w-full justify-center rounded-md"><Plus size={16} aria-hidden />Ny uppgift</Button>
              <div className="my-1 border-t border-border" />
              <NotificationButton dropUp />
              <button type="button" onClick={() => { onToggleMode(); closeMobile() }} className="flex w-full rounded-md px-3 py-2 text-left text-sm text-text hover:bg-surface-2">{mode === "dark" ? "Ljust läge" : "Mörkt läge"}</button>
              <div className="my-1 border-t border-border" />
              <div className="px-3 py-2"><SwitchProductMenu /></div>
              <div className="my-1 border-t border-border" />
              <UserSummaryRow userName={userName} />
              {user && <LogoutButton className="block w-full rounded-md px-3 py-2 text-left text-sm text-text hover:bg-surface-2" />}
            </div>
          )}
          <nav aria-label="Flux huvudnavigation" className="flex items-center justify-between gap-1 rounded-3xl border border-border bg-surface px-2 py-2 shadow-md">
            <Link href="/" className="flex shrink-0 items-center px-1 no-underline" aria-label="Flux startsida"><Logo width={38} className="text-accent" /></Link>
            <ProjectSelector dropUp compact />
            <button type="button" aria-label="Öppna Flux navigation" aria-expanded={mobileMenuOpen} onClick={() => setOpenMenu(value => value === "mobile" ? null : "mobile")} className={`rounded-full p-2 ${mobileMenuOpen ? "bg-surface-2 text-text" : "text-text-muted"}`}><Ellipsis size={18} /></button>
          </nav>
        </div>
      </div>

      <TaskFormDrawer open={drawer === "task"} onClose={() => setDrawer(null)} />
      <ProjectFormDrawer open={drawer === "project"} onClose={() => setDrawer(null)} />
    </>
  )
}

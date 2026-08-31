"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { logout } from "@/app/actions/auth"
import { Icon } from "@/app/components/ui/Icon"
import { NotificationMenu } from "@/app/components/ui/NotificationMenu"
import { useTempusGeoAreas } from "@/app/lib/tempus-context"
import { useUser } from "@/app/lib/user-context"
import QuickObservation from "./observationer/quick-observation"
import Logo from "./ui/Logo"

type NavProps = {
  mode: "light" | "dark" | null
  onToggleMode: () => void
}

const primaryLinks = [
  { href: "/", label: "Översikt", icon: "home" },
  { href: "/rutt", label: "Rutt", icon: "route" },
  { href: "/checklistor", label: "Checklistor", icon: "list-checks" },
  { href: "/observationer", label: "Observationer", icon: "binoculars" },
  { href: "/birdnet", label: "Birdnet", icon: "bird" },
  { href: "/taxa", label: "Taxonomier", icon: "leaf" },
] as const

const isActiveLink = (pathname: string, href: string) =>
  href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)

type FieldIconName = (typeof primaryLinks)[number]["icon"] | "folio"

function FieldIcon({ name, className = "" }: { name: FieldIconName; className?: string }) {
  const line = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "square" as const,
    strokeLinejoin: "miter" as const,
    strokeWidth: 1.25,
  }

  return (
    <svg aria-hidden="true" className={`size-6 [shape-rendering:geometricPrecision] ${className}`} viewBox="0 0 24 24">
      {name === "home" ? (
        <>
          <path {...line} d="m4.3 5.7 5.9-1.8 5.6 1.9 4.1-1.4v14.1l-4.1 1.4-5.6-1.9-5.9 1.8Z" />
          <path {...line} d="m10.2 3.9.1 14.1m5.5-12.2.1 14.2M6 8.9c1.2-.7 2.1-.8 3.1-.6m-3.2 3.1c1.3-.7 2.2-.8 3.2-.6m3.1-2.1c1.2-.4 2.1-.2 2.9.3m2.6-1.1 1.1-.4m-1.1 3.1 1.1-.4" />
        </>
      ) : name === "route" ? (
        <>
          <path {...line} strokeDasharray="2 1.45" d="M4.7 18.4c2.4-5.9 4.4-10.7 7.5-10.7 2.6 0 2.6 3.6 6 3.6" />
          <circle {...line} cx="4.7" cy="18.4" r="1.6" />
          <path {...line} d="M17 9.1h2.5v2.5H17zM12 3.2l.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7Z" />
        </>
      ) : name === "list-checks" ? (
        <>
          <path {...line} d="M4.5 4.3h15v15.4h-15Z" />
          <path {...line} d="M8.5 8h7.8M8.5 12h7.8M8.5 16h5.1M6.1 7.1v1.8M6.1 11.1v1.8M6.1 15.1v1.8" />
          <path fill="currentColor" d="M5.55 6.55h1.1v.9h-1.1zm0 4h1.1v.9h-1.1zm0 4h1.1v.9h-1.1z" />
        </>
      ) : name === "binoculars" ? (
        <>
          <path {...line} d="M5.1 6.2h5.2l1.7 3 1.7-3h5.2l1.2 10.3H3.9Z" />
          <circle {...line} cx="7.1" cy="15.5" r="3.2" />
          <circle {...line} cx="16.9" cy="15.5" r="3.2" />
          <path {...line} d="M10.3 8.6h3.4m-2.5 3.7h1.6" />
        </>
      ) : name === "bird" ? (
        <>
          <path {...line} d="M5.1 14.7c1.2-3.2 3.6-5.1 7-5.4 1.6-.1 3 .3 4.2 1.1l1.6-1 .8 1.3-1.2.7c.2.5.3 1.1.3 1.7 0 2.7-2.2 4.9-5 4.9-1.7 0-3.1-.7-4.1-1.9l-2.3 1.2-1-1.8 1.7-1c-.2-.6-.2-1.2 0-1.8Z" />
          <circle {...line} cx="14.7" cy="11" r=".55" />
          <path {...line} d="M10.7 15.6h-2m6.9 1.7 1.3 1.4" />
        </>
      ) : name === "folio" ? (
        <>
          <path {...line} d="M4.2 5.5c2.8-.7 5.3-.2 7.8 1.4 2.5-1.6 5-2.1 7.8-1.4v13c-2.8-.7-5.3-.2-7.8 1.4-2.5-1.6-5-2.1-7.8-1.4Z" />
          <path {...line} d="M12 6.9v13m-5-10.5h2.5M7 12h2.5m5 0H17m-2.5 2.6H17m-9.5 2.6h2.5" />
        </>
      ) : (
        <>
          <path {...line} d="M12 20.5V5.4M12 12.4C9.7 8.4 7.4 7.1 5.1 6.5c.1 3.4 1.4 5.8 4.3 7.1M12 15.4c2.6-4.1 4.8-5.3 6.9-5.6-.4 3-1.8 5-4.6 6.2" />
          <path {...line} d="m6.6 17.9 2.2-1.5m8.6.6-2.1-1.6M8 9.2l1.7 1M16.3 12l-1.8 1.1" />
        </>
      )}
    </svg>
  )
}

function GeoAreaSelector({ compact = false }: { compact?: boolean }) {
  const { geoAreas, selectedGeoArea, selectGeoArea } = useTempusGeoAreas()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const allSweden = selectedGeoArea === null

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  return (
    <div ref={ref} className={`relative ${compact ? "w-full" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={`Välj område: ${selectedGeoArea?.name ?? "Hela Sverige"}`}
        className={`flex items-center gap-1.5 rounded-md text-sm text-text-muted transition-colors hover:bg-accent-wash hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${compact ? "h-14 w-full justify-between border border-border bg-surface-raised px-3" : "max-w-44 px-2.5 py-2"}`}
      >
        {compact ? (
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-wash text-accent">
              <Icon name="map-pin" size={15} />
            </span>
            <span className="flex min-w-0 flex-col items-start">
              <span className="font-mono text-[10px] uppercase tracking-wide text-text-faint">Område</span>
              <span className="max-w-full truncate font-medium text-text">
                {selectedGeoArea?.name ?? "Hela Sverige"}
              </span>
            </span>
          </span>
        ) : (
          <span className="truncate">{selectedGeoArea?.name ?? "Hela Sverige"}</span>
        )}
        <Icon
          name="chevron-down"
          size={14}
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className={`absolute z-50 min-w-52 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-md ${compact ? "inset-x-0 bottom-full mb-1" : "right-0 top-full mt-1"}`}>
          <button
            type="button"
            aria-pressed={allSweden}
            onClick={() => {
              setOpen(false)
              if (!allSweden) selectGeoArea(null)
            }}
            className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent-wash ${allSweden ? "font-semibold text-accent" : "text-text"}`}
          >
            Hela Sverige
            {allSweden ? <Icon name="check" size={16} /> : null}
          </button>
          {geoAreas.length > 0 ? <div className="my-1 border-t border-border" /> : null}
          {geoAreas.map((geoArea) => (
            <button
              key={geoArea.id}
              type="button"
              onClick={() => {
                setOpen(false)
                if (geoArea.id !== selectedGeoArea?.id) selectGeoArea(geoArea.id)
              }}
              className={`flex w-full items-center justify-between gap-3 whitespace-nowrap px-3 py-2 text-left text-sm hover:bg-accent-wash hover:text-accent ${geoArea.id === selectedGeoArea?.id ? "font-semibold text-accent" : "text-text-muted"
                }`}
            >
              {geoArea.name}
              {geoArea.id === selectedGeoArea?.id ? <Icon name="check" size={16} /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default function Nav({ mode, onToggleMode }: NavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const user = useUser()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [menuOpen])

  return (
    <>
      <nav
        aria-label="Huvudnavigation"
        className="sticky top-0 z-40 flex min-h-0 items-center border-0 bg-transparent shadow-none sm:min-h-18 sm:border-b sm:border-border sm:bg-surface/95 sm:shadow-[0_1px_0_rgba(var(--shadow-color),0.05)] sm:backdrop-blur"
      >
        <div className="container relative flex min-h-0 w-full items-center gap-0  sm:min-h-18 sm:gap-6">
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className="hidden shrink-0 items-center gap-2 no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring sm:flex"
          >
            <Logo height={42} className="text-text" />
            <span className="hidden font-display text-2xl font-semibold tracking-tight text-text sm:inline">
              Tempus
            </span>
          </Link>

          <div className="hidden min-w-0 flex-1 items-center gap-1 xl:flex">
            {primaryLinks.map((link) => {
              const active = isActiveLink(pathname, link.href)

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-18 items-center border-b-2 px-3 text-sm no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-focus-ring ${active
                    ? "border-accent font-semibold text-text"
                    : "border-transparent text-text-muted hover:border-border-strong hover:text-text"
                    }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>

          <div className="ml-auto flex items-center gap-1">
            <div className="hidden sm:block">
              <GeoAreaSelector />
            </div>
            <div className="hidden sm:block">
              <QuickObservation />
            </div>
            <div className="hidden items-center gap-1 border-l border-border pl-1 sm:flex">
              {user ? (
                <NotificationMenu>
                  {({ unreadCount, notificationLabel, toggle }) => (
                    <button
                      type="button"
                      onClick={toggle}
                      aria-label="Visa notifikationer"
                      title="Notifikationer"
                      className="relative flex size-10 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-accent-wash hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                    >
                      <Icon name="bell" size={18} />
                      {unreadCount > 0 && (
                        <span className="absolute right-0.5 top-0.5 flex min-w-4 h-4 items-center justify-center rounded-full bg-accent px-0.5 text-[9px] font-semibold text-accent-contrast ring-2 ring-surface">
                          {notificationLabel}
                        </span>
                      )}
                    </button>
                  )}
                </NotificationMenu>
              ) : null}
              <button
                type="button"
                onClick={onToggleMode}
                aria-label={mode === "dark" ? "Använd ljust läge" : "Använd mörkt läge"}
                title={mode === "dark" ? "Ljust läge" : "Mörkt läge"}
                className="flex size-10 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-accent-wash hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              >
                <Icon name={mode === "dark" ? "sun" : "moon"} size={18} />
              </button>
              {user ? (
                <button
                  type="button"
                  onClick={async () => {
                    await logout()
                    router.replace("/login")
                  }}
                  aria-label="Logga ut"
                  title="Logga ut"
                  className="flex size-10 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-accent-wash hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                >
                  <Icon name="log-out" size={18} />
                </button>
              ) : (
                <Link
                  href="/login"
                  aria-label="Logga in"
                  title="Logga in"
                  className="flex size-10 items-center justify-center rounded-md text-text-muted no-underline transition-colors hover:bg-accent-wash hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                >
                  <Icon name="log-in" size={18} />
                </Link>
              )}
            </div>
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-controls="tempus-responsive-menu"
              aria-label={menuOpen ? "Stäng meny" : "Öppna meny"}
              onClick={() => setMenuOpen((current) => !current)}
              className="hidden size-10 items-center justify-center rounded-md border border-border text-text-muted transition-colors hover:border-border-strong hover:bg-accent-wash hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:flex xl:hidden"
            >
              <Icon name={menuOpen ? "x" : "menu"} size={19} />
            </button>
          </div>

          {menuOpen ? (
            <>
              <button
                type="button"
                aria-label="Stäng meny"
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-10 cursor-default bg-black/10 backdrop-blur-[1px] xl:hidden"
              />
              <section
                id="tempus-responsive-menu"
                aria-label="Kompaktmeny"
                className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-lg border border-border bg-surface p-2 shadow-lg sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-20 sm:top-[calc(100%-4px)] sm:w-80 xl:hidden"
              >
                <nav aria-label="Sidnavigation" className="hidden gap-1 sm:grid">
                  <p className="px-3 pb-1 pt-2 font-mono text-[10px] uppercase tracking-wide text-text-faint">
                    Sidor
                  </p>
                  {primaryLinks.map((link) => {
                    const active = isActiveLink(pathname, link.href)
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setMenuOpen(false)}
                        className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm no-underline transition-colors focus-visible:outline-2 focus-visible:outline-focus-ring ${active
                          ? "font-semibold text-accent"
                          : "text-text-muted hover:bg-accent-wash hover:text-text"
                          }`}
                      >
                        <FieldIcon name={link.icon} className="size-5" />
                        {link.label}
                      </Link>
                    )
                  })}
                  <div className="my-2 border-t border-border" />
                </nav>

                <nav aria-label="Fler sidor" className="grid gap-1 sm:hidden">
                  <p className="px-3 pb-1 pt-2 font-mono text-[10px] uppercase tracking-wide text-text-faint">
                    Sidor
                  </p>
                  {primaryLinks.filter((link) => link.href === "/observationer" || link.href === "/birdnet" || link.href === "/taxa").map((link) => {
                    const active = isActiveLink(pathname, link.href)
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setMenuOpen(false)}
                        className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm no-underline transition-colors focus-visible:outline-2 focus-visible:outline-focus-ring ${active
                          ? "font-semibold text-accent"
                          : "text-text-muted hover:bg-accent-wash hover:text-text"
                          }`}
                      >
                        <FieldIcon name={link.icon} className="size-5" />
                        {link.label}
                      </Link>
                    )
                  })}
                  <div className="my-2 border-t border-border" />
                </nav>

                <div className="grid gap-1">
                  <p className="px-3 pb-1 pt-2 font-mono text-[10px] uppercase tracking-wide text-text-faint">
                    Inställningar
                  </p>
                  <button
                    type="button"
                    onClick={onToggleMode}
                    className="flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-text-muted transition-colors hover:bg-accent-wash hover:text-accent focus-visible:outline-2 focus-visible:outline-focus-ring"
                  >
                    <Icon name={mode === "dark" ? "sun" : "moon"} size={18} />
                    {mode === "dark" ? "Ljust läge" : "Mörkt läge"}
                  </button>
                  {user ? (
                    <NotificationMenu dropUp align="left">
                      {({ unreadCount, notificationLabel, toggle }) => (
                        <button
                          type="button"
                          onClick={toggle}
                          className="flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-text-muted transition-colors hover:bg-accent-wash hover:text-accent focus-visible:outline-2 focus-visible:outline-focus-ring"
                        >
                          <span className="relative">
                            <Icon name="bell" size={18} />
                            {unreadCount > 0 && (
                              <span className="absolute -right-2 -top-2 flex min-w-4 h-4 items-center justify-center rounded-full bg-accent px-0.5 text-[9px] font-semibold text-accent-contrast ring-2 ring-surface">
                                {notificationLabel}
                              </span>
                            )}
                          </span>
                          Notifikationer
                        </button>
                      )}
                    </NotificationMenu>
                  ) : null}
                  {user ? (
                    <button
                      type="button"
                      onClick={async () => {
                        await logout()
                        router.replace("/login")
                      }}
                      className="flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-text-muted transition-colors hover:bg-accent-wash hover:text-accent focus-visible:outline-2 focus-visible:outline-focus-ring"
                    >
                      <Icon name="log-out" size={18} />
                      Logga ut
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      onClick={() => setMenuOpen(false)}
                      className="flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-text-muted no-underline transition-colors hover:bg-accent-wash hover:text-accent focus-visible:outline-2 focus-visible:outline-focus-ring"
                    >
                      <Icon name="log-in" size={18} />
                      Logga in
                    </Link>
                  )}
                  <GeoAreaSelector compact />
                </div>
              </section>
            </>
          ) : null}
        </div>
      </nav>

      <nav
        aria-label="Mobilnavigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_18px_rgba(var(--shadow-color),0.12)] sm:hidden"
      >
        <div className="mx-auto grid h-[4.5rem] max-w-md grid-cols-5 px-1.5">
          <Link
            href="/"
            aria-current={pathname === "/" ? "page" : undefined}
            className={`group flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-md no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-focus-ring ${pathname === "/" ? "text-accent" : "text-text-muted hover:bg-accent-wash hover:text-text"}`}
          >
            <span className={`flex size-9 items-center justify-center rounded-sm border transition-all ${pathname === "/" ? "border-accent/60 bg-surface" : "border-transparent group-hover:border-border"}`}>
              <Logo height={27} />
            </span>
            <span className={`font-mono text-[9px] uppercase tracking-[0.04em] ${pathname === "/" ? "font-semibold" : ""}`}>
              Översikt
            </span>
          </Link>

          <Link
            href="/rutt"
            aria-current={isActiveLink(pathname, "/rutt") ? "page" : undefined}
            className={`group flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-md no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-focus-ring ${isActiveLink(pathname, "/rutt") ? "text-accent" : "text-text-muted hover:bg-accent-wash hover:text-text"}`}
          >
            <span className={`flex size-9 items-center justify-center rounded-sm border transition-all ${isActiveLink(pathname, "/rutt") ? "border-accent/60 bg-surface" : "border-transparent group-hover:border-border"}`}>
              <FieldIcon name="route" />
            </span>
            <span className={`font-mono text-[9px] uppercase tracking-[0.04em] ${isActiveLink(pathname, "/rutt") ? "font-semibold" : ""}`}>
              Rutt
            </span>
          </Link>

          <div className="flex min-w-0 flex-col items-center justify-center gap-0.5 text-text-muted [&>button]:border [&>button]:border-accent/50 [&>button]:shadow-sm">
            <QuickObservation />
            <span className="font-mono text-[9px] uppercase tracking-[0.04em]">Snabbobs.</span>
          </div>

          <Link
            href="/checklistor"
            aria-current={isActiveLink(pathname, "/checklistor") ? "page" : undefined}
            className={`group flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-md no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-focus-ring ${isActiveLink(pathname, "/checklistor") ? "text-accent" : "text-text-muted hover:bg-accent-wash hover:text-text"}`}
          >
            <span className={`flex size-9 items-center justify-center rounded-sm border transition-all ${isActiveLink(pathname, "/checklistor") ? "border-accent/60 bg-surface" : "border-transparent group-hover:border-border"}`}>
              <FieldIcon name="list-checks" />
            </span>
            <span className={`max-w-full truncate font-mono text-[9px] uppercase tracking-[0.04em] ${isActiveLink(pathname, "/checklistor") ? "font-semibold" : ""}`}>
              Checklistor
            </span>
          </Link>

          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="tempus-responsive-menu"
            onClick={() => setMenuOpen((current) => !current)}
            className={`group flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-focus-ring ${menuOpen ? "text-accent" : "text-text-muted hover:bg-accent-wash hover:text-text"}`}
          >
            <span className={`flex size-9 items-center justify-center rounded-sm border transition-all ${menuOpen ? "border-accent/60 bg-surface" : "border-transparent group-hover:border-border"}`}>
              <FieldIcon name="folio" />
            </span>
            <span className={`font-mono text-[9px] uppercase tracking-[0.04em] ${menuOpen ? "font-semibold" : ""}`}>
              Mer
            </span>
          </button>
        </div>
      </nav>
    </>
  )
}

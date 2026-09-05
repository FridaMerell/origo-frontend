import { useRouter } from "next/navigation"
import { AppLink as Link } from "@/app/components/ui/AppLink"
import { logout } from "@/app/actions/auth"
import { NotificationMenu } from "@/app/components/ui/NotificationMenu"
import type { User } from "@/app/lib/dal"
import QuickObservation from "../observationer/quick-observation"
import Logo from "../ui/Logo"
import { FieldIcon, isActiveLink, mainLinks, moreLinks, primaryLinks } from "./nav-links"
import { GeoAreaSelector } from "./geo-area-selector"
import { useDismissableOpen } from "@/app/components/ui/use-dismissable-open"
import { Bell, ChevronDown, LogOut, Menu, Moon, Search, Settings, Sun, X } from "lucide-react"

export function DesktopNav({
  pathname,
  user,
  mode,
  onToggleMode,
  menuOpen,
  setMenuOpen,
  onOpenSpeciesSearch,
}: {
  pathname: string
  user: User | null
  mode: "light" | "dark" | null
  onToggleMode: () => void
  menuOpen: boolean
  setMenuOpen: (value: boolean | ((current: boolean) => boolean)) => void
  onOpenSpeciesSearch: () => void
}) {
  const router = useRouter()
  const more = useDismissableOpen<HTMLDivElement>()
  const actions = useDismissableOpen<HTMLDivElement>()

  return (
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
          {mainLinks.map((link) => {
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
          <div ref={more.ref} className="relative">
            <button
              type="button"
              aria-expanded={more.open}
              aria-controls="tempus-more-menu"
              onClick={() => more.setOpen((current) => !current)}
              className={`flex h-18 items-center gap-1 border-b-2 px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-focus-ring ${more.open
                ? "border-accent font-semibold text-text"
                : "border-transparent text-text-muted hover:border-border-strong hover:text-text"
                }`}
            >
              Mer
              <ChevronDown size={14} className={`transition-transform ${more.open ? "rotate-180" : ""}`} />
            </button>
            {more.open ? (
              <div
                id="tempus-more-menu"
                className="absolute left-0 top-full z-50 min-w-44 rounded-md border border-border bg-surface p-1 shadow-lg"
              >
                {moreLinks.map((link) => {
                  const active = isActiveLink(pathname, link.href)
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => more.setOpen(false)}
                      className={`flex min-h-10 items-center gap-2 rounded-md px-3 text-sm no-underline transition-colors focus-visible:outline-2 focus-visible:outline-focus-ring ${active
                        ? "font-semibold text-accent"
                        : "text-text-muted hover:bg-accent-wash hover:text-text"
                        }`}
                    >
                      <FieldIcon name={link.icon} className="size-4" />
                      {link.label}
                    </Link>
                  )
                })}
              </div>
            ) : null}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenSpeciesSearch}
            aria-label="Öppna artsök"
            title="Artsök"
            className="hidden h-10 items-center gap-2 rounded-md px-2.5 text-sm text-text-muted transition-colors hover:bg-accent-wash hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:flex"
          >
            <Search size={18} />
            <span className="hidden 2xl:inline">Artsök</span>
          </button>
          <div className="hidden sm:block">
            <GeoAreaSelector />
          </div>
          <div className="hidden sm:block">
            <QuickObservation />
          </div>
          <div ref={actions.ref} className="relative hidden border-l border-border pl-1 sm:block">
            <button
              type="button"
              aria-expanded={actions.open}
              aria-controls="tempus-actions-menu"
              aria-label="Öppna konto och inställningar"
              title="Konto och inställningar"
              onClick={() => actions.setOpen((current) => !current)}
              className="flex size-10 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-accent-wash hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              <Settings size={18} />
            </button>
            {actions.open ? (
              <div
                id="tempus-actions-menu"
                className="absolute right-0 top-full z-50 mt-1 min-w-56 rounded-md border border-border bg-surface p-1 shadow-lg"
              >
                {user ? (
                  <NotificationMenu align="right">
                    {({ unreadCount, notificationLabel, toggle }) => (
                      <button
                        type="button"
                        onClick={toggle}
                        className="flex h-11 w-full items-center justify-between gap-3 rounded-md px-3 text-left text-sm text-text-muted transition-colors hover:bg-accent-wash hover:text-accent focus-visible:outline-2 focus-visible:outline-focus-ring"
                      >
                        <span className="flex items-center gap-3"><Bell size={18} />Notifikationer</span>
                        {unreadCount > 0 ? <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-contrast">{notificationLabel}</span> : null}
                      </button>
                    )}
                  </NotificationMenu>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    onToggleMode()
                    actions.setOpen(false)
                  }}
                  className="flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-text-muted transition-colors hover:bg-accent-wash hover:text-accent focus-visible:outline-2 focus-visible:outline-focus-ring"
                >
                   {mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                  {mode === "dark" ? "Ljust läge" : "Mörkt läge"}
                </button>
                {user ? <div className="my-1 border-t border-border" /> : null}
                {user ? (
                  <button
                    type="button"
                    onClick={async () => {
                      await logout()
                      router.replace("/login")
                    }}
                    className="flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-text-muted transition-colors hover:bg-accent-wash hover:text-danger focus-visible:outline-2 focus-visible:outline-focus-ring"
                  >
                    <LogOut size={18} />
                    Logga ut
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="tempus-responsive-menu"
            aria-label={menuOpen ? "Stäng meny" : "Öppna meny"}
            onClick={() => setMenuOpen((current) => !current)}
            className="hidden size-10 items-center justify-center rounded-md border border-border text-text-muted transition-colors hover:border-border-strong hover:bg-accent-wash hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:flex xl:hidden"
          >
            {
              menuOpen ? <X size={19} /> : <Menu size={19} />
            }
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

              <div className="grid gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onOpenSpeciesSearch()
                  }}
                  className="flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-text-muted transition-colors hover:bg-accent-wash hover:text-accent focus-visible:outline-2 focus-visible:outline-focus-ring"
                >
                  <Search size={18} />
                  Artsök
                </button>
                <p className="px-3 pb-1 pt-2 font-mono text-[10px] uppercase tracking-wide text-text-faint">
                  Inställningar
                </p>
                <button
                  type="button"
                  onClick={onToggleMode}
                  className="flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-text-muted transition-colors hover:bg-accent-wash hover:text-accent focus-visible:outline-2 focus-visible:outline-focus-ring"
                >
                  {mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
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
                          <Bell size={18} />
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
                    <LogOut size={18} />
                    Logga ut
                  </button>
                ) : null}
                <GeoAreaSelector compact />
              </div>
            </section>
          </>
        ) : null}
      </div>
    </nav>
  )
}

import { useRouter } from "next/navigation"
import { AppLink as Link } from "@/app/components/ui/AppLink"
import { logout } from "@/app/actions/auth"
import type { User } from "@/app/lib/dal"
import QuickObservation from "../observationer/quick-observation"
import Logo from "../ui/Logo"
import { FieldIcon, isActiveLink, mainLinks, moreLinks, primaryLinks } from "./nav-links"
import { GeoAreaSelector } from "./geo-area-selector"
import { NotificationMenu } from "@/app/components/ui/NotificationMenu"
import { useDismissableOpen } from "@/app/components/ui/use-dismissable-open"
import { Bell, ChevronDown, LogIn, LogOut, Menu, Moon, Search, Settings, Sun, X } from "lucide-react"

const MENU_ITEM_CLASS =
  "flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-text-muted transition-colors hover:bg-accent-wash hover:text-accent focus-visible:outline-2 focus-visible:outline-focus-ring"
const MENU_HEADING_CLASS =
  "px-3 pb-1 pt-2 font-mono text-[10px] uppercase tracking-wide text-text-faint"

function ModeToggleContent({ mode }: { mode: "light" | "dark" | null }) {
  return (
    <>
      {mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      {mode === "dark" ? "Ljust läge" : "Mörkt läge"}
    </>
  )
}

// The menu row that opens the notifications, with the unread count on the bell.
function NotificationsTrigger({
  className,
  unreadCount,
  label,
  onClick,
}: {
  className: string
  unreadCount: number
  label: string | number
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} className={className}>
      <span className="relative">
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-0.5 text-[9px] font-semibold text-accent-contrast ring-2 ring-surface">
            {label}
          </span>
        )}
      </span>
      Notifikationer
    </button>
  )
}

function PrimaryLinks({
  label,
  className,
  pathname,
  onNavigate,
}: {
  label: string
  className: string
  pathname: string
  onNavigate: () => void
}) {
  return (
    <nav aria-label={label} className={className}>
      <p className={MENU_HEADING_CLASS}>Sidor</p>
      {primaryLinks.map((link) => {
        const active = isActiveLink(pathname, link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
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
  )
}

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

  const handleLogout = async () => {
    await logout()
    router.replace("/login")
  }

  return (
    <nav
      aria-label="Huvudnavigation"
      className="sticky top-0 z-40 flex min-h-0 items-center border-0 bg-transparent shadow-none sm:min-h-18 sm:border-b sm:border-border sm:bg-surface/95 sm:shadow-[0_1px_0_rgba(var(--shadow-color),0.05)] sm:backdrop-blur"
    >
      <div className="container relative flex min-h-0 w-full items-center gap-0 sm:min-h-18 sm:gap-6">
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

        <div className="hidden min-w-0 flex-1 items-center gap-8 pl-10 xl:flex">
          {mainLinks.map((link) => {
            const active = isActiveLink(pathname, link.href)

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`group flex h-18 items-center gap-2 font-display text-[17px] font-medium no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-focus-ring ${active
                  ? "font-semibold text-text"
                  : "text-text-muted hover:text-text"
                  }`}
              >
                <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${active ? "bg-accent" : "bg-transparent group-hover:bg-text"}`} />
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
              className={`flex h-18 items-center gap-1 font-display text-[17px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-focus-ring ${more.open
                ? "text-text"
                : "text-text-muted hover:text-text"
                }`}
            >
              Mer
              <ChevronDown size={14} className={`transition-transform ${more.open ? "rotate-180" : ""}`} />
            </button>
            {more.open ? (
              <div
                id="tempus-more-menu"
                className="absolute left-0 top-full z-50 min-w-44 rounded-md border border-border bg-surface p-1 shadow-lg transition-[opacity,translate] duration-150 ease-(--ease-standard) starting:-translate-y-1 starting:opacity-0 motion-reduce:transition-none"
              >
                {moreLinks.map((link) => {
                  const active = isActiveLink(pathname, link.href)
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => more.setOpen(false)}
                      className={`group flex min-h-10 items-center gap-2 px-3 font-display text-[17px] no-underline transition-colors focus-visible:outline-2 focus-visible:outline-focus-ring ${active
                        ? "font-semibold text-text"
                        : "font-medium text-text hover:text-text"
                        }`}
                    >
                      <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${active ? "bg-accent" : "bg-transparent group-hover:bg-text"}`} />
                      {link.label}
                    </Link>
                  )
                })}
              </div>
            ) : null}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1">
          {/* Species search and quick observation need a session; a visitor
              without one gets the way in instead. Every page link stays, and
              leads to the login when followed. */}
          {user ? (
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
          ) : null}
          <div className="hidden sm:block">
            <GeoAreaSelector />
          </div>
          {user ? (
            <div className="hidden sm:block">
              <QuickObservation />
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden h-10 shrink-0 items-center rounded-md px-2.5 text-sm text-text-muted no-underline transition-colors hover:bg-accent-wash hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:flex"
            >
              Logga in
            </Link>
          )}
          <button
            type="button"
            onClick={onToggleMode}
            aria-label={mode === "dark" ? "Ljust läge" : "Mörkt läge"}
            title={mode === "dark" ? "Ljust läge" : "Mörkt läge"}
            className="hidden size-10 items-center justify-center text-text-muted transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:flex"
          >
            {mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div ref={actions.ref} className="relative hidden border-l border-border pl-1 sm:block">
            <button
              type="button"
              aria-expanded={actions.open}
              aria-controls="tempus-actions-menu"
              aria-label="Öppna konto och inställningar"
              title="Konto och inställningar"
              onClick={() => actions.setOpen((current) => !current)}
              className="flex size-10 items-center justify-center text-text-muted transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              <Settings size={18} />
            </button>
            {actions.open ? (
              <div
                id="tempus-actions-menu"
                className="absolute right-0 top-full z-50 mt-1 min-w-56 rounded-md border border-border bg-surface p-1 shadow-lg transition-[opacity,translate] duration-150 ease-(--ease-standard) starting:-translate-y-1 starting:opacity-0 motion-reduce:transition-none"
              >
                {user ? (
                  <NotificationMenu inline>
                    {({ unreadCount, notificationLabel, toggle }) => (
                      <NotificationsTrigger className={MENU_ITEM_CLASS} unreadCount={unreadCount} label={notificationLabel} onClick={toggle} />
                    )}
                  </NotificationMenu>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    onToggleMode()
                    actions.setOpen(false)
                  }}
                  className={MENU_ITEM_CLASS}
                >
                  <ModeToggleContent mode={mode} />
                </button>
                {user ? (
                  <>
                    <div className="my-1 border-t border-border" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-text-muted transition-colors hover:bg-accent-wash hover:text-danger focus-visible:outline-2 focus-visible:outline-focus-ring"
                    >
                      <LogOut size={18} />
                      Logga ut
                    </button>
                  </>
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
              className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 max-h-[calc(100dvh-6rem)] overflow-y-auto [scrollbar-color:var(--text-faint)_transparent] [scrollbar-width:thin] rounded-lg border border-border bg-surface p-2 shadow-lg sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-20 sm:top-[calc(100%-4px)] sm:w-80 xl:hidden"
            >
              {/* Samma länkar i två varianter: bredare skärmar visar dem som egen sektion, mobil som "Fler sidor". */}
              <PrimaryLinks
                label="Sidnavigation"
                className="hidden gap-1 sm:grid"
                pathname={pathname}
                onNavigate={() => setMenuOpen(false)}
              />
              <PrimaryLinks
                label="Fler sidor"
                className="grid gap-1 sm:hidden"
                pathname={pathname}
                onNavigate={() => setMenuOpen(false)}
              />

              <div className="grid gap-1">
                {user ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      onOpenSpeciesSearch()
                    }}
                    className={MENU_ITEM_CLASS}
                  >
                    <Search size={18} />
                    Artsök
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className={`${MENU_ITEM_CLASS} no-underline`}
                  >
                    <LogIn size={18} />
                    Logga in
                  </Link>
                )}
                <p className={MENU_HEADING_CLASS}>Inställningar</p>
                <button type="button" onClick={onToggleMode} className={MENU_ITEM_CLASS}>
                  <ModeToggleContent mode={mode} />
                </button>
                {user ? (
                  <NotificationMenu inline>
                    {({ unreadCount, notificationLabel, toggle }) => (
                      <NotificationsTrigger className={MENU_ITEM_CLASS} unreadCount={unreadCount} label={notificationLabel} onClick={toggle} />
                    )}
                  </NotificationMenu>
                ) : null}
                {user ? (
                  <button type="button" onClick={handleLogout} className={MENU_ITEM_CLASS}>
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

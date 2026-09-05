import { AppLink as Link } from "@/app/components/ui/AppLink"
import QuickObservation from "../observationer/quick-observation"
import Logo from "../ui/Logo"
import { FieldIcon, isActiveLink } from "./nav-links"

export function MobileNav({
  pathname,
  menuOpen,
  onToggleMenu,
}: {
  pathname: string
  menuOpen: boolean
  onToggleMenu: () => void
}) {
  return (
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
          href="/birdnet"
          aria-current={isActiveLink(pathname, "/birdnet") ? "page" : undefined}
          className={`group flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-md no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-focus-ring ${isActiveLink(pathname, "/birdnet") ? "text-accent" : "text-text-muted hover:bg-accent-wash hover:text-text"}`}
        >
          <span className={`flex size-9 items-center justify-center rounded-sm border transition-all ${isActiveLink(pathname, "/birdnet") ? "border-accent/60 bg-surface" : "border-transparent group-hover:border-border"}`}>
            <FieldIcon name="bird" />
          </span>
          <span className={`font-mono text-[9px] uppercase tracking-[0.04em] ${isActiveLink(pathname, "/birdnet") ? "font-semibold" : ""}`}>
            Birdnet
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
          onClick={onToggleMenu}
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
  )
}

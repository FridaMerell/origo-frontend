"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Icon } from "../components/ui/Icon"
import { ExternalLink, ExternalLinkIcon } from "lucide-react"

const NAV_ITEMS = [
  { label: "Kalender", href: "/besok", icon: "calendar" },
  { label: "Todos", href: "/todo", icon: "list-todo" },
  { label: "Ekonomi", href: "/money", icon: "receipt" },
] as const

const ICON_BASE = "https://unpkg.com/lucide-static@1.28.0/icons/"

function NavIcon({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="inline-block size-4 shrink-0 bg-current"
      style={{
        WebkitMaskImage: `url(${ICON_BASE}${name}.svg)`,
        maskImage: `url(${ICON_BASE}${name}.svg)`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  )
}

function ModeToggle({
  mode,
  onToggle,
}: {
  mode: "light" | "dark" | null
  onToggle: () => void
}) {
  const dark = mode === "dark"
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Toggle dark mode"
      onClick={onToggle}
      className="flex items-center gap-2.5 px-2.5 py-2 text-sm text-text-muted"
    >
      <span
        className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors"
        style={{ background: dark ? "var(--accent)" : "var(--border)" }}
      >
        <span
          className="inline-block size-3.5 rounded-full bg-surface transition-transform"
          style={{ transform: dark ? "translateX(18px)" : "translateX(3px)" }}
        />
      </span>
      {dark ? "Dark mode" : "Light mode"}
    </button>
  )
}

type SidebarProps = {
  mode: "light" | "dark" | null
  onToggleMode: () => void
}

const Sidebar = ({ mode, onToggleMode }: SidebarProps) => {
  const pathname = usePathname()

  return (
    <nav className="flex h-full min-h-screen w-55 shrink-0 flex-col gap-0.5 border-r border-border bg-surface p-3 font-body">
      <div className="px-2.5 pb-6 font-display text-2xl font-semibold text-accent">
        <a href="/">
        Verso
        </a>
      </div>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-2.5 rounded px-2.5 py-2 text-sm no-underline"
            style={{
              color: active ? "var(--accent)" : "var(--text)",
              background: active ? "var(--accent-wash)" : "transparent",
            }}
          >
            <NavIcon name={item.icon} />
            {item.label}
          </Link>
        )
      })}
      <div className="mt-auto pt-4">
        <Link href="https://flux.fåvitsko.se" target="_blank" rel="noopener noreferrer"><span>Flux <ExternalLinkIcon size={16} /></span> </Link>
        <ModeToggle mode={mode} onToggle={onToggleMode} />
      </div>
    </nav>
  )
}

export default Sidebar
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRef, useState, useEffect } from "react"
import { Icon } from "../components/ui/Icon"
import { ChevronDownIcon, ExternalLink, ExternalLinkIcon } from "lucide-react"
import { useFacilities } from "../lib/facility-context"
import { useUser } from "../lib/user-context"
import { ORIGO_VERSION } from "../lib/config"
import Logo from "./ui/Logo"
import { Profile } from "../components/ui/Profile"

const NAV_ITEMS = [
  { label: "Kalender", href: "/besok", icon: "calendar" },
  { label: "Planering", href: "/planera", icon: "list-todo" },
  { label: "Ekonomi", href: "/ekonomi", icon: "receipt" },
  { label: "Uppdateringar", href: "/updates", icon: "bell" },
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

const FacilitySelector = () => {
  const { facilities, selectedFacility, selectFacility } = useFacilities()
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
    <div ref={ref} className="relative mt-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex border-accent-hover border-b w-full items-center justify-between gap-1.5  px-1 py-1 text-left text-sm text-text-muted hover:text-text"
      >
        <span className="truncate">{selectedFacility?.name}</span>
        <ChevronDownIcon
          size={13}
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-sm">
          {facilities.map((facility) => (
            <button
              key={facility.id}
              type="button"
              onClick={() => {
                setOpen(false)
                if (facility.id !== selectedFacility?.id) selectFacility(String(facility.id))
              }}
              className={`block w-full truncate px-2.5 py-1.5 text-left text-sm ${facility.id === selectedFacility?.id ? "text-text" : "text-text"} hover:bg-accent-wash hover:text-accent`}
            >
              {facility.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
const Sidebar = ({ mode, onToggleMode }: SidebarProps) => {
  const pathname = usePathname()
  const { facilities } = useFacilities()

  return (
    <nav className="sticky top-0 flex h-screen w-55 shrink-0 flex-col gap-0.5 border-r border-border bg-surface p-3 font-body">
      <div className="px-2.5 pb-6 pt-3 ">
        <a href="/" className="font-display text-2xl font-semibold text-accent flex items-center ">
          <Logo height={75} />
          <div className="flex flex-col ml-1 gap-0">
            <span className="leading-5">Verso</span>
            <span className="font-body text-xs ml-1.5">ORIGO 0.0.1</span>
          </div>
        </a>

        <div className="mt-2 text-sm text-text-muted">
          {
            facilities.length === 0 ? (
              <p className="font-semibold">Inga fastigheter tillgängliga</p>
            ) : (
              <FacilitySelector />
            )
          }
        </div>
      </div>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center gap-2.5 rounded px-2.5 py-2 text-sm no-underline duration-200  ${active ? " bg-accent-wash text-accent hover:bg-accent-wash" : " hover:bg-accent-wash hover:text-accent"}`}

          >
            <NavIcon name={item.icon} />
            {item.label}
          </Link>
        )
      })}
      <div className="mt-auto  pt-4">
        <Link href="https://flux.fåvitsko.se" target="_blank" rel="noopener noreferrer"><div className="flex gap-2 ml-3 items-center">Flux <ExternalLinkIcon size={16} /></div> </Link>
        <ModeToggle mode={mode} onToggle={onToggleMode} />
        <Profile />
      </div>
    </nav>
  )
}

export default Sidebar
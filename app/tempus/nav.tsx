"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { logout } from "@/app/actions/auth"
import { Icon } from "@/app/components/ui/Icon"
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
  { href: "/taxa", label: "Taxonomier", icon: "leaf" },
] as const

const isActiveLink = (pathname: string, href: string) =>
  href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)

function GeoAreaSelector() {
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
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex max-w-44 items-center gap-1.5 rounded px-2.5 py-2 text-sm text-text-muted hover:bg-accent-wash hover:text-accent"
      >
        <span className="truncate">{selectedGeoArea?.name ?? "Hela Sverige"}</span>
        <Icon
          name="chevron-down"
          size={14}
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-52 overflow-hidden rounded border border-border bg-surface py-1 shadow-md">
          <button
            type="button"
            role="switch"
            aria-checked={allSweden}
            onClick={() => {
              setOpen(false)
              selectGeoArea(allSweden ? geoAreas[0]?.id ?? null : null)
            }}
            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-text hover:bg-accent-wash"
          >
            Hela Sverige
            <span
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                allSweden ? "bg-accent" : "bg-border"
              }`}
            >
              <span
                className={`inline-block size-3.5 rounded-full bg-surface transition-transform ${
                  allSweden ? "translate-x-[18px]" : "translate-x-[3px]"
                }`}
              />
            </span>
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
              className={`block w-full whitespace-nowrap px-3 py-1.5 text-left text-sm hover:bg-accent-wash hover:text-accent ${
                geoArea.id === selectedGeoArea?.id ? "font-semibold text-text" : "text-text-muted"
              }`}
            >
              {geoArea.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default function Nav({ mode, onToggleMode }: NavProps) {
  const pathname = usePathname()
  const user = useUser()

  return (
    <>
      <nav aria-label="Huvudnavigation" className="sticky top-0 z-40 flex h-18 items-center border-b border-border bg-surface">
        <div className="container mx-auto flex h-full items-center justify-between max-sm:px-4">
          <Link href="/" className="flex items-center gap-2 no-underline">
            <Logo height={48} className="text-text" />
            <span className="hidden font-display text-[28px] font-semibold tracking-tight text-text sm:inline">Tempus</span>
          </Link>

          <div className="ml-10 hidden h-full items-center sm:flex">
            {primaryLinks.map((link) => {
              const active = isActiveLink(pathname, link.href)

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-full items-center border-b-2 px-3 text-sm no-underline ${active
                    ? "border-accent font-semibold text-text"
                    : "border-transparent text-text-muted hover:text-text"
                    }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>

          <div className="ml-auto flex items-center gap-1">
            <QuickObservation />
            <button
              type="button"
              onClick={onToggleMode}
              aria-label={mode === "dark" ? "Använd ljust läge" : "Använd mörkt läge"}
              className="flex size-10 items-center justify-center rounded text-text-muted hover:bg-accent-wash hover:text-accent"
            >
              <Icon name={mode === "dark" ? "sun" : "moon"} size={18} />
            </button>
            {user ? (
              <button
                type="button"
                onClick={async () => {
                  await logout()
                  window.location.href = "/login"
                }}
                aria-label="Logga ut"
                className="flex size-10 items-center justify-center rounded text-text-muted hover:bg-accent-wash hover:text-accent"
              >
                <Icon name="log-out" size={18} />
              </button>
            ) : (
              <Link
                href="/login"
                aria-label="Logga in"
                className="flex size-10 items-center justify-center rounded text-text-muted no-underline hover:bg-accent-wash hover:text-accent"
              >
                <Icon name="log-in" size={18} />
              </Link>
            )}
            <GeoAreaSelector />
          </div>
        </div>
      </nav>

      <nav
        aria-label="Mobilnavigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-3px_10px_rgba(var(--shadow-color),0.09)] sm:hidden"
      >
        <div className="mx-auto grid h-18 max-w-md grid-cols-5 px-2">
          {primaryLinks.map((link) => {
            const active = isActiveLink(pathname, link.href)

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-sm text-xs no-underline transition-colors ${active
                  ? "font-semibold text-accent"
                  : "text-text-muted hover:bg-accent-wash hover:text-text"
                  }`}
              >
                <span
                  aria-hidden
                  className={`absolute inset-x-5 top-0 h-0.5 rounded-full bg-accent transition-opacity ${active ? "opacity-100" : "opacity-0"}`}
                />
                <Icon name={link.icon} size={21} />
                <span className="truncate">{link.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}

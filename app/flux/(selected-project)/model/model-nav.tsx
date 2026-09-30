"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Braces, Cable, ChevronDown, Database, LayoutList, PackageCheck, PanelTop, type LucideIcon } from "lucide-react"

export type ModelNavCounts = {
  domain: number
  api: number
  frontend: number
  integrations: number
}

export type ModelNavItem = { href: string; label: string; hint?: string; mono?: boolean; group?: string }

export type ModelNavIndex = Record<keyof ModelNavCounts, ModelNavItem[]>

type Area = { key: keyof ModelNavCounts | "overview" | "delivery"; href: string; label: string; icon: LucideIcon }

const areas: Area[] = [
  { key: "overview", href: "/model", label: "Översikt", icon: LayoutList },
  { key: "domain", href: "/model/domain", label: "Domän", icon: Database },
  { key: "api", href: "/model/api", label: "API", icon: Braces },
  { key: "frontend", href: "/model/frontend", label: "Frontend och åtkomst", icon: PanelTop },
  { key: "integrations", href: "/model/integrations", label: "Integrationer", icon: Cable },
  { key: "delivery", href: "/model/delivery", label: "Leverans", icon: PackageCheck },
]

type PageSection = { id: string; label: string }

function normalize(pathname: string) {
  return pathname.replace(/^\/flux(?=\/|$)/, "") || "/"
}

function isActive(area: Area, path: string) {
  if (area.href === "/model") return path === "/model"
  if (area.key === "delivery") return path.startsWith("/model/delivery") || path.startsWith("/model/scaffold")
  return path === area.href || path.startsWith(area.href + "/")
}

function isItemActive(item: ModelNavItem, path: string, area: Area) {
  const target = item.href.split(/[?#]/)[0].replace(/\/edit$/, "")
  if (target === area.href) return false
  return path === target || path.startsWith(target + "/")
}

function usePageSections(path: string) {
  const [sections, setSections] = useState<PageSection[]>([])
  const [activeId, setActiveId] = useState("")

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-model-section]"))
    const found = elements.map((element) => ({ id: element.id, label: element.dataset.modelSection ?? "" })).filter((section) => section.id && section.label)
    setSections(found)
    if (found.length === 0) return

    let frame = 0
    const update = () => {
      frame = 0
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
        setActiveId(found[found.length - 1].id)
        return
      }
      const marker = window.innerHeight * 0.28
      let next = found[0].id
      for (const section of found) {
        const element = document.getElementById(section.id)
        if (!element) continue
        if (element.getBoundingClientRect().top <= marker) next = section.id
        else break
      }
      setActiveId(next)
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [path])

  return { sections, activeId }
}

function SectionLinks({ sections, activeId, onNavigate }: { sections: PageSection[]; activeId: string; onNavigate?: () => void }) {
  if (sections.length === 0) return null
  return (
    <ol className="flex flex-col border-l border-border">
      {sections.map((section) => (
        <li key={section.id}>
          <a
            href={"#" + section.id}
            onClick={onNavigate}
            aria-current={section.id === activeId ? "location" : undefined}
            className={"-ml-px block border-l py-1.5 pl-3.5 text-sm no-underline " + (section.id === activeId ? "border-accent font-medium text-text" : "border-transparent text-text-muted hover:text-text")}
          >
            {section.label}
          </a>
        </li>
      ))}
    </ol>
  )
}

function ItemLinks({ items, path, area, onNavigate }: { items: ModelNavItem[]; path: string; area: Area; onNavigate?: () => void }) {
  if (items.length === 0) return null
  const groups = new Map<string, ModelNavItem[]>()
  for (const item of items) {
    const key = item.group ?? "Innehåll"
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  return (
    <div className="flex flex-col gap-1">
      {Array.from(groups, ([label, groupItems]) => {
        const hasActive = groupItems.some((item) => isItemActive(item, path, area))
        return (
          <details key={label + path} open={hasActive} className="group/nav">
            <summary className="flex min-h-8 cursor-pointer list-none items-center gap-1.5 rounded-md px-2 text-xs font-medium text-text-muted hover:text-text [&::-webkit-details-marker]:hidden">
              <ChevronDown size={13} aria-hidden className="-rotate-90 text-text-faint transition-transform group-open/nav:rotate-0" />
              <span className="flex-1">{label}</span>
              <span className="tabular-nums text-text-faint">{groupItems.length}</span>
            </summary>
            <ol className="mb-1 flex max-h-64 flex-col gap-px overflow-y-auto">
              {groupItems.map((item) => {
                const active = isItemActive(item, path, area)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={"flex min-h-7 items-center gap-2 rounded-md py-1 pl-[1.6rem] pr-2 text-sm no-underline " + (active ? "bg-accent-wash font-medium text-accent" : "text-text-muted hover:text-text")}
                    >
                      <span className={"min-w-0 flex-1 truncate " + (item.mono ? "font-mono text-xs" : "")}>{item.label}</span>
                      {item.hint && <span className="max-w-[45%] shrink-0 truncate font-mono text-[11px] text-text-faint">{item.hint}</span>}
                    </Link>
                  </li>
                )
              })}
            </ol>
          </details>
        )
      })}
    </div>
  )
}

export function ModelNav({ counts, index }: { counts: ModelNavCounts; index: ModelNavIndex }) {
  const path = normalize(usePathname())
  const { sections, activeId } = usePageSections(path)
  const [open, setOpen] = useState(false)
  const activeArea = areas.find((area) => isActive(area, path)) ?? areas[0]
  const activeItems = activeArea.key === "overview" || activeArea.key === "delivery" ? [] : index[activeArea.key]
  const activeSection = sections.find((section) => section.id === activeId)

  useEffect(() => setOpen(false), [path])

  return (
    <>
      <nav aria-label="Teknisk specifikation" className="rounded-card border border-border bg-surface/95 shadow-card backdrop-blur lg:hidden">
        <ol className="flex gap-1 overflow-x-auto p-1.5">
          {areas.map((area) => {
            const active = area === activeArea
            const Icon = area.icon
            return (
              <li key={area.key} className="shrink-0">
                <Link
                  href={area.href}
                  aria-current={active ? "page" : undefined}
                  className={"inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-sm no-underline " + (active ? "bg-surface-2 font-semibold text-text" : "text-text-muted hover:bg-surface-2 hover:text-text")}
                >
                  <Icon size={15} aria-hidden className={active ? "text-accent" : "text-text-faint"} />
                  {area.label}
                </Link>
              </li>
            )
          })}
        </ol>
        {(sections.length > 0 || activeItems.length > 0) && (
          <div className="border-t border-border">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
              className="flex min-h-10 w-full items-center gap-2 px-3 text-left text-sm text-text"
            >
              <span className="min-w-0 flex-1 truncate">
                <span className="text-text-muted">{activeArea.label}</span>
                {activeSection && <> · {activeSection.label}</>}
              </span>
              <ChevronDown size={16} aria-hidden className={"shrink-0 text-text-faint transition-transform " + (open ? "rotate-180" : "")} />
            </button>
            {open && (
              <div className="flex max-h-[60dvh] flex-col gap-3 overflow-y-auto px-3 pb-3">
                <SectionLinks sections={sections} activeId={activeId} onNavigate={() => setOpen(false)} />
                <ItemLinks items={activeItems} path={path} area={activeArea} onNavigate={() => setOpen(false)} />
              </div>
            )}
          </div>
        )}
      </nav>

      <nav aria-label="Teknisk specifikation" className="hidden max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-card border border-border bg-surface p-2 shadow-card lg:block">
        <ol className="flex flex-col gap-0.5">
          {areas.map((area) => {
            const active = area === activeArea
            const Icon = area.icon
            const count = area.key === "overview" || area.key === "delivery" ? null : counts[area.key]
            return (
              <li key={area.key}>
                <Link
                  href={area.href}
                  aria-current={active ? "page" : undefined}
                  className={"flex min-h-9 items-center gap-2.5 rounded-md px-2.5 text-sm no-underline transition-colors " + (active ? "bg-surface-2 font-semibold text-text" : "text-text-muted hover:bg-surface-2 hover:text-text")}
                >
                  <Icon size={16} aria-hidden className={active ? "text-accent" : "text-text-faint"} />
                  <span className="flex-1">{area.label}</span>
                  {count !== null && <span className={"text-xs tabular-nums " + (count === 0 ? "text-text-faint" : "text-text-muted")}>{count}</span>}
                </Link>

                {active && (sections.length > 0 || activeItems.length > 0) && (
                  <div className="mb-1.5 ml-2 mt-0.5 flex flex-col gap-1.5">
                    <SectionLinks sections={sections} activeId={activeId} />
                    <ItemLinks items={activeItems} path={path} area={activeArea} />
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}

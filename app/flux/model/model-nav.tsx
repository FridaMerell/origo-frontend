"use client"

import { AppLink as Link } from "@/app/components/ui/AppLink"
import { usePathname } from "next/navigation"

const MODEL_LINKS = [
  { label: "Entiteter", href: "/model" },
  { label: "Diagram", href: "/model/diagram" },
  { label: "Stack", href: "/model/stack" },
  { label: "Resurser", href: "/model/resources" },
  { label: "Roller", href: "/model/roles" },
  { label: "Skärmar", href: "/model/screens" },
  { label: "Integrationer", href: "/model/integrations" },
  { label: "Seed-data", href: "/model/seed" },
  { label: "Kod", href: "/model/scaffold" },
  { label: "Uppgifter", href: "/model/tasks" },
]

export function ModelNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Datamodell" className="flex flex-wrap gap-1 border-b border-border pb-2">
      {MODEL_LINKS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={
            pathname === item.href
              ? "rounded-3xl bg-surface-2 px-4 py-1.5 text-sm font-medium text-text no-underline"
              : "rounded-3xl px-4 py-1.5 text-sm text-text-muted no-underline hover:bg-surface-2/60 hover:text-text"
          }
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}

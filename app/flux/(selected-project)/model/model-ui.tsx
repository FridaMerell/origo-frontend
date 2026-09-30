import Link from "next/link"
import type { ReactNode } from "react"
import { ChevronLeft } from "lucide-react"

export function ActionLink({
  href,
  children,
  variant = "secondary",
}: {
  href: string
  children: ReactNode
  variant?: "primary" | "secondary"
}) {
  const styles = variant === "primary"
    ? "bg-accent text-accent-contrast hover:opacity-90"
    : "border border-border bg-surface text-text hover:border-accent/50 hover:text-accent"
  return (
    <Link href={href} className={"inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium no-underline transition-colors " + styles}>
      {children}
    </Link>
  )
}

export function ModelPageHeader({
  title,
  description,
  actions,
  back = { href: "/model", label: "Teknisk specifikation" },
}: {
  title: string
  description?: string
  actions?: ReactNode
  back?: { href: string; label: string } | null
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="inline-flex items-center gap-1 text-sm text-text-muted no-underline hover:text-accent">
            <ChevronLeft size={15} aria-hidden /> {back.label}
          </Link>
        )}
        <h1 className={"text-3xl font-semibold tracking-tight text-text " + (back ? "mt-2" : "")}>{title}</h1>
        {description && <p className="mt-2 text-sm leading-6 text-text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  )
}

export function ModelSection({
  id,
  label,
  title,
  icon,
  actions,
  children,
  muted = false,
  mutedHint,
}: {
  id: string
  label?: string
  title: ReactNode
  icon?: ReactNode
  actions?: ReactNode
  children: ReactNode
  muted?: boolean
  mutedHint?: string
}) {
  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-2 px-4 py-3.5 sm:px-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-text">
        {icon}
        {title}
      </h2>
      {muted
        ? mutedHint && <span className="text-sm text-text-faint">{mutedHint}</span>
        : actions && <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">{actions}</div>}
    </div>
  )

  if (muted) {
    return (
      <details id={id} data-model-section={label} className="group scroll-mt-24 overflow-hidden rounded-card border border-border bg-surface opacity-70">
        <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">{header}</summary>
        {children}
      </details>
    )
  }

  return (
    <section id={id} data-model-section={label} className="scroll-mt-24 overflow-hidden rounded-card border border-border bg-surface shadow-card">
      {header}
      {children}
    </section>
  )
}

export function ModelProgress({
  areas,
}: {
  areas: { label: string; href: string; done: boolean }[]
}) {
  const doneCount = areas.filter((area) => area.done).length

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-card border border-border bg-surface-2 px-4 py-2.5 text-sm sm:px-5">
      <span className="font-medium text-text">{doneCount} av {areas.length} områden har innehåll</span>
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {areas.map((area) => (
          <li key={area.label}>
            <Link
              href={area.href}
              className={
                "inline-flex items-center gap-1.5 no-underline hover:underline " +
                (area.done ? "text-text-muted" : "text-text-faint")
              }
            >
              <span
                aria-hidden
                className={"h-1.5 w-1.5 rounded-full " + (area.done ? "bg-accent" : "bg-border")}
              />
              {area.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function RowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-sm font-medium text-accent no-underline hover:underline">
      {children}
    </Link>
  )
}

import { Card } from "@/app/components/ui/Card"
import { fileProxyUrl } from "@/app/lib/files"
import type { OnThisDay as OnThisDayData } from "@/app/lib/dal"

function yearsAgo(n: number): string {
  return n === 1 ? "För 1 år sedan" : `För ${n} år sedan`
}

type Entry = { key: string; years: number; label: string; text: string; thumb?: string; open?: () => void }

function toEntries(
  data: OnThisDayData,
  onOpenEvent?: (id: string) => void,
  onOpenPhoto?: (id: string) => void
): Entry[] {
  return [
    ...data.events.map((event): Entry => ({
      key: `e${event.id}`,
      years: event.years_ago,
      label: "Händelse",
      text: event.title,
      open: onOpenEvent && (() => onOpenEvent(event.id)),
    })),
    ...data.photos.map((photo): Entry => ({
      key: `p${photo.id}`,
      years: photo.years_ago,
      label: "Bild",
      text: photo.title || "Utan titel",
      thumb: photo.thumbnail_url || photo.url,
      open: onOpenPhoto && (() => onOpenPhoto(photo.id)),
    })),
    ...data.births.map((person): Entry => ({
      key: `b${person.id}`,
      years: person.years_ago,
      label: "Född",
      text: person.name,
    })),
    ...data.deaths.map((person): Entry => ({
      key: `d${person.id}`,
      years: person.years_ago,
      label: "Död",
      text: person.name,
    })),
  ].sort((a, b) => a.years - b.years)
}

function Thumb({ entry, className }: { entry: Entry; className: string }) {
  if (!entry.thumb) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={fileProxyUrl(entry.thumb)}
      alt=""
      loading="lazy"
      className={`${className} shrink-0 rounded-lg border border-border object-cover`}
    />
  )
}

function Clickable({
  entry,
  className,
  children,
}: {
  entry: Entry
  className: string
  children: React.ReactNode
}) {
  return entry.open ? (
    <button type="button" onClick={entry.open} className={`${className} text-left duration-200 hover:bg-surface-2`}>
      {children}
    </button>
  ) : (
    <div className={className}>{children}</div>
  )
}

function EntryRow({ entry }: { entry: Entry }) {
  return (
    <Clickable entry={entry} className="flex w-full items-center gap-3 rounded-lg px-3 py-2">
      <Thumb entry={entry} className="size-12" />
      <span className="flex min-w-0 flex-col">
        <span className="font-display text-lg font-semibold leading-tight text-text">
          {yearsAgo(entry.years)}
        </span>
        <span className="truncate text-sm text-text-muted">
          {entry.label}: {entry.text}
        </span>
      </span>
    </Clickable>
  )
}

/** "On this day": history from earlier years on today's month and day. Renders nothing when empty. */
export function OnThisDay({
  data,
  limit,
  className = "",
  action,
  onOpenEvent,
  onOpenPhoto,
}: {
  data: OnThisDayData | null
  /** Show at most this many entries. */
  limit?: number
  className?: string
  /** Shown at the right end of the header, e.g. a link. */
  action?: React.ReactNode
  onOpenEvent?: (id: string) => void
  onOpenPhoto?: (id: string) => void
}) {
  if (!data) return null
  const entries = toEntries(data, onOpenEvent, onOpenPhoto)
  if (entries.length === 0) return null

  const shown = limit ? entries.slice(0, limit) : entries
  const [, month, day] = data.date.split("-").map(Number)
  const monthLabel = new Date(2000, month - 1, day).toLocaleDateString("sv-SE", { month: "long" })

  return (
    <Card aria-label="Denna dag" className={`relative overflow-hidden !p-0 ${className}`}>
      {action && <div className="absolute right-4 top-3 sm:right-5">{action}</div>}
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-8 sm:p-6">
        <div className="flex shrink-0 items-baseline gap-2 sm:flex-col sm:gap-0 sm:border-r sm:border-border sm:pr-8">
          <span className="text-xs font-medium text-text-faint">Denna dag</span>
          <span className="font-display text-5xl font-semibold leading-none text-text">{day}</span>
          <span className="font-display text-lg capitalize text-text-muted">{monthLabel}</span>
        </div>
        <ul className="m-0 flex min-w-0 flex-1 list-none flex-col gap-1 p-0 sm:pt-4">
          {shown.map((entry) => (
            <li key={entry.key}>
              <EntryRow entry={entry} />
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}

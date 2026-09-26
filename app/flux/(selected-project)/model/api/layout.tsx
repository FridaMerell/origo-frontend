import Link from "next/link"
import type { ReactNode } from "react"

export default function ApiWorkbenchLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6 pb-12">
      <header className="border-b border-border pb-5">
        <Link href="/model" className="text-xs font-semibold uppercase tracking-[.14em] text-text-faint no-underline hover:text-text">
          Teknisk specifikation
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4 sm:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-text">API Workbench</h1>
            <p className="mt-2 text-sm text-text-muted">Navigera från resurs till kontrakt och granska den kod Flux faktiskt kan generera.</p>
          </div>
          <nav aria-label="API Workbench" className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <Link href="/model/api" className="inline-flex min-h-10 items-center justify-center rounded-md border border-border px-3 py-1.5 text-sm text-text no-underline hover:bg-surface-2">API-karta</Link>
            <Link href="/model/scaffold" className="inline-flex min-h-10 items-center justify-center rounded-md border border-border px-3 py-1.5 text-sm text-text no-underline hover:bg-surface-2">Hela kodgeneratorn</Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  )
}

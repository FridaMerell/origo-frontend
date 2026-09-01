import type { ReactNode } from "react"

// Shared page frame for the docs section: paper background, container gutters
// and a breadcrumb row.
export function DocShell({
  crumb,
  backHref = "/docs",
  backLabel = "Dokumentation",
  children,
}: {
  crumb: string
  backHref?: string
  backLabel?: string
  children: ReactNode
}) {
  return (
    <main className="min-h-screen bg-[#E7E5DE] py-10 text-[#1B252B] sm:py-16">
      <div className="container">
        <header className="mb-10 border-l border-[#1B252B] pl-5">
          <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-[#58636A]">
            {crumb}
          </p>
          <a
            href={backHref}
            className="mt-2 inline-block font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.12em] underline underline-offset-4"
          >
            ← {backLabel}
          </a>
        </header>
        {children}
      </div>
    </main>
  )
}

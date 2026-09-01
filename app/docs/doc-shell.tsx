import type { ReactNode } from "react"
import { PageCrumb } from "@/app/components/page-crumb"

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
        <div className="mb-10">
          <PageCrumb crumb={crumb} backHref={backHref} backLabel={backLabel} />
        </div>
        {children}
      </div>
    </main>
  )
}

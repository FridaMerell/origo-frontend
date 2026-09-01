import Link from "next/link";
import type { ReactNode } from "react";

// Breadcrumb row for Origo's theme-less root subpages (docs, konto, join …).
// A mono kicker showing the path, then a "← back" link, set off by a left rule.
// Mirrors root-home.tsx's palette since these pages can't use design tokens.
const MONO = "font-[family-name:var(--font-geist-mono)]";

export function PageCrumb({
  crumb,
  backHref = "/",
  backLabel = "Tillbaka",
  children,
}: {
  crumb: string;
  backHref?: string;
  backLabel?: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-4 border-l border-[#1B252B] pl-5">
      <div>
        <p className={`${MONO} text-[11px] uppercase tracking-[0.18em] text-[#58636A]`}>
          {crumb}
        </p>
        <Link
          href={backHref}
          className={`${MONO} mt-2 inline-block text-[11px] uppercase tracking-[0.12em] underline underline-offset-4`}
        >
          ← {backLabel}
        </Link>
      </div>
      {children}
    </header>
  );
}

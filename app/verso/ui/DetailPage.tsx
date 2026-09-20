import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-1 text-sm text-text-muted hover:text-accent">
      <ChevronLeft size={14} />
      {children}
    </Link>
  );
}

/** Shown by detail views when the requested record isn't in the loaded data. */
export function DetailNotFound({
  backHref,
  backLabel,
  message,
}: {
  backHref: string;
  backLabel: string;
  message: string;
}) {
  return (
    <div className="flex flex-1 flex-col gap-5 p-7">
      <BackLink href={backHref}>{backLabel}</BackLink>
      <div className="text-text-muted">{message}</div>
    </div>
  );
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="m-0 font-display text-lg font-semibold text-text">{children}</h2>;
}

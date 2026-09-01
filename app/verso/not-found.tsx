import Link from "next/link";
import Logo from "./ui/Logo";

export default function VersoNotFound() {
  return (
    <div className="flex min-h-[70vh] flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <Logo className="h-24 w-auto text-accent/25" />
      <p className="mt-8 font-display text-sm uppercase tracking-[0.3em] text-text-faint">
        Sidan saknas
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold text-text sm:text-5xl">
        Här fanns ingenting
      </h1>
      <p className="mt-4 max-w-md text-base leading-7 text-text-muted">
        Vi hittade inte sidan du letade efter. Den kan ha flyttats, tagits bort
        eller aldrig ha funnits.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded border border-border bg-surface px-5 py-2.5 font-body font-semibold text-text shadow-card transition-colors hover:border-accent hover:text-accent"
      >
        Tillbaka till startsidan
      </Link>
    </div>
  );
}

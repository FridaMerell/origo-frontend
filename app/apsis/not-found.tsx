import Link from "next/link";
import Logo from "./ui/Logo";

export default function ApsisNotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 py-24 text-center">
      <Logo height={96} className="text-accent/25" />
      <p className="mt-8 font-mono text-xs uppercase tracking-[0.28em] text-text-faint">
        Sidan saknas
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold text-text sm:text-5xl">
        Ingen absid här
      </h1>
      <p className="mt-4 max-w-md text-base leading-7 text-text-muted">
        Vi hittade inte sidan du letade efter. Den kan ha flyttats eller tagits
        bort.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded border border-border bg-surface px-5 py-2.5 font-body font-semibold text-text transition-colors hover:border-accent hover:text-accent"
      >
        Till samlingen
      </Link>
    </div>
  );
}

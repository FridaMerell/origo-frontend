import Link from "next/link";
import Logo from "./ui/Logo";

export default function TempusNotFound() {
  return (
    <div className="container flex min-h-[70vh] flex-col items-center justify-center py-24 text-center">
      <Logo height={72} className="text-accent/25" />
      <p className="mt-8 font-mono text-xs uppercase tracking-[0.28em] text-text-faint">
        Sidan saknas
      </p>
      <h1 className="mt-3 font-display text-4xl font-medium text-text sm:text-5xl">
        Utanför kartan
      </h1>
      <p className="mt-4 max-w-md text-base leading-7 text-text-muted">
        Vi hittade inte sidan du letade efter. Länken kan vara gammal eller
        felstavad.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded border border-border bg-surface px-5 py-2.5 font-body font-semibold text-text transition-colors hover:border-accent hover:text-accent"
      >
        Till startsidan
      </Link>
    </div>
  );
}

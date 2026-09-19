"use client";

import { useEffect } from "react";
import Link from "next/link";
import Logo from "./ui/Logo";

export default function ApsisError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container flex min-h-[70vh] flex-col items-center justify-center py-24 text-center">
      <Logo height={96} className="text-accent/25" />
      <p className="mt-8 font-mono text-xs uppercase tracking-[0.28em] text-text-faint">
        Något gick fel
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold text-text sm:text-5xl">
        Bilden gick sönder
      </h1>
      <p className="mt-4 max-w-md text-base leading-7 text-text-muted">
        Ett oväntat fel uppstod. Du kan försöka igen, eller gå tillbaka till
        samlingen.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={() => retry()}
          className="inline-flex items-center gap-2 rounded border border-border bg-surface px-5 py-2.5 font-body font-semibold text-text transition-colors hover:border-accent hover:text-accent"
        >
          Försök igen
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded border border-border px-5 py-2.5 font-body font-semibold text-text-muted transition-colors hover:border-accent hover:text-accent"
        >
          Till samlingen
        </Link>
      </div>
    </div>
  );
}

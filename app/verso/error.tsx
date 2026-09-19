"use client";

import { useEffect } from "react";
import Link from "next/link";
import Logo from "./ui/Logo";

export default function VersoError({
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
    <div className="container flex min-h-[70vh] flex-1 flex-col items-center justify-center py-24 text-center">
      <Logo className="h-24 w-auto text-accent/25" />
      <p className="mt-8 font-display text-sm uppercase tracking-[0.3em] text-text-faint">
        Något gick fel
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold text-text sm:text-5xl">
        Något small av
      </h1>
      <p className="mt-4 max-w-md text-base leading-7 text-text-muted">
        Ett oväntat fel uppstod. Du kan försöka igen, eller gå tillbaka till
        startsidan.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={() => retry()}
          className="inline-flex items-center gap-2 rounded border border-border bg-surface px-5 py-2.5 font-body font-semibold text-text shadow-card transition-colors hover:border-accent hover:text-accent"
        >
          Försök igen
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded border border-border px-5 py-2.5 font-body font-semibold text-text-muted shadow-card transition-colors hover:border-accent hover:text-accent"
        >
          Till startsidan
        </Link>
      </div>
    </div>
  );
}

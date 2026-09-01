"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { MONO } from "./ui";

const NAV_LINK = `${MONO} text-[11px] uppercase tracking-[0.12em] underline underline-offset-4`;

export function KontoShell({
  backHref,
  backLabel,
  kicker,
  title,
  username,
  children,
}: {
  backHref: string;
  backLabel: string;
  kicker: string;
  title: string;
  username: string;
  children: ReactNode;
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#E7E5DE] px-5 py-6 text-[#1B252B] sm:px-10 sm:py-10">
      <span aria-hidden className="absolute left-1/2 top-0 h-full w-px bg-[#1B252B]/15" />
      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between">
          <Link href={backHref} className={NAV_LINK}>
            ← {backLabel}
          </Link>
          <button
            type="button"
            onClick={() => void logout().then(() => window.location.reload())}
            className={NAV_LINK}
          >
            Logga ut
          </button>
        </header>

        <section className="py-16">
          <p className={`${MONO} text-[11px] uppercase tracking-[0.18em] text-[#58636A]`}>{kicker}</p>
          <h1 className="mt-3 text-5xl font-medium tracking-[-0.06em] sm:text-6xl">{title}</h1>
          <div className="mt-12 flex flex-col gap-12">{children}</div>
        </section>

        <footer className={`${MONO} mt-auto text-[10px] uppercase tracking-[0.16em] text-[#58636A]`}>
          Inloggad som {username}
        </footer>
      </div>
    </main>
  );
}

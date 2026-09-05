import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "404 | Origo",
};

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#E7E5DE] px-5 py-6 text-[#1B252B] sm:px-10 sm:py-10">
      <span aria-hidden className="absolute left-1/2 top-0 h-full w-px bg-[#1B252B]/15" />
      <span aria-hidden className="absolute left-0 top-1/2 h-px w-full bg-[#1B252B]/15" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.18em]">
          ORIGO / 00°00′
        </span>
        <section className="flex flex-1 flex-col justify-center py-16">
          <span className="mb-5 flex size-12 items-center justify-center rounded-full border border-[#1B252B] font-mono text-xs">
            404
          </span>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#58636A]">
            Ingen position
          </p>
          <h1 className="mt-3 max-w-3xl text-5xl font-medium tracking-[-0.06em] sm:text-7xl">
            Sidan finns inte.
            <br />
            Fel koordinat.
          </h1>
          <Link
            href="/"
            className="mt-8 inline-flex w-fit items-center gap-2 rounded-sm bg-[#1B252B] px-5 py-2.5 font-mono text-xs uppercase tracking-[0.12em] text-[#F4F2EC] no-underline transition-colors hover:bg-[#58636A]"
          >
            Till utgångspunkten ↗
          </Link>
        </section>
        <footer className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#58636A]">
          Projektet är byggt i Django, med Next.js som frontend.
        </footer>
      </div>
    </main>
  );
}

import Image from "next/image";
import Link from "next/link";
import { Icon } from "../components/ui/Icon";

export default function FluxNotFound() {
  return (
    <section className="relative isolate overflow-hidden rounded-card bg-[#25263B] px-6 py-16 text-center text-[#FFF9F0] shadow-lg sm:px-10 sm:py-24">
      <Image
        src="/flux/dragonfly.svg"
        alt=""
        aria-hidden
        width={1774}
        height={887}
        className="pointer-events-none absolute -right-40 -top-16 z-0 h-72 w-auto rotate-[-22deg] scale-x-[-1] opacity-30"
        style={{ filter: "brightness(0) saturate(100%) invert(64%) sepia(45%) saturate(821%) hue-rotate(343deg) brightness(92%) contrast(89%)" }}
      />
      <div className="relative z-10 mx-auto flex max-w-md flex-col items-center">
        <span className="font-mono text-6xl font-bold tracking-tight text-[#EFA052] sm:text-7xl">404</span>
        <h1 className="mt-4 font-display text-2xl font-semibold uppercase tracking-[0.12em] text-[#FFF9F0] sm:text-3xl">
          Ingenting här
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#FFF9F0]/70">
          Sidan du försökte nå finns inte. Den kan ha flyttats eller så stämmer
          inte länken.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-1.5 rounded-md border border-[#FFF9F0]/35 bg-white/5 px-4 py-2 text-sm font-medium text-[#FFF9F0] no-underline transition-colors hover:border-[#EFA052] hover:bg-[#EFA052] hover:text-[#25263B]"
        >
          <Icon name="arrow-left" size={15} /> Till översikten
        </Link>
      </div>
    </section>
  );
}

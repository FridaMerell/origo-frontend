"use client"

export function LocaleAtlasTitle({ name }: { name: string }) {
  return (
    <header className="flex items-center justify-center border-b border-[#3c3023] px-4 py-2">
      <div className="flex w-full items-center justify-center gap-5">
        <TitleArrow />
        <h2 className="mx-auto flex h-12 w-[min(62%,34rem)] items-center justify-center border border-[#3c3023] px-4 text-center font-display text-2xl font-medium italic leading-none tracking-[.08em] sm:text-3xl">
          {name}
        </h2>
        <TitleArrow flipped />
      </div>
    </header>
  )
}

function TitleArrow({ flipped = false }: { flipped?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 160 30"
      className={`hidden h-7 w-36 shrink-0 text-[#2d251d] sm:block ${flipped ? "-scale-x-100" : ""}`}
    >
      <path d="M4 15H136M22 15c36 0 72-2 112-7M22 15c36 0 72 2 112 7M70 15c25 0 48-1 64-4M70 15c25 0 48 1 64 4M138 2v26" fill="none" stroke="currentColor" strokeWidth=".85" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 15h114l-22-3 22 3-22 3H22Z" fill="currentColor" opacity=".3" />
      <circle cx="4" cy="15" r="1.35" fill="currentColor" />
    </svg>
  )
}

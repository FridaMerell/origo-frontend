export function Compass() {
  return <div className="pointer-events-none absolute bottom-5 left-5 z-20 grid size-18 place-items-center rounded-full border border-[#4a3526]/70 bg-[#fbf8f0]/90 text-[#4a3526] shadow-sm" aria-label="Kompass, norr uppåt">
    <svg viewBox="0 0 80 80" className="size-15" aria-hidden="true">
      <path d="M40 5 46 32 40 40 34 32ZM40 75 46 48 40 40 34 48ZM5 40l27-6 8 6-8 6ZM75 40l-27-6-8 6 8 6Z" fill="currentColor" opacity=".9" />
      <path d="m40 7 4 10-4 8-4-8Z" fill="#9a4c38" />
      <path d="M40 2c-5 4-5 9 0 14 5-5 5-10 0-14ZM34 9h12" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="40" cy="40" r="4" fill="#fbf8f0" stroke="currentColor" />
      <text x="40" y="14" textAnchor="middle" className="font-display" fontSize="10">N</text>
    </svg>
  </div>
}

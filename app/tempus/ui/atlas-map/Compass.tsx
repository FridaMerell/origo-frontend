"use client"

// Purely decorative — the map never rotates (dragRotate is off), so this
// always points the same way. It's here for the antique-map look, not for
// orientation.
export function Compass() {
  return <div className="absolute left-5 top-5 z-20" aria-hidden="true">
    <svg width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="20" fill="#fbf8f0" fillOpacity="0.92" stroke="#4a3526" strokeWidth="1" />
      <path d="M22 6 L26.5 22 L22 38 L17.5 22 Z" fill="#8f3509" />
      <path d="M6 22 L22 19.5 L38 22 L22 24.5 Z" fill="#4a3526" fillOpacity="0.55" />
      <text x="22" y="11" textAnchor="middle" fontSize="8" fontFamily="serif" fill="#4a3526">N</text>
    </svg>
  </div>
}

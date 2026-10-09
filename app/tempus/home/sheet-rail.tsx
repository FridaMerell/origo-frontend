// What the margin says about a section: a heading in plain words, and a few
// short lines in the same vein.
export type RailNote = { heading: string | null; lines: string[] }

// The rule that parts two sections: one line that runs the sheet's full width,
// through the margin too. It is put on the margin's cell and on the section's
// cell alike, so the two meet.
export const SECTION_RULE = "border-t border-text"

// One note in the sheet's margin, beside the section it belongs to.
export function RailMark({ number, note, ruled }: { number: number; note: RailNote; ruled: boolean }) {
  return (
    <div aria-hidden="true" className={`hidden border-r border-text sm:block ${ruled ? SECTION_RULE : ""}`}>
      <div className="pr-3 pt-10">
        <span className="block font-mono text-[11px] tracking-[.14em] text-text-muted">{String(number).padStart(2, "0")}</span>
        {note.heading ? (
          <span className="mt-2 block font-display text-base font-semibold leading-tight text-text">{note.heading}</span>
        ) : null}
        {note.lines.map((line) => (
          <span key={line} className="mt-1.5 block text-[13px] leading-snug tabular-nums text-text-muted">{line}</span>
        ))}
      </div>
    </div>
  )
}

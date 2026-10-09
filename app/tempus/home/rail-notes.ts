import type { HomeData } from "./overview-data"
import { REGISTER_PAGE_SIZE } from "./resources"
import { formatCount } from "./season-helpers"
import { seasonName } from "./season-name"
import type { Selection } from "./selection"
import type { RailNote } from "./sheet-rail"

// What the margin says beside each section: a heading that names the section
// in the field's own vocabulary (the time of year, "Passage", "Taxa",
// "Lokaler"), never a verdict worked out from its figures, and a line or two
// of facts under it. A heading does not repeat the note above it or the words
// that already stand in its own section.
// Change the wording here.

// The time of year, and how much of the selection is in season.
export function summaryNote({ view, tally }: HomeData, week: number): RailNote {
  const [total, inSeason] = tally.cells.map((cell) => cell.value)
  const heading = seasonName(week)
  if (!total || inSeason == null) return { heading, lines: [] }
  // A handful of followed species is counted; a share only says something of the whole selection.
  return {
    heading,
    lines: [view === "followed" ? `${inSeason} av ${total} arter i säsong` : `${Math.round((inSeason / total) * 100)} % i säsong`],
  }
}

// Species about to enter and to leave their season: the outlook for the
// coming three weeks.
export function windowsNote({ windows }: HomeData): RailNote {
  const { incoming, outgoing } = windows
  // A fixed name for the section, one word. It is never worked out from the figures.
  const heading = "Prognos"
  if (incoming.loading || outgoing.loading) return { heading, lines: [] }
  // Nothing is on its way in or out: say so, instead of counting zeros.
  if (incoming.count === 0 && outgoing.count === 0) return { heading, lines: ["Inga arter på väg in eller ut"] }

  return {
    heading,
    // Only what there is something of is counted.
    lines: [
      ...(incoming.count > 0 ? [`${formatCount(incoming.count)} på väg in`] : []),
      ...(outgoing.count > 0 ? [`${formatCount(outgoing.count)} på väg ut`] : []),
    ],
  }
}

// Places near the visitor and the next planned route. With nothing planned the
// section says so itself; the margin does not say it twice.
export function fieldNote(nextRoute: { name: string; date: string } | null): RailNote {
  return { heading: "Lokaler", lines: nextRoute ? [nextRoute.name, nextRoute.date] : [] }
}

// The latest observations from every user.
export function observationsNote(count: number): RailNote {
  return { heading: "Senaste obsar", lines: count > 0 ? [`${formatCount(count)} totalt`] : [] }
}

// The species. The tabs beside it already name the reading, so the note keeps
// to the section's name and says which reading and which rows are shown.
export function registerNote({ view, register }: HomeData, selection: Selection): RailNote {
  const heading = "Taxa"
  if (view === "followed") {
    return { heading, lines: register.count > 0 ? [`${formatCount(register.count)} ${register.count === 1 ? "följd art" : "följda arter"}`] : [] }
  }
  if (selection.mode === "landscape") return { heading, lines: ["Per miljö"] }

  const first = (selection.page - 1) * REGISTER_PAGE_SIZE + 1
  const last = first + register.rows.length - 1
  return {
    heading,
    lines: [
      ...(selection.landscapeType ? [selection.landscapeType] : []),
      ...(register.rows.length > 0 ? [`Art ${formatCount(first)}–${formatCount(last)} av ${formatCount(register.count)}`] : []),
    ],
  }
}

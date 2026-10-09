// What the visitor has chosen on the start page. It lives in the URL, so a
// choice can be linked to and the back button undoes it.
export type HomeViewName = "followed" | "all"

// The two ways to read the whole selection: as one list, or per landscape type.
export type OverviewMode = "list" | "landscape"

export type Selection = {
  view: HomeViewName
  mode: OverviewMode
  // The landscape types shown in the per-landscape reading; none means all of them.
  landscapes: string[]
  // The landscape type the list is narrowed to, if any.
  landscapeType: string | null
  page: number
  incomingPage: number
  outgoingPage: number
}

export type SelectionChange = Partial<Selection>

const toPage = (value: string | null | undefined) =>
  Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : 1

export function parseSelection(
  param: (name: string) => string | null | undefined,
  // A visitor without a session follows nothing, so they always get the whole selection.
  isGuest: boolean,
): Selection {
  const mode: OverviewMode = param("mode") === "miljo" ? "landscape" : "list"
  return {
    view: isGuest || param("view") === "all" ? "all" : "followed",
    mode,
    landscapes: param("miljo")?.split(",").filter(Boolean) ?? [],
    landscapeType: mode === "list" ? param("typ") || null : null,
    page: toPage(param("p")),
    incomingPage: toPage(param("incoming_page")),
    outgoingPage: toPage(param("outgoing_page")),
  }
}

// A change of view, reading or landscape type starts the register over from its first page.
export function changeSelection(selection: Selection, change: SelectionChange): Selection {
  const restarts = "view" in change || "mode" in change || "landscapeType" in change
  const next = { ...selection, ...change, page: change.page ?? (restarts ? 1 : selection.page) }
  // Narrowing to one landscape type is a reading of the list.
  if (change.landscapeType) next.mode = "list"
  if (next.mode === "landscape") next.landscapeType = null
  return next
}

export function selectionHref(selection: Selection): string {
  if (selection.view === "followed") return "/"
  const params = new URLSearchParams({ view: "all" })
  if (selection.mode === "landscape") {
    params.set("mode", "miljo")
    if (selection.landscapes.length > 0) params.set("miljo", selection.landscapes.join(","))
  } else {
    if (selection.landscapeType) params.set("typ", selection.landscapeType)
    if (selection.page > 1) params.set("p", String(selection.page))
  }
  if (selection.incomingPage > 1) params.set("incoming_page", String(selection.incomingPage))
  if (selection.outgoingPage > 1) params.set("outgoing_page", String(selection.outgoingPage))
  return `/?${params}`
}

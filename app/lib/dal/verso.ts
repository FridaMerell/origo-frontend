import { cache } from "react"
import { VERSO_ENDPOINTS } from "@/app/lib/config"
import { buildQuery, fetchItem, fetchList } from "@/app/lib/dal/client"

export type Facility = {
  name: string
  id: string
  address: string
  members: string[]
  lat: number
  lng: number
  created_at: string
  updated_at: string
}

export type Booking = {
  id: string
  house: string
  visitor: string
  start_date: string
  end_date: string
  created_at: string
  updated_at: string
}

export type BookingRequest = {
  id: string
  house: string
  requester: string
  start_date: string
  end_date: string
  status: "pending" | "approved" | "rejected"
  created_at: string
  updated_at: string
}

export type CheckOut = {
  id: string
  booking: string
  check_out_time: string
  notes: string
  files: string[]
  created_at: string
  updated_at: string
}

export type Venture = {
  id: string
  house: string
  name: string
  description: string
  priority: number
  budget: number
  files: string[]
  created_at: string
  updated_at: string
  finished_tasks_count: number
  total_tasks_count: number
  total_spent: number
}

export type VentureTask = {
  id: string
  venture: string
  name: string
  description?: string
  status?: "not_started" | "in_progress" | "done"
  completed: boolean
  created_at: string
  updated_at: string
}

export type Expense = {
  id: string
  house: string
  venture: string | null
  user: string | null
  amount: string
  description: string
  date_incurred: string
  created_at: string
  updated_at: string
}

export type VersoUpdate = {
  id: string
  house: string
  venture: string | null
  task: string | null
  author: string | null
  content?: string
  files: string[]
  title: string
  created_at: string
  updated_at: string
}

export type DrawingUnit = "mm" | "cm" | "m"

export type Drawing = {
  id: string
  house: string
  venture: string | null
  author: string | null
  name: string
  description?: string
  unit: DrawingUnit
  pages: string[]
  created_at: string
  updated_at: string
}

/** `surface` is something to cover (a facade), `opening` is subtracted (a window or door). */
export type DrawingRole = "surface" | "opening"

export type DrawingArea = { surface_m2: number; openings_m2: number; net_m2: number }

type DrawingElementBase = {
  id: string
  stroke?: string
  strokeWidth?: number
}

/** All coordinates and lengths are in the drawing's unit. */
export type DrawingElement =
  | (DrawingElementBase & { type: "line"; x1: number; y1: number; x2: number; y2: number })
  | (DrawingElementBase & { type: "polyline"; points: { x: number; y: number }[] })
  | (DrawingElementBase & { type: "polygon"; points: [number, number][]; role?: DrawingRole })
  | (DrawingElementBase & {
      type: "rect"
      x: number
      y: number
      width: number
      height: number
      role?: DrawingRole
    })
  | (DrawingElementBase & { type: "ellipse"; cx: number; cy: number; rx: number; ry: number })
  | (DrawingElementBase & {
      type: "dimension"
      x1: number
      y1: number
      x2: number
      y2: number
      /** Perpendicular distance from the measured points to the dimension line. */
      offset: number
    })
  | (DrawingElementBase & { type: "text"; x: number; y: number; text: string; size?: number })
  | (DrawingElementBase & { type: "note"; x: number; y: number; text: string })

export type DrawingPage = {
  id: string
  drawing: string
  name: string
  order: number
  width: number
  height: number
  elements: DrawingElement[]
  /** Read-only, computed by the API from elements that have a `role`. */
  area: DrawingArea
  created_at: string
  updated_at: string
}

export type PhotoStage = "before" | "during" | "after" | ""

/** How exactly `taken_at` / `date_start` is known. `circa` means approximate. */
export type DatePrecision = "day" | "month" | "year" | "decade" | "circa"

export type Photo = {
  id: string
  house: string
  venture: string | null
  task: string | null
  author: string | null
  /** The file is hosted by the frontend (R2); the API only stores the URLs. */
  url: string
  thumbnail_url: string
  width: number | null
  height: number | null
  title: string
  description: string
  taken_at: string | null
  lat: number | null
  lng: number | null
  stage: PhotoStage
  /** Counterpart photo, e.g. before -> after. One-to-one, same house. */
  pair: string | null
  albums: string[]
  tags: string[]
  /** History fields, used for old photos, maps and letters. */
  date_precision: DatePrecision
  place: string
  /** Free-text provenance. */
  source: string
  /** Plain-text transcription of writing in the image. */
  transcription: string
  /** Photographer / rights. */
  credit: string
  /** Ids of depicted people. */
  people: string[]
  created_at: string
  updated_at: string
}

export type Person = {
  id: string
  house: string
  name: string
  birth_date: string | null
  birth_date_precision: DatePrecision
  death_date: string | null
  death_date_precision: DatePrecision
  relation: string
  notes: string
  /** Photo id (same house) used as the person's main picture. */
  portrait: string | null
}

/** For `parent`, `person` is the parent of `related`; the other kinds are symmetric. */
export type RelationKind = "parent" | "spouse" | "partner" | "sibling" | "other"

export type PersonRelation = {
  id: string
  house: string
  person: string
  related: string
  kind: RelationKind
  /** Free-text wording such as "adoptivson". Required by the API when `kind` is "other". */
  label: string
  start_year: number | null
  end_year: number | null
  notes: string
}

export type HouseDocument = {
  id: string
  house: string
  venture: string | null
  author: string | null
  /** The file is hosted by the frontend (R2); the API only stores the URL. */
  url: string
  file_name: string
  content_type: string
  size: number | null
  title: string
  description: string
  document_date: string | null
  date_precision: DatePrecision
  source: string
  transcription: string
  tags: string[]
  people: string[]
  created_at: string
  updated_at: string
}

/** Items from earlier years on the same month and day. */
export type OnThisDay = {
  date: string
  events: (HistoryEvent & { years_ago: number })[]
  photos: (Photo & { years_ago: number })[]
  births: (Person & { years_ago: number })[]
  deaths: (Person & { years_ago: number })[]
}

export type HistoryEvent = {
  id: string
  house: string
  author: string | null
  title: string
  description: string
  date_start: string
  date_end: string | null
  date_precision: DatePrecision
  place: string
  lat: number | null
  lng: number | null
  source: string
  /** Plain text, e.g. a transcribed interview. */
  transcript: string
  people: string[]
  photos: string[]
  created_at: string
  updated_at: string
}

/** `history` albums hold the house's historical photos and documents. */
export type AlbumKind = "general" | "progress" | "history"

export type Album = {
  id: string
  house: string
  venture: string | null
  cover: string | null
  name: string
  description: string
  kind: AlbumKind
  /** Read-only. */
  photo_count: number
  created_at: string
  updated_at: string
}

export type PhotoTag = {
  id: string
  house: string
  name: string
}

export type VersoDashboard = {
  house: Facility
  houses: Facility[]
  bookings: Booking[]
  booking_requests: BookingRequest[]
  check_outs: CheckOut[]
  ventures: Venture[]
  venture_tasks: VentureTask[]
  expenses: Expense[]
  updates: VersoUpdate[]
  yearly_expense_total: number
}

export const getVersoDashboard = cache(
  (house: string | undefined, year: number): Promise<VersoDashboard | null> =>
    fetchItem<VersoDashboard>(
      `${VERSO_ENDPOINTS.dashboard}${buildQuery({ house, year })}`
    )
)

export const getFacilities = cache(
  (): Promise<Facility[]> => fetchList(VERSO_ENDPOINTS.facilities)
)

// List data for the Verso section is served in one payload by getVersoDashboard
// above; the per-resource list fetchers were removed with that change. What
// remains are the single-item detail fetchers used by the [id] routes.

export const getVenture = cache(
  (id: string): Promise<Venture | null> => fetchItem(`${VERSO_ENDPOINTS.ventures}${id}/`)
)

export const getVentureTask = cache(
  (id: string): Promise<VentureTask | null> =>
    fetchItem(`${VERSO_ENDPOINTS.ventureTasks}${id}/`)
)

export const getExpense = cache(
  (id: string): Promise<Expense | null> => fetchItem(`${VERSO_ENDPOINTS.expenses}${id}/`)
)

export const getDrawings = cache(
  (house: string): Promise<Drawing[]> => fetchList(VERSO_ENDPOINTS.drawings, { house })
)

export const getVentureDrawings = cache(
  (venture: string): Promise<Drawing[]> => fetchList(VERSO_ENDPOINTS.drawings, { venture })
)

export const getDrawing = cache(
  (id: string): Promise<Drawing | null> => fetchItem(`${VERSO_ENDPOINTS.drawings}${id}/`)
)

export const getDrawingPages = cache(
  async (drawing: string): Promise<DrawingPage[]> => {
    const pages = await fetchList<DrawingPage>(VERSO_ENDPOINTS.drawingPages, { drawing })
    // The API serializes width/height as decimal strings.
    return pages
      .map((page) => ({ ...page, width: Number(page.width), height: Number(page.height) }))
      .sort((a, b) => a.order - b.order)
  }
)

export type PhotoFilters = {
  venture?: string
  task?: string
  album?: string
  tag?: string
  /** Photos depicting this person. */
  person?: string
  stage?: PhotoStage
}

export const getPhotos = cache(
  (house: string, filters: PhotoFilters = {}): Promise<Photo[]> =>
    fetchList(VERSO_ENDPOINTS.photos, {
      house,
      venture: filters.venture,
      task: filters.task,
      albums: filters.album,
      tags: filters.tag,
      people: filters.person,
      stage: filters.stage,
    })
)

export const getPhoto = cache(
  (id: string): Promise<Photo | null> => fetchItem(`${VERSO_ENDPOINTS.photos}${id}/`)
)

export const getAlbums = cache(
  (house: string, venture?: string): Promise<Album[]> =>
    fetchList(VERSO_ENDPOINTS.albums, { house, venture })
)

export const getAlbum = cache(
  (id: string): Promise<Album | null> => fetchItem(`${VERSO_ENDPOINTS.albums}${id}/`)
)

export const getPhotoTags = cache(
  (house: string): Promise<PhotoTag[]> => fetchList(VERSO_ENDPOINTS.photoTags, { house })
)

export const getPeople = cache(
  (house: string): Promise<Person[]> => fetchList(VERSO_ENDPOINTS.people, { house })
)

export const getPerson = cache(
  (id: string): Promise<Person | null> => fetchItem(`${VERSO_ENDPOINTS.people}${id}/`)
)

export const getPersonRelations = cache(
  (house: string, person?: string): Promise<PersonRelation[]> =>
    fetchList(VERSO_ENDPOINTS.personRelations, { house, person })
)

export type DocumentFilters = {
  venture?: string
  tag?: string
  person?: string
  content_type?: string
}

export const getDocuments = cache(
  (house: string, filters: DocumentFilters = {}): Promise<HouseDocument[]> =>
    fetchList(VERSO_ENDPOINTS.documents, {
      house,
      venture: filters.venture,
      tags: filters.tag,
      people: filters.person,
      content_type: filters.content_type,
    })
)

export const getDocument = cache(
  (id: string): Promise<HouseDocument | null> => fetchItem(`${VERSO_ENDPOINTS.documents}${id}/`)
)

export const getOnThisDay = cache(
  (house: string, date?: string): Promise<OnThisDay | null> =>
    fetchItem(`${VERSO_ENDPOINTS.onThisDay}${buildQuery({ house, date })}`)
)

export type HistoryEventFilters = {
  person?: string
  photo?: string
  date_precision?: DatePrecision
}

export const getHistoryEvents = cache(
  async (house: string, filters: HistoryEventFilters = {}): Promise<HistoryEvent[]> => {
    const events = await fetchList<HistoryEvent>(VERSO_ENDPOINTS.historyEvents, {
      house,
      people: filters.person,
      photos: filters.photo,
      date_precision: filters.date_precision,
    })
    return events.sort((a, b) => a.date_start.localeCompare(b.date_start))
  }
)

export const getHistoryEvent = cache(
  (id: string): Promise<HistoryEvent | null> => fetchItem(`${VERSO_ENDPOINTS.historyEvents}${id}/`)
)

export const getVersoUpdate = cache(
  (id: string): Promise<VersoUpdate | null> =>
    fetchItem(`${VERSO_ENDPOINTS.versoUpdates}${id}/`)
)

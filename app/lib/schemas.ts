import { z } from "zod"

export const ventureFormSchema = z.object({
  name: z.string().min(1, "Namn krävs."),
  priority: z.coerce.number().int().min(1).max(5),
  description: z.string().optional(),
  budget: z.coerce.number().nonnegative("Budget måste vara ett positivt tal."),
})
export type VentureFormValues = z.infer<typeof ventureFormSchema>

export const drawingFormSchema = z.object({
  name: z.string().min(1, "Namn krävs."),
  description: z.string().optional(),
  unit: z.enum(["mm", "cm", "m"]),
  venture: z.string().optional(),
})
export type DrawingFormValues = z.infer<typeof drawingFormSchema>

export const photoFormSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  venture: z.string().optional(),
  task: z.string().optional(),
  stage: z.enum(["", "before", "during", "after"]),
  albums: z.array(z.string()),
  tags: z.array(z.string()),
  // History fields. Optional so ordinary photos never send them.
  taken_at: z.string().optional(),
  date_precision: z.enum(["day", "month", "year", "decade", "circa"]).optional(),
  place: z.string().optional(),
  source: z.string().optional(),
  transcription: z.string().optional(),
  credit: z.string().optional(),
  people: z.array(z.string()).optional(),
})
export type PhotoFormValues = z.infer<typeof photoFormSchema>

const datePrecision = z.enum(["day", "month", "year", "decade", "circa"])

export const personFormSchema = z
  .object({
    name: z.string().min(1, "Namn krävs."),
    birth_date: z.string().optional(),
    birth_date_precision: datePrecision,
    death_date: z.string().optional(),
    death_date_precision: datePrecision,
    relation: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((data) => !data.birth_date || !data.death_date || data.death_date >= data.birth_date, {
    message: "Dödsdatum kan inte vara före födelsedatum.",
    path: ["death_date"],
  })
export type PersonFormValues = z.infer<typeof personFormSchema>

export const personRelationFormSchema = z
  .object({
    person: z.string().min(1, "Välj en person."),
    related: z.string().min(1, "Välj en person."),
    kind: z.enum(["parent", "spouse", "partner", "sibling", "other"]),
    label: z.string().optional(),
    start_year: z.string().regex(/^\d{0,4}$/, "Ange ett årtal.").optional(),
    end_year: z.string().regex(/^\d{0,4}$/, "Ange ett årtal.").optional(),
    notes: z.string().optional(),
  })
  .refine((data) => data.person !== data.related, {
    message: "Välj två olika personer.",
    path: ["related"],
  })
  .refine((data) => data.kind !== "other" || Boolean(data.label?.trim()), {
    message: "Beskriv relationen.",
    path: ["label"],
  })
  .refine((data) => !data.start_year || !data.end_year || Number(data.end_year) >= Number(data.start_year), {
    message: "Slutår kan inte vara före startår.",
    path: ["end_year"],
  })
export type PersonRelationFormValues = z.infer<typeof personRelationFormSchema>

export const documentFormSchema = z.object({
  title: z.string().min(1, "Titel krävs."),
  description: z.string().optional(),
  document_date: z.string().optional(),
  date_precision: datePrecision,
  source: z.string().optional(),
  transcription: z.string().optional(),
  venture: z.string().optional(),
  tags: z.array(z.string()),
  people: z.array(z.string()),
})
export type DocumentFormValues = z.infer<typeof documentFormSchema>

export const historyEventFormSchema = z
  .object({
    title: z.string().min(1, "Rubrik krävs."),
    description: z.string().optional(),
    date_start: z.string().min(1, "Datum krävs."),
    date_end: z.string().optional(),
    date_precision: datePrecision,
    place: z.string().optional(),
    source: z.string().optional(),
    transcript: z.string().optional(),
    people: z.array(z.string()),
    photos: z.array(z.string()),
  })
  .refine((data) => !data.date_end || data.date_end >= data.date_start, {
    message: "Slutdatum kan inte vara före startdatum.",
    path: ["date_end"],
  })
export type HistoryEventFormValues = z.infer<typeof historyEventFormSchema>

export const albumFormSchema = z.object({
  name: z.string().min(1, "Namn krävs."),
  description: z.string().optional(),
  kind: z.enum(["general", "progress", "history"]),
  venture: z.string().optional(),
})
export type AlbumFormValues = z.infer<typeof albumFormSchema>

export const ventureTaskFormSchema = z.object({
  name: z.string().min(1, "Namn krävs."),
  description: z.string().optional(),
  status: z.enum(["not_started", "in_progress", "done"]),
})
export type VentureTaskFormValues = z.infer<typeof ventureTaskFormSchema>

export const expenseFormSchema = z.object({
  description: z.string().optional(),
  amount: z
    .string()
    .min(1, "Belopp krävs.")
    .regex(/^\d+(\.\d{1,2})?$/, "Ange ett giltigt belopp."),
  date_incurred: z.string().min(1, "Datum krävs."),
})
export type ExpenseFormValues = z.infer<typeof expenseFormSchema>

const idRef = z
  .union([z.string(), z.number()])
  .nullable()
  .transform((value) => (value === null ? null : String(value)))

export const versoUpdateFormSchema = z.object({
  title: z.string().min(1, "Rubrik krävs."),
  content: z.string().optional(),
  venture: idRef,
  task: idRef,
})
export type VersoUpdateFormValues = z.infer<typeof versoUpdateFormSchema>

export const bookingFormSchema = z
  .object({
    visitor: z.string().min(1, "Besökare krävs."),
    start_date: z.string().min(1, "Startdatum krävs."),
    end_date: z.string().min(1, "Slutdatum krävs."),
  })
  .refine((data) => data.end_date >= data.start_date, {
    message: "Slutdatum kan inte vara före startdatum.",
    path: ["end_date"],
  })
export type BookingFormValues = z.infer<typeof bookingFormSchema>

export const loginFormSchema = z.object({
  username: z.string().min(1, "Användarnamn krävs."),
  password: z.string().min(1, "Lösenord krävs."),
})
export type LoginFormValues = z.infer<typeof loginFormSchema>

export const accountProfileSchema = z.object({
  first_name: z.string().trim().max(150, "Högst 150 tecken."),
  last_name: z.string().trim().max(150, "Högst 150 tecken."),
  email: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      "Ange en giltig e-postadress.",
    ),
})
export type AccountProfileValues = z.infer<typeof accountProfileSchema>

export const passwordChangeSchema = z
  .object({
    current_password: z.string().min(1, "Ange ditt nuvarande lösenord."),
    new_password: z.string().min(8, "Minst 8 tecken."),
    confirm_password: z.string().min(1, "Bekräfta det nya lösenordet."),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Lösenorden matchar inte.",
    path: ["confirm_password"],
  })
export type PasswordChangeValues = z.infer<typeof passwordChangeSchema>

const coordinateField = (label: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === "" || /^-?\d+(\.\d+)?$/.test(value), `Ogiltig ${label}.`)

export const createHouseSchema = z.object({
  name: z.string().trim().min(1, "Namn krävs."),
  address: z.string().trim().min(1, "Adress krävs."),
  lat: coordinateField("latitud"),
  lng: coordinateField("longitud"),
})
export type CreateHouseValues = z.infer<typeof createHouseSchema>

export const pasteInvitationSchema = z.object({
  token: z.string().trim().min(1, "Klistra in inbjudnings-token."),
})
export type PasteInvitationValues = z.infer<typeof pasteInvitationSchema>

export const houseInvitationSchema = z.object({
  label: z.string().trim().max(200, "Högst 200 tecken."),
  no_expiry: z.boolean(),
})
export type HouseInvitationValues = z.infer<typeof houseInvitationSchema>

// Invitation whose target is a Flux project the user picks from a dropdown.
export const projectInvitationSchema = houseInvitationSchema.extend({
  project: z.string().trim().min(1, "Välj ett projekt."),
})
export type ProjectInvitationValues = z.infer<typeof projectInvitationSchema>

// Targetless invitation — grants only an Origo account, no house or project.
export const accountInvitationSchema = houseInvitationSchema
export type AccountInvitationValues = z.infer<typeof accountInvitationSchema>

export const redeemSignupSchema = z.object({
  token: z.string().trim().min(1, "Token saknas."),
  username: z.string().trim().min(1, "Användarnamn krävs."),
  password: z.string().min(1, "Lösenord krävs."),
  email: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      "Ange en giltig e-postadress.",
    ),
})
export type RedeemSignupValues = z.infer<typeof redeemSignupSchema>

const numericId = z.coerce.number().int()
const optionalNumericId = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z.union([z.null(), z.coerce.number().int()])
)

export const fluxProjectFormSchema = z.object({
  name: z.string().min(1, "Namn krävs."),
  description: z.string(),
  members: z.array(numericId),
  // Optional so callers that do not touch the identity leave it as it is.
  include_identity: z.boolean().optional(),
  identity: optionalNumericId.optional(),
})
export type FluxProjectFormValues = z.infer<typeof fluxProjectFormSchema>

export const fluxMilestoneFormSchema = z.object({
  title: z.string().min(1, "Namn krävs."),
  description: z.string(),
  status: z.enum(["not_started", "in_progress", "done"]),
  target_date: z
    .string()
    .nullable()
    .transform((value) => (value ? value : null)),
})
export type FluxMilestoneFormValues = z.infer<typeof fluxMilestoneFormSchema>

export const fluxEntityFormSchema = z.object({
  name: z.string().trim().min(1, "Namn krävs.").max(100, "Högst 100 tecken."),
  description: z.string(),
})
export type FluxEntityFormValues = z.infer<typeof fluxEntityFormSchema>

export const FLUX_FIELD_TYPES = [
  "string", "text", "int", "bigint", "decimal", "float", "bool",
  "date", "datetime", "time", "uuid", "json", "email", "url",
] as const

export const fluxFieldFormSchema = z.object({
  name: z.string().trim().min(1, "Namn krävs.").max(100, "Högst 100 tecken."),
  type: z.enum(FLUX_FIELD_TYPES),
  description: z.string(),
  nullable: z.boolean(),
  unique: z.boolean(),
  default: z.string().max(255, "Högst 255 tecken."),
  max_length: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : value),
    z.union([z.null(), z.coerce.number().int().positive("Måste vara större än 0.")])
  ),
})
export type FluxFieldFormValues = z.infer<typeof fluxFieldFormSchema>

export const fluxRelationFormSchema = z.object({
  source: numericId,
  target: numericId,
  kind: z.enum(["fk", "m2m", "o2o"]),
  name: z.string().trim().min(1, "Namn krävs.").max(100, "Högst 100 tecken."),
  related_name: z.string().trim().max(100, "Högst 100 tecken."),
  on_delete: z.enum(["cascade", "protect", "set_null"]),
  nullable: z.boolean(),
  description: z.string(),
})
export type FluxRelationFormValues = z.infer<typeof fluxRelationFormSchema>

export const FLUX_STACK_TARGETS = ["django", "typescript", "csharp"] as const
export const FLUX_OPERATIONS = ["list", "retrieve", "create", "update", "delete"] as const

export const fluxStackFormSchema = z.object({
  targets: z.array(z.enum(FLUX_STACK_TARGETS)),
  api_naming: z.enum(["snake_case", "camel_case"]),
  auth_method: z.enum(["session", "token", "jwt", "none"]),
  database: z.enum(["postgresql", "mysql", "sqlite", "sqlserver"]),
  app_label: z.string().trim().max(100, "Högst 100 tecken."),
  namespace: z.string().trim().max(200, "Högst 200 tecken."),
})
export type FluxStackFormValues = z.infer<typeof fluxStackFormSchema>

export const fluxResourceFormSchema = z.object({
  entity: numericId,
  path: z.string().trim().min(1, "Sökväg krävs.").max(100, "Högst 100 tecken."),
  operations: z.array(z.enum(FLUX_OPERATIONS)),
  filters: z.array(z.string()),
  ordering: z.string().trim().max(100, "Högst 100 tecken."),
})
export type FluxResourceFormValues = z.infer<typeof fluxResourceFormSchema>

export const fluxRoleFormSchema = z.object({
  name: z.string().trim().min(1, "Namn krävs.").max(100, "Högst 100 tecken."),
  description: z.string(),
})
export type FluxRoleFormValues = z.infer<typeof fluxRoleFormSchema>

export const fluxScreenFormSchema = z.object({
  name: z.string().trim().min(1, "Namn krävs.").max(100, "Högst 100 tecken."),
  route: z.string().trim().min(1, "Route krävs.").max(255, "Högst 255 tecken."),
  description: z.string(),
  entities: z.array(numericId),
  parent: optionalNumericId,
})
export type FluxScreenFormValues = z.infer<typeof fluxScreenFormSchema>

export const fluxIntegrationFormSchema = z.object({
  name: z.string().trim().min(1, "Namn krävs.").max(100, "Högst 100 tecken."),
  kind: z.enum(["api", "auth", "storage", "email", "payment", "other"]),
  description: z.string(),
  // One environment variable name per line; split into a list by the server action.
  env_vars: z.string(),
})
export type FluxIntegrationFormValues = z.infer<typeof fluxIntegrationFormSchema>

export const fluxSeedRowFormSchema = z.object({
  entity: numericId,
  // A JSON object; parsed by the server action.
  data: z.string().refine((value) => {
    try {
      const parsed: unknown = JSON.parse(value)
      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
    } catch {
      return false
    }
  }, "Måste vara ett giltigt JSON-objekt."),
})
export type FluxSeedRowFormValues = z.infer<typeof fluxSeedRowFormSchema>

export const FLUX_PERMISSION_SCOPES = ["all", "own", "member"] as const

export const fluxTaskFormSchema = z.object({
  title: z.string().min(1, "Namn krävs."),
  description: z.string(),
  project: numericId,
  milestone: optionalNumericId,
  priority: z.enum(["low", "medium", "high"]),
  status: z.enum(["not_started", "in_progress", "done"]),
  due_date: z
    .string()
    .nullable()
    .transform((value) => (value ? value : null)),
  recurrence: z.enum(["none", "daily", "weekly", "monthly", "yearly"]),
  recurrence_interval: z.coerce.number().int().min(1),
  recurrence_end_date: z
    .string()
    .nullable()
    .transform((value) => (value ? value : null)),
  assignees: z.array(numericId),
})
export type FluxTaskFormValues = z.infer<typeof fluxTaskFormSchema>

export const fluxUpdateFormSchema = z.object({
  content: z.string().min(1, "Innehåll krävs."),
})
export type FluxUpdateFormValues = z.infer<typeof fluxUpdateFormSchema>

export const fluxDocumentFormSchema = z.object({
  title: z.string().trim().min(1, "Rubrik krävs."),
  kind: z.enum(["markdown", "flowchart", "database_schema", "decision"]),
  content: z.string().trim().min(1, "Innehåll krävs."),
  milestone: optionalNumericId,
  task: optionalNumericId,
})
export type FluxDocumentFormValues = z.infer<typeof fluxDocumentFormSchema>

export const apsisPostFormSchema = z.object({
  name: z.string().optional(),
  geolocation: z.string().optional(),
  has_apsis: z.boolean(),
})
export type ApsisPostFormValues = z.infer<typeof apsisPostFormSchema>

export const registerSpeciesFormSchema = z.object({
  species_category: z.string().uuid("Välj en kategori."),
  dyntaxa_taxon_id: z.coerce.number().int().positive("Välj en art från sökningen."),
})

export const speciesCategoryFormSchema = z.object({
  label: z.string().min(1, "Etikett krävs."),
  image_url: z
    .string()
    .trim()
    .url("Ange en giltig URL.")
    .or(z.literal(""))
    .optional(),
  species: z.array(z.string().uuid()),
  taxon_id: z.coerce.number().int().positive("Välj en taxa."),
})
export type SpeciesCategoryFormValues = z.infer<typeof speciesCategoryFormSchema>

export const checklistFormSchema = z.object({
  name: z.string().trim().min(1, "Namn krävs."),
  description: z.string().trim(),
  auto_add: z.boolean(),
  start_date: z
    .string()
    .nullable()
    .transform((value) => (value ? value : null)),
  end_date: z
    .string()
    .nullable()
    .transform((value) => (value ? value : null)),
  geo_area: z.string().uuid("Välj ett giltigt område.").nullable(),
  locale: z.coerce.number().int().positive("Välj en giltig plats.").nullable(),
  species: z.array(z.string().uuid()),
  species_category_ids: z.array(z.string().uuid()).default([]),
})
  .refine(
    (data) => data.species.length > 0 || data.species_category_ids.length > 0,
    { message: "Välj minst en art eller kategori.", path: ["species"] },
  )
  .refine(
    (data) => !data.start_date || !data.end_date || data.end_date >= data.start_date,
    { message: "Slutdatum kan inte vara före startdatum.", path: ["end_date"] },
  )
export type ChecklistFormValues = z.infer<typeof checklistFormSchema>

export const checklistUpdateSchema = z.object({
  name: z.string().trim().min(1, "Namn krävs."),
  description: z.string().trim(),
  auto_add: z.boolean(),
  start_date: z
    .string()
    .nullable()
    .transform((value) => (value ? value : null)),
  end_date: z
    .string()
    .nullable()
    .transform((value) => (value ? value : null)),
  geo_area: z.string().uuid("Välj ett giltigt område.").nullable(),
  locale: z.coerce.number().int().positive("Välj en giltig plats.").nullable(),
  species: z.array(z.string().uuid()).min(1, "Välj minst en art."),
})
  .refine(
    (data) => !data.start_date || !data.end_date || data.end_date >= data.start_date,
    { message: "Slutdatum kan inte vara före startdatum.", path: ["end_date"] },
  )
export type ChecklistUpdateValues = z.infer<typeof checklistUpdateSchema>

export const routeLineStringSchema = z.object({
  type: z.literal("LineString"),
  coordinates: z
    .array(
      z.tuple([
        z.number().min(-180).max(180),
        z.number().min(-90).max(90),
      ]),
    )
    .min(2, "Rita minst två punkter längs rutten."),
})
export type RouteLineString = z.infer<typeof routeLineStringSchema>

export const routeFormSchema = z.object({
  name: z.string().trim().min(1, "Namn krävs."),
  planned_date: z.string().min(1, "Datum krävs."),
  corridor_metres: z
    .coerce.number()
    .int()
    .positive("Sökkorridoren måste vara ett positivt tal."),
  geometry: routeLineStringSchema,
})
export type RouteFormValues = z.infer<typeof routeFormSchema>

// The `location` JSONField stores GeoJSON — a Point as [longitude, latitude],
// or an empty object when no position was given.
export const observationPointSchema = z.object({
  type: z.literal("Point"),
  coordinates: z.tuple([
    z.number().min(-180).max(180),
    z.number().min(-90).max(90),
  ]),
})
export type ObservationPoint = z.infer<typeof observationPointSchema>

export const observationFormSchema = z.object({
  species: z.string().uuid("Välj en art."),
  checklist_items: z.array(z.string().uuid()).default([]),
  observed_at: z.string().min(1, "Tidpunkt krävs."),
  location: observationPointSchema.or(z.object({}).strict()).optional(),
  count: z.number().int().positive("Antal måste vara minst 1.").nullable().default(null),
  life_stage: z.string().trim().default(""),
  notes: z.string().trim().default(""),
})
export type ObservationFormValues = z.infer<typeof observationFormSchema>

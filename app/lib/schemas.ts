import { z } from "zod"

export const ventureFormSchema = z.object({
  name: z.string().min(1, "Namn krävs."),
  description: z.string().min(1, "Beskrivning krävs."),
  priority: z.coerce.number().int().min(1).max(5),
  budget: z.coerce.number().nonnegative("Budget måste vara ett positivt tal."),
})
export type VentureFormValues = z.infer<typeof ventureFormSchema>

export const ventureTaskFormSchema = z.object({
  name: z.string().min(1, "Namn krävs."),
  description: z.string().min(1, "Beskrivning krävs."),
  completed: z.boolean(),
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
  content: z.string().min(1, "Innehåll krävs."),
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

const numericId = z.coerce.number().int()
const optionalNumericId = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z.union([z.null(), z.coerce.number().int()])
)

export const fluxProjectFormSchema = z.object({
  name: z.string().min(1, "Namn krävs."),
  description: z.string(),
  members: z.array(numericId),
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

export const apsisPostFormSchema = z.object({
  name: z.string().optional(),
  geolocation: z.string().optional(),
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
  start_date: z
    .string()
    .nullable()
    .transform((value) => (value ? value : null)),
  end_date: z
    .string()
    .nullable()
    .transform((value) => (value ? value : null)),
  geo_area: z.string().uuid("Välj ett giltigt område.").nullable(),
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
  start_date: z
    .string()
    .nullable()
    .transform((value) => (value ? value : null)),
  end_date: z
    .string()
    .nullable()
    .transform((value) => (value ? value : null)),
  geo_area: z.string().uuid("Välj ett giltigt område.").nullable(),
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
  notes: z.string().trim().default(""),
})
export type ObservationFormValues = z.infer<typeof observationFormSchema>

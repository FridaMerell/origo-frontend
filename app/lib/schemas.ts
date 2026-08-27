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

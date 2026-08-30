import type { ZodType } from "zod"
import {
  apsisPostFormSchema,
  bookingFormSchema,
  expenseFormSchema,
  fluxMilestoneFormSchema,
  fluxProjectFormSchema,
  fluxTaskFormSchema,
  fluxUpdateFormSchema,
  loginFormSchema,
  ventureFormSchema,
  ventureTaskFormSchema,
  versoUpdateFormSchema,
} from "@/app/lib/schemas"

export type FormContract = {
  name: string
  schema: ZodType
  validValues: unknown
}

/**
 * One representative browser-shaped payload for every schema-backed form.
 * This makes it cheap to verify the complete form inventory as schemas and
 * input coercion evolve.
 */
export const formContracts: FormContract[] = [
  {
    name: "login",
    schema: loginFormSchema,
    validValues: { username: "user", password: "secret" },
  },
  {
    name: "venture",
    schema: ventureFormSchema,
    validValues: { name: "Rev-C", description: "Test", priority: "3", budget: "1000.50" },
  },
  {
    name: "venture task",
    schema: ventureTaskFormSchema,
    validValues: { name: "Kalibrera", description: "IMU", completed: false },
  },
  {
    name: "expense",
    schema: expenseFormSchema,
    validValues: { description: "Material", amount: "100.50", date_incurred: "2026-08-27" },
  },
  {
    name: "Verso update",
    schema: versoUpdateFormSchema,
    validValues: { title: "Status", content: "Klart", venture: 12, task: null },
  },
  {
    name: "booking",
    schema: bookingFormSchema,
    validValues: { visitor: "Alex", start_date: "2026-08-27", end_date: "2026-08-28" },
  },
  {
    name: "Flux project",
    schema: fluxProjectFormSchema,
    validValues: { name: "Projekt", description: "", members: ["1", "2"] },
  },
  {
    name: "Flux milestone",
    schema: fluxMilestoneFormSchema,
    validValues: { title: "MVP", description: "", status: "not_started", target_date: "" },
  },
  {
    name: "Flux task",
    schema: fluxTaskFormSchema,
    validValues: {
      title: "Uppgift",
      description: "",
      project: "1",
      milestone: "",
      priority: "medium",
      status: "not_started",
      due_date: "",
      recurrence: "none",
      recurrence_interval: "1",
      recurrence_end_date: "",
      assignees: ["2"],
    },
  },
  {
    name: "Flux update",
    schema: fluxUpdateFormSchema,
    validValues: { content: "En uppdatering" },
  },
  {
    name: "Apsis upload",
    schema: apsisPostFormSchema,
    validValues: { name: "Bild", geolocation: "59.3,18.1" },
  },
]

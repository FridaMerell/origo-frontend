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
  description: string
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
  content: string
  files: string[]
  title: string
  created_at: string
  updated_at: string
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

export const getVersoUpdate = cache(
  (id: string): Promise<VersoUpdate | null> =>
    fetchItem(`${VERSO_ENDPOINTS.versoUpdates}${id}/`)
)

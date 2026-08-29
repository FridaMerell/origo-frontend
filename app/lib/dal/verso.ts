import { cache } from "react"
import { VERSO_ENDPOINTS } from "@/app/lib/config"
import { fetchItem, fetchList } from "@/app/lib/dal/client"

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

export const getFacilities = cache(
  (): Promise<Facility[]> => fetchList(VERSO_ENDPOINTS.facilities)
)

export const getBookings = cache(
  (house: string): Promise<Booking[]> => fetchList(VERSO_ENDPOINTS.bookings, { house })
)

export const getBookingRequests = cache(
  (house: string): Promise<BookingRequest[]> =>
    fetchList(VERSO_ENDPOINTS.bookingRequests, { house })
)

export const getCheckOuts = cache(
  (): Promise<CheckOut[]> => fetchList(VERSO_ENDPOINTS.checkOuts)
)

export const getVentures = cache(
  (house: string): Promise<Venture[]> => fetchList(VERSO_ENDPOINTS.ventures, { house })
)

export const getVenture = cache(
  (id: string): Promise<Venture | null> => fetchItem(`${VERSO_ENDPOINTS.ventures}${id}/`)
)

export const getVentureTasks = cache(
  (venture: string): Promise<VentureTask[]> =>
    fetchList(VERSO_ENDPOINTS.ventureTasks, { venture })
)

export const getAllVentureTasks = cache(
  (): Promise<VentureTask[]> => fetchList(VERSO_ENDPOINTS.ventureTasks)
)

export const getVentureTask = cache(
  (id: string): Promise<VentureTask | null> =>
    fetchItem(`${VERSO_ENDPOINTS.ventureTasks}${id}/`)
)

export const getExpenses = cache(
  (house: string): Promise<Expense[]> => fetchList(VERSO_ENDPOINTS.expenses, { house })
)

export const getExpense = cache(
  (id: string): Promise<Expense | null> => fetchItem(`${VERSO_ENDPOINTS.expenses}${id}/`)
)

export const getYearlyExpenses = cache(
  (house: string, year: number): Promise<number | null> =>
    fetchItem<number>(
      `${VERSO_ENDPOINTS.yearlyExpenses}?house=${house}&year=${String(year)}`
    )
)

export const getVersoUpdates = cache(
  (): Promise<VersoUpdate[]> => fetchList(VERSO_ENDPOINTS.versoUpdates)
)

export const getVersoUpdate = cache(
  (id: string): Promise<VersoUpdate | null> =>
    fetchItem(`${VERSO_ENDPOINTS.versoUpdates}${id}/`)
)

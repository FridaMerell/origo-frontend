import { cache } from "react"
import { redirect } from "next/navigation"
import { ACCOUNTS_ENDPOINTS, AUTH_ENDPOINTS, FLUX_ENDPOINTS, VERSO_ENDPOINTS } from "@/app/lib/config"
import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { getSessionCookies } from "@/app/lib/session"

export type User = {
  id: number
  username: string
  first_name?: string
  last_name?: string
  email?: string

}
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

export type FluxProject = {
  id: number
  name: string
  description: string
  members: number[]
  created_at: string
  updated_at: string
}

export type FluxMilestoneStatus = "not_started" | "in_progress" | "done"

export type FluxMilestone = {
  id: number
  project: number
  title: string
  description: string
  status: FluxMilestoneStatus
  target_date: string | null
  created_at: string
  updated_at: string
}

export type FluxTaskPriority = "low" | "medium" | "high"

export type FluxTaskStatus = FluxMilestoneStatus

export type FluxTask = {
  id: number
  project: number
  milestone: number | null
  parent: number | null
  subtasks: number[]
  requirements: number[]
  required_by: number[]
  assignees: number[]
  title: string
  description: string
  due_date: string | null
  priority: FluxTaskPriority
  status: FluxTaskStatus
  created_at: string
  updated_at: string
}

export type FluxUpdate = {
  id: number
  project: number
  milestone: number | null
  task: number | null
  author: number | null
  content: string
  created_at: string
  updated_at: string
}

async function fetchVersoList<T>(path: string, params?: Record<string, string>): Promise<T[]> {
  const { sessionId, csrfToken } = await getSessionCookies()
  if (!sessionId) return []

  const query = params ? `?${new URLSearchParams(params)}` : ""
  const response = await fetchOrigoApi(`${path}${query}`, {
    headers: {
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
  })

  if (!response.ok) return []

  return response.json()
}

async function fetchVersoItem<T>(path: string): Promise<T | null> {
  const { sessionId, csrfToken } = await getSessionCookies()
  if (!sessionId) return null

  const response = await fetchOrigoApi(path, {
    headers: {
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
  })

  if (!response.ok) return null

  return response.json()
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const { sessionId, csrfToken } = await getSessionCookies()
  if (!sessionId) return null

  const response = await fetchOrigoApi(AUTH_ENDPOINTS.user, {
    headers: {
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
  })
  if (!response.ok) {
    return null
  }
  let responseJson =await  response.json()
  return responseJson[0] ?? null
})

export const getFacilities = cache(
  (): Promise<Facility[]> => fetchVersoList(VERSO_ENDPOINTS.facilities)
)

export const getBookings = cache(
  (house: string): Promise<Booking[]> => fetchVersoList(VERSO_ENDPOINTS.bookings, { house })
)

export const getBookingRequests = cache(
  (house: string): Promise<BookingRequest[]> =>
    fetchVersoList(VERSO_ENDPOINTS.bookingRequests, { house })
)

export const getCheckOuts = cache(
  (): Promise<CheckOut[]> => fetchVersoList(VERSO_ENDPOINTS.checkOuts)
)

export const getVentures = cache(
  (house: string): Promise<Venture[]> => fetchVersoList(VERSO_ENDPOINTS.ventures, { house })
)

export const getVenture = cache(
  (id: string): Promise<Venture | null> => fetchVersoItem(`${VERSO_ENDPOINTS.ventures}${id}/`)
)

export const getVentureTasks = cache(
  (venture: string): Promise<VentureTask[]> =>
    fetchVersoList(VERSO_ENDPOINTS.ventureTasks, { venture })
)

export const getAllVentureTasks = cache(
  (): Promise<VentureTask[]> => fetchVersoList(VERSO_ENDPOINTS.ventureTasks)
)

export const getVentureTask = cache(
  (id: string): Promise<VentureTask | null> =>
    fetchVersoItem(`${VERSO_ENDPOINTS.ventureTasks}${id}/`)
)

export const getExpenses = cache(
  (house: string): Promise<Expense[]> => fetchVersoList(VERSO_ENDPOINTS.expenses, { house })
)

export const getYearlyExpenses = cache( 
  (house: string, year: number): Promise<number|null> =>
    fetchVersoItem<number>(`${VERSO_ENDPOINTS.yearlyExpenses}?house=${house}&year=${String(year)}`) 
)

export const getVersoUpdates = cache(
  (): Promise<VersoUpdate[]> => fetchVersoList(VERSO_ENDPOINTS.versoUpdates)
)

export const getVersoUpdate = cache(
  (id: string): Promise<VersoUpdate | null> =>
    fetchVersoItem(`${VERSO_ENDPOINTS.versoUpdates}${id}/`)
)

async function fetchFluxList<T>(
  path: string,
  params?: Record<string, string | undefined>
): Promise<T[]> {
  const { sessionId, csrfToken } = await getSessionCookies()
  if (!sessionId) return []

  const query = params
    ? `?${new URLSearchParams(
      Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1]))
    )}`
    : ""
  const response = await fetchOrigoApi(`${path}${query}`, {
    headers: {
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
  })

  if (!response.ok) return []

  return response.json()
}

async function fetchFluxItem<T>(path: string): Promise<T | null> {
  const { sessionId, csrfToken } = await getSessionCookies()
  if (!sessionId) return null

  const response = await fetchOrigoApi(path, {
    headers: {
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
  })

  if (!response.ok) return null

  return response.json()
}

export type FluxUser = {
  id: number
  username: string
  first_name?: string
  last_name?: string
  email?: string
}

export const getFluxUsers = cache((ids: number[]): Promise<FluxUser[]> => {
  if (ids.length === 0) return Promise.resolve([])
  const search = new URLSearchParams()
  for (const id of ids) search.append("id", String(id))
  return fetchFluxList(`${ACCOUNTS_ENDPOINTS.users}?${search}`)
})

export const getUsers = cache((): Promise<FluxUser[]> => fetchFluxList(ACCOUNTS_ENDPOINTS.users))

export const getFluxProjects = cache(
  (params?: { members?: string }): Promise<FluxProject[]> =>
    fetchFluxList(FLUX_ENDPOINTS.projects, params)
)

export const getFluxProject = cache(
  (id: string): Promise<FluxProject | null> =>
    fetchFluxItem(`${FLUX_ENDPOINTS.projects}${id}/`)
)

export const getFluxMilestones = cache(
  (params?: { project?: string; status?: FluxMilestoneStatus }): Promise<FluxMilestone[]> =>
    fetchFluxList(FLUX_ENDPOINTS.milestones, params)
)

export const getFluxMilestone = cache(
  (id: string): Promise<FluxMilestone | null> =>
    fetchFluxItem(`${FLUX_ENDPOINTS.milestones}${id}/`)
)

export const getFluxTasks = cache(
  (params?: {
    project?: string
    milestone?: string
    parent?: string
    assignees?: string
    priority?: FluxTaskPriority
  }): Promise<FluxTask[]> => fetchFluxList(FLUX_ENDPOINTS.tasks, params)
)

export const getFluxTask = cache(
  (id: string): Promise<FluxTask | null> => fetchFluxItem(`${FLUX_ENDPOINTS.tasks}${id}/`)
)

export const getFluxUpdates = cache(
  (params?: {
    project?: string
    milestone?: string
    task?: string
  }): Promise<FluxUpdate[]> => fetchFluxList(FLUX_ENDPOINTS.updates, params)
)

export const getFluxUpdate = cache(
  (id: string): Promise<FluxUpdate | null> => fetchFluxItem(`${FLUX_ENDPOINTS.updates}${id}/`)
)

export async function verifySession() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }
  return { isAuth: true, user }
}

import { cache } from "react";
import { redirect } from "next/navigation";
import { AUTH_ENDPOINTS, VERSO_ENDPOINTS } from "@/app/lib/config";
import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client";
import { clearSessionCookies, getSessionCookies } from "@/app/lib/session";

export type User = Record<string, unknown>;
export type Facility = {
  name: string;
  id: string;
  address: string;
  members: string[];
}

export type Booking = {
  id: string;
  house: string;
  visitor: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
};

export type BookingRequest = {
  id: string;
  house: string;
  requester: string;
  start_date: string;
  end_date: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
};

export type CheckOut = {
  id: string;
  booking: string;
  check_out_time: string;
  notes: string;
  files: string[];
  created_at: string;
  updated_at: string;
};

export type Venture = {
  id: string;
  house: string;
  name: string;
  description: string;
  priority: number;
  budget: number;
  files: string[];
  created_at: string;
  updated_at: string;
  finished_tasks_count: number;
  total_tasks_count: number;
  total_spent: number;
};

export type VentureTask = {
  id: string;
  venture: string;
  name: string;
  description: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

export type Expense = {
  id: string;
  house: string;
  venture: string | null;
  amount: string;
  description: string;
  date_incurred: string;
  created_at: string;
  updated_at: string;
};

async function fetchVersoList<T>(path: string, params?: Record<string, string>): Promise<T[]> {
  const { sessionId, csrfToken } = await getSessionCookies();
  if (!sessionId) return [];

  const query = params ? `?${new URLSearchParams(params)}` : "";
  const response = await fetchOrigoApi(`${path}${query}`, {
    headers: {
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
  });
  console.log(`fetchVersoList: ${path} - status: ${response.status}`);

  if (!response.ok) return [];

  return response.json();
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const { sessionId, csrfToken } = await getSessionCookies();
  if (!sessionId) return null;

  const response = await fetchOrigoApi(AUTH_ENDPOINTS.user, {
    headers: {
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
  });

  if (!response.ok) {
    await clearSessionCookies();
    return null;
  }

  return response.json();
});

export const getFacilities = cache(
  (): Promise<Facility[]> => fetchVersoList(VERSO_ENDPOINTS.facilities)
);

export const getBookings = cache(
  (): Promise<Booking[]> => fetchVersoList(VERSO_ENDPOINTS.bookings)
);

export const getBookingRequests = cache(
  (): Promise<BookingRequest[]> => fetchVersoList(VERSO_ENDPOINTS.bookingRequests)
);

export const getCheckOuts = cache(
  (): Promise<CheckOut[]> => fetchVersoList(VERSO_ENDPOINTS.checkOuts)
);

export const getVentures = cache(
  (house: string): Promise<Venture[]> => fetchVersoList(VERSO_ENDPOINTS.ventures, { house })
);

export const getVentureTasks = cache(
  (venture: string): Promise<VentureTask[]> =>
    fetchVersoList(VERSO_ENDPOINTS.ventureTasks, { venture })
);

export const getAllVentureTasks = cache(
  (): Promise<VentureTask[]> => fetchVersoList(VERSO_ENDPOINTS.ventureTasks)
);

export const getExpenses = cache(
  (): Promise<Expense[]> => fetchVersoList(VERSO_ENDPOINTS.expenses)
);

export async function verifySession() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return { isAuth: true, user };
}

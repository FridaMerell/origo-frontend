"use server";

import { ACCOUNTS_ENDPOINTS } from "@/app/lib/config";
import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client";
import { getSessionCookies } from "@/app/lib/session";

type NotificationSummaryResponse = {
  unread_count?: unknown;
  unreadCount?: unknown;
  count?: unknown;
  notifications?: unknown;
  latest_notifications?: unknown;
  latest?: unknown;
  recent_notifications?: unknown;
  recent?: unknown;
  results?: unknown;
};

export type NotificationPreview = {
  id: string;
  title: string;
  body: string;
  createdAt: string | null;
  isRead: boolean;
};

export type NotificationSummary = {
  unreadCount: number;
  notifications: NotificationPreview[];
};

function countFrom(value: unknown) {
  const parsedCount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsedCount) ? Math.max(0, Math.floor(parsedCount)) : 0;
}

function textFrom(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function notificationFrom(value: unknown): NotificationPreview | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  const id = record.id;
  if (typeof id !== "string" && typeof id !== "number") return null;

  const read = record.is_read ?? record.isRead ?? record.read;
  return {
    id: String(id),
    title: textFrom(record, ["title", "heading", "subject"]) || "Notifikation",
    body: textFrom(record, ["body", "message", "description", "content", "text"]),
    createdAt: textFrom(record, ["created_at", "createdAt", "timestamp", "created"]) || null,
    isRead: read === true,
  };
}

function summaryFrom(response: NotificationSummaryResponse): NotificationSummary {
  const source = response.notifications
    ?? response.latest_notifications
    ?? response.latest
    ?? response.recent_notifications
    ?? response.recent
    ?? response.results;
  const notifications = Array.isArray(source)
    ? source.map(notificationFrom).filter((notification): notification is NotificationPreview => notification !== null)
    : [];

  return {
    unreadCount: countFrom(response.unread_count ?? response.unreadCount ?? response.count),
    notifications,
  };
}

function detailFrom(value: unknown) {
  const notification = notificationFrom(value)
  if (notification) return notification

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return notificationFrom((value as Record<string, unknown>).notification)
  }

  return null
}

async function notificationHeaders() {
  const { sessionId, csrfToken } = await getSessionCookies();
  if (!sessionId) return null;

  return {
    "X-CSRFToken": csrfToken ?? "",
    Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
  };
}

export async function getNotificationSummary(): Promise<NotificationSummary> {
  try {
    const headers = await notificationHeaders();
    if (!headers) return { unreadCount: 0, notifications: [] };

    const response = await fetchOrigoApi(ACCOUNTS_ENDPOINTS.notificationsSummary, {
      headers,
      cache: "no-store",
    });

    if (!response.ok) return { unreadCount: 0, notifications: [] };

    const summary = (await response.json()) as NotificationSummaryResponse;
    return summaryFrom(summary);
  } catch {
    return { unreadCount: 0, notifications: [] };
  }
}

export async function getNotification(id: string): Promise<NotificationPreview | null> {
  try {
    const headers = await notificationHeaders()
    if (!headers || !id) return null

    const response = await fetchOrigoApi(ACCOUNTS_ENDPOINTS.notification(id), {
      headers,
      cache: "no-store",
    })
    if (!response.ok) return null

    return detailFrom(await response.json())
  } catch {
    return null
  }
}

export async function markNotificationAsRead(id: string): Promise<boolean> {
  try {
    const headers = await notificationHeaders();
    if (!headers || !id) return false;

    const response = await fetchOrigoApi(ACCOUNTS_ENDPOINTS.notificationRead(id), {
      method: "POST",
      headers,
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function markAllNotificationsAsRead(): Promise<boolean> {
  try {
    const headers = await notificationHeaders();
    if (!headers) return false;

    const response = await fetchOrigoApi(ACCOUNTS_ENDPOINTS.notificationsReadAll, {
      method: "POST",
      headers,
    });

    return response.ok;
  } catch {
    return false;
  }
}

"use server";

import { ACCOUNTS_ENDPOINTS } from "@/app/lib/config";
import { fetchOrigoApi } from "@/app/lib/api-client";
import { authedJsonHeaders } from "@/app/lib/auth-headers";
import { getCurrentUser } from "@/app/lib/dal";
import { firstErrorMessage } from "@/app/lib/api-errors";

export type PushActionResult = { ok: boolean; error?: string; sent?: number };

type SubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

type SubscriptionMeta = { tenant?: string; userAgent?: string };

/** Upsert the browser's push subscription for the signed-in user. */
export async function savePushSubscription(
  subscription: SubscriptionInput,
  meta: SubscriptionMeta = {},
): Promise<PushActionResult> {
  if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return { ok: false, error: "Ogiltig prenumeration." };
  }
  if (!(await getCurrentUser())) return { ok: false, error: "Du måste vara inloggad." };

  const response = await fetchOrigoApi(ACCOUNTS_ENDPOINTS.pushSubscriptions, {
    method: "POST",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      tenant: meta.tenant ?? "",
      user_agent: meta.userAgent ?? "",
    }),
  });

  if (!response.ok) {
    return {
      ok: false,
      error: firstErrorMessage(await response.text().catch(() => ""), response.status),
    };
  }
  return { ok: true };
}

/** Deactivate a subscription by endpoint (called on opt-out). */
export async function removePushSubscription(endpoint: string): Promise<PushActionResult> {
  if (!endpoint) return { ok: true };
  if (!(await getCurrentUser())) return { ok: false, error: "Du måste vara inloggad." };

  const response = await fetchOrigoApi(ACCOUNTS_ENDPOINTS.pushSubscriptions, {
    method: "DELETE",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({ endpoint }),
  });

  if (!response.ok && response.status !== 404) {
    return {
      ok: false,
      error: firstErrorMessage(await response.text().catch(() => ""), response.status),
    };
  }
  return { ok: true };
}

/** Ask the API to push a test notification to the user's own devices. */
export async function sendTestPush(): Promise<PushActionResult> {
  if (!(await getCurrentUser())) return { ok: false, error: "Du måste vara inloggad." };

  const response = await fetchOrigoApi(ACCOUNTS_ENDPOINTS.pushTest, {
    method: "POST",
    headers: await authedJsonHeaders(),
  });

  if (!response.ok) {
    return {
      ok: false,
      error: firstErrorMessage(await response.text().catch(() => ""), response.status),
    };
  }

  const body = (await response.json().catch(() => ({}))) as { sent?: number };
  return { ok: true, sent: typeof body.sent === "number" ? body.sent : undefined };
}

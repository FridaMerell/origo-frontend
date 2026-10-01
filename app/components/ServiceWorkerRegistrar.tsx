"use client";

import { useEffect } from "react";
import { useUser } from "@/app/lib/user-context";
import {
  currentTenant,
  getExistingSubscription,
  isPushSupported,
  registerServiceWorker,
} from "@/app/lib/push-client";
import { savePushSubscription } from "@/app/actions/push";

/**
 * Registers the push service worker on every origin and keeps the stored
 * subscription in sync — on load, and when the push service rotates it
 * (the SW posts an "origo-push-subscription-changed" message).
 */
export function ServiceWorkerRegistrar() {
  const user = useUser();
  const signedIn = Boolean(user);

  useEffect(() => {
    if (!isPushSupported()) return;
    let cancelled = false;

    void (async () => {
      // register() rejects wherever service workers are unavailable (private windows,
      // disabled or blocked storage, embedded browsers). Push is optional, so carry on
      // without it instead of leaving the rejection unhandled.
      const registration = await registerServiceWorker().catch(() => null);
      if (!registration || cancelled || !signedIn) return;

      const subscription = await getExistingSubscription();
      if (subscription) {
        const json = subscription.toJSON();
        if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
          void savePushSubscription(
            { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } },
            { tenant: currentTenant(), userAgent: navigator.userAgent },
          );
        }
      }
    })();

    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; subscription?: PushSubscriptionJSON } | undefined;
      if (!signedIn || data?.type !== "origo-push-subscription-changed" || !data.subscription) return;
      const sub = data.subscription;
      if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return;
      void savePushSubscription(
        { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
        { tenant: currentTenant(), userAgent: navigator.userAgent },
      );
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, [signedIn]);

  return null;
}

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getNotification,
  getNotificationSummary,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationPreview,
} from "@/app/actions/notifications";
import { PushControls } from "@/app/components/ui/PushControls";
import { currentTenant } from "@/app/lib/push-client";
import { useUser } from "@/app/lib/user-context";
import { Sign, signBodyClass, signPanelClass } from "@/app/apsis/ui/Sign";

const textButtonClass =
  "cursor-pointer whitespace-nowrap font-semibold text-text underline underline-offset-4 hover:text-accent disabled:opacity-50";

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/**
 * The user's Apsis notifications as a sign of their own: each under a rule, the
 * unread ones in heavier type, and a row at the top for marking them all read
 * and for turning push on or off.
 */
export default function NotificationsView() {
  const user = useUser();
  const [notifications, setNotifications] = useState<NotificationPreview[] | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(() => {
    void getNotificationSummary(currentTenant()).then((summary) => {
      setNotifications(summary.notifications);
      setUnreadCount(summary.unreadCount);
    });
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const toggle = async (notification: NotificationPreview) => {
    const opening = openId !== notification.id;
    setOpenId(opening ? notification.id : null);
    if (!opening) return;

    if (!notification.isRead && (await markNotificationAsRead(notification.id))) {
      setNotifications((current) =>
        current?.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)) ?? null,
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    }
    const detailed = await getNotification(notification.id);
    if (!detailed) return;
    setNotifications((current) =>
      current?.map((item) => (item.id === notification.id ? { ...detailed, isRead: true } : item)) ?? null,
    );
  };

  const markAll = async () => {
    setMarkingAll(true);
    const done = await markAllNotificationsAsRead(currentTenant());
    setMarkingAll(false);
    if (!done) return;
    setNotifications((current) => current?.map((item) => ({ ...item, isRead: true })) ?? null);
    setUnreadCount(0);
  };

  return (
    <Sign title="Notifikationer">
      <div className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        {unreadCount > 0 && (
          <button type="button" onClick={() => void markAll()} disabled={markingAll} className={textButtonClass}>
            Markera alla som lästa
          </button>
        )}
        <PushControls item={textButtonClass} note="w-full text-text-muted" />
      </div>

      {notifications === null ? (
        <p className={signBodyClass}>Hämtar notifikationer …</p>
      ) : notifications.length === 0 ? (
        <p className={signBodyClass}>Inga notifikationer ännu.</p>
      ) : (
        <ul className="grid gap-x-8 gap-y-8 lg:max-w-3xl">
          {notifications.map((notification) => {
            const open = openId === notification.id;
            const hasBody = notification.body && notification.body !== notification.title;
            return (
              <li key={notification.id} className={signPanelClass}>
                <button
                  type="button"
                  onClick={() => void toggle(notification)}
                  aria-expanded={open}
                  className="block w-full cursor-pointer text-left"
                >
                  <span className={`block font-display text-lg leading-7 text-text ${notification.isRead ? "font-normal" : "font-semibold"}`}>
                    {notification.title}
                  </span>
                  {notification.createdAt && (
                    <time className="mt-1 block text-sm italic text-text-muted">{formatTime(notification.createdAt)}</time>
                  )}
                  {hasBody && (
                    <span className={`mt-2 block whitespace-pre-wrap ${signBodyClass} ${open ? "" : "line-clamp-2"}`}>
                      {notification.body}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sign>
  );
}

"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { AppLink as Link } from "@/app/components/ui/AppLink";
import { getNotificationSummary } from "@/app/actions/notifications";
import { currentTenant } from "@/app/lib/push-client";
import { useUser } from "@/app/lib/user-context";

/** The number of unread Apsis notifications. */
function useUnreadCount() {
  const user = useUser();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    void getNotificationSummary(currentTenant()).then((summary) => setCount(summary.unreadCount));
  }, [user]);

  return count;
}

function Badge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="min-w-4 rounded-full bg-accent px-1 text-center text-[10px] font-bold leading-4 text-accent-contrast">
      {count > 99 ? "99+" : count}
    </span>
  );
}

/** The bell in the top bar: a link to the notifications page. */
export function NotificationBellLink({ className, onClick }: { className: string; onClick?: () => void }) {
  const count = useUnreadCount();
  return (
    <Link href="/notifikationer" onClick={onClick} aria-label="Notifikationer" title="Notifikationer" className={`relative ${className}`}>
      <Bell size={16} aria-hidden />
      {count > 0 && (
        <span className="absolute -right-1.5 -top-1.5">
          <Badge count={count} />
        </span>
      )}
    </Link>
  );
}

/** The row in the mobile menu: a link to the notifications page with the unread count. */
export function NotificationMenuLink({ className, onClick }: { className: string; onClick?: () => void }) {
  const count = useUnreadCount();
  return (
    <Link href="/notifikationer" onClick={onClick} className={className}>
      <Bell size={18} aria-hidden />
      <span>Notifikationer</span>
      <Badge count={count} />
    </Link>
  );
}

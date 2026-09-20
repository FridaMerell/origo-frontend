"use client";

import { useBookingDrawer } from "@/app/verso/_state/booking-drawer";
import type { Booking } from "@/app/lib/dal";

export function StayBar({
  booking,
  color,
  showLabel,
  roundLeft,
  roundRight,
}: {
  booking: Booking;
  color: string;
  showLabel: boolean;
  roundLeft: boolean;
  roundRight: boolean;
}) {
  const { openEdit } = useBookingDrawer();

  return (
    <button
      type="button"
      onClick={() => openEdit(booking)}
      className={`mt-1.5 block h-5 w-full appearance-none border-0 text-left font-body text-[11px] leading-5 text-white ${showLabel ? "px-1.5" : "px-0"} ${roundLeft ? "rounded-l" : ""} ${roundRight ? "rounded-r" : ""}`}
      style={{ background: color }}
    >
      {showLabel ? booking.visitor : " "}
    </button>
  );
}

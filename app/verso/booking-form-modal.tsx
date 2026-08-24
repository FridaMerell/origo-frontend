"use client";

import { useActionState, useEffect, useState } from "react";
import { createBooking, updateBooking, type CreateBookingState } from "@/app/actions/booking";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Icon } from "@/app/components/ui/Icon";
import type { Booking } from "@/app/lib/dal";

const initialState: CreateBookingState = undefined;

export function BookingFormModal({
  open,
  onClose,
  booking,
}: {
  open: boolean;
  onClose: () => void;
  booking?: Booking;
}) {
  const action = booking ? updateBooking.bind(null, booking.id) : createBooking;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [startDate, setStartDate] = useState(booking?.start_date ?? "");

  useEffect(() => {
    if (state?.success) onClose();
  }, [state, onClose]);

  useEffect(() => {
    setStartDate(booking?.start_date ?? "");
  }, [booking, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="m-0 font-display text-lg font-semibold text-text">
            {booking ? "Redigera bokning" : "Boka stugan"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-text-muted">
            <Icon name="x" size={16} />
          </button>
        </div>

        <form action={formAction} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-text-muted">
            Besökare
            <input
              type="text"
              name="visitor"
              required
              defaultValue={booking?.visitor}
              className="rounded border border-border bg-surface px-2.5 py-1.5 text-text"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-muted">
            Startdatum
            <input
              type="date"
              name="start_date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded border border-border bg-surface px-2.5 py-1.5 text-text"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-muted">
            Slutdatum
            <input
              type="date"
              name="end_date"
              required
              min={startDate || undefined}
              defaultValue={booking?.end_date}
              className="rounded border border-border bg-surface px-2.5 py-1.5 text-text"
            />
          </label>

          {state?.error && <p className="text-sm text-danger">{state.error}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Avbryt
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={pending}>
              {pending ? "Sparar..." : "Spara"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

"use client";

import { useActionState, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createBooking, updateBooking, type CreateBookingState } from "@/app/actions/booking";
import { Button } from "@/app/components/ui/Button";
import { Drawer } from "@/app/components/ui/Drawer";
import type { Booking } from "@/app/lib/dal";
import { useFacilities } from "@/app/lib/facility-context";

const initialState: CreateBookingState = undefined;

export function BookingFormDrawer({
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
  const pathname = usePathname();
  const { selectedFacility } = useFacilities();

  useEffect(() => {
    if (state?.success) onClose();
  }, [state, onClose]);

  useEffect(() => {
    setStartDate(booking?.start_date ?? "");
  }, [booking, open]);

  return (
    <Drawer
      title={booking ? "Redigera bokning" : "Boka stugan"}
      open={open}
      onOpenChange={(next) => !next && onClose()}
    >
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="path" value={pathname} />
        {!booking && <input type="hidden" name="house" value={selectedFacility?.id ?? ""} />}
        <label className="flex flex-col gap-1 text-sm text-text-muted">
          Besökare
          <input
            type="text"
            name="visitor"
            required
            defaultValue={booking?.visitor}
            className="rounded border border-field-border bg-surface px-2.5 py-1.5 text-text"
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
            className="rounded border border-field-border bg-surface px-2.5 py-1.5 text-text"
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
            className="rounded border border-field-border bg-surface px-2.5 py-1.5 text-text"
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
    </Drawer>
  );
}

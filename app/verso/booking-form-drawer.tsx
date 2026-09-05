"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createBooking, updateBooking } from "@/app/actions/booking";
import { bookingFormSchema, type BookingFormValues } from "@/app/lib/schemas";
import { Drawer } from "@/app/components/ui/Drawer";
import { Field, fieldInputClass } from "@/app/components/form/Field";
import { useSubmitAction } from "@/app/components/form/useSubmitAction";
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback";
import type { Booking } from "@/app/lib/dal";
import { useFacilities } from "@/app/verso/_state/facility-context";

export function BookingFormDrawer({
  open,
  onClose,
  booking,
}: {
  open: boolean;
  onClose: () => void;
  booking?: Booking;
}) {
  const { selectedFacility } = useFacilities();
  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      visitor: booking?.visitor ?? "",
      start_date: booking?.start_date ?? "",
      end_date: booking?.end_date ?? "",
    },
  });
  const startDate = useWatch({ control, name: "start_date" });

  useEffect(() => {
    reset({
      visitor: booking?.visitor ?? "",
      start_date: booking?.start_date ?? "",
      end_date: booking?.end_date ?? "",
    });
  }, [booking, open, reset]);

  const submit = useSubmitAction(setError);

  const onSubmit = handleSubmit((data) =>
    submit(
      () => (booking ? updateBooking(booking.id, data) : createBooking(selectedFacility?.id ?? "", data)),
      onClose
    )
  );

  return (
    <Drawer
      title={booking ? "Redigera bokning" : "Boka stugan"}
      open={open}
      onOpenChange={(next) => !next && onClose()}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <Field label="Besökare" error={errors.visitor}>
          <input type="text" className={fieldInputClass} {...register("visitor")} />
        </Field>

        <Field label="Startdatum" error={errors.start_date}>
          <input type="date" className={fieldInputClass} {...register("start_date")} />
        </Field>

        <Field label="Slutdatum" error={errors.end_date}>
          <input
            type="date"
            min={startDate || undefined}
            className={fieldInputClass}
            {...register("end_date")}
          />
        </Field>

        <FormRootError error={errors.root} />
        <FormActions isSubmitting={isSubmitting} onCancel={onClose} className="mt-2 flex justify-end gap-2" />
      </form>
    </Drawer>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/Button";

import { BookingFormDrawer } from "@/app/verso/booking-form-drawer";
import { Plus } from "lucide-react"

export function BookVisitButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        <Plus size={14} className="text-accent-contrast" />
        Boka stugan
      </Button>
      <BookingFormDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}

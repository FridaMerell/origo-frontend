"use client";

import { Button } from "@/app/components/ui/Button";
import { useBookingDrawer } from "@/app/verso/_state/booking-drawer";
import { Plus } from "lucide-react";

export function BookVisitButton() {
  const { openNew } = useBookingDrawer();

  return (
    <Button variant="primary" size="sm" onClick={openNew}>
      <Plus size={14} className="text-accent-contrast" />
      Boka stugan
    </Button>
  );
}

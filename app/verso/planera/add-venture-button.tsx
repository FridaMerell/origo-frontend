"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Icon } from "@/app/components/ui/Icon";
import { VentureFormModal } from "@/app/verso/planera/venture-form-modal";

export function AddVentureButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        <Icon name="plus" size={14} className="text-accent-contrast" />
        Ny satsning
      </Button>
      <VentureFormModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

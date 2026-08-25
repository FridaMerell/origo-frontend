"use client";

import { useActionState, useEffect, useState } from "react";
import { createVenture, type CreateVentureState } from "@/app/actions/venture";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Icon } from "@/app/components/ui/Icon";

const initialState: CreateVentureState = undefined;

export function VentureFormModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(createVenture, initialState);
  const [priority, setPriority] = useState(3);

  useEffect(() => {
    if (state?.success) onClose();
  }, [state, onClose]);

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
          <h2 className="m-0 font-display text-lg font-semibold text-text">Nytt projekt</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-text-muted">
            <Icon name="x" size={16} />
          </button>
        </div>

        <form action={formAction} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-text-muted">
            Namn
            <input
              type="text"
              name="name"
              required
              className="rounded border border-border bg-surface px-2.5 py-1.5 text-text"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-muted">
            Beskrivning
            <textarea
              name="description"
              required
              className="rounded border border-border bg-surface px-2.5 py-1.5 text-text"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-muted">
            Prioritet ({priority})
            <input
              type="range"
              name="priority"
              min={1}
              max={5}
              step={1}
              required
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="accent-accent"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-muted">
            Budget
            <input
              type="text"
              name="budget"
              required
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

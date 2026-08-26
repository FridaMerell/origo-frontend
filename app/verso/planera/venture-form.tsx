"use client";

import { useActionState, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createVenture, type CreateVentureState } from "@/app/actions/venture";
import { Button } from "@/app/components/ui/Button";

const initialState: CreateVentureState = undefined;

export function VentureForm({ onSuccess }: { onSuccess?: () => void }) {
  const [state, formAction, pending] = useActionState(createVenture, initialState);
  const [priority, setPriority] = useState(3);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (state?.success) {
      onSuccess?.();
      router.refresh();
    }
  }, [state, onSuccess, router]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="path" value={pathname} />
      <label className="flex flex-col gap-1 text-sm text-text-muted">
        Namn
        <input
          type="text"
          name="name"
          required
          className="rounded border border-field-border bg-surface px-2.5 py-1.5 text-text"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-text-muted">
        Beskrivning
        <textarea
          name="description"
          required
          className="rounded border border-field-border bg-surface px-2.5 py-1.5 text-text"
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
          className="rounded border border-field-border bg-surface px-2.5 py-1.5 text-text"
        />
      </label>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <div className="mt-2 flex justify-end">
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Sparar..." : "Spara"}
        </Button>
      </div>
    </form>
  );
}

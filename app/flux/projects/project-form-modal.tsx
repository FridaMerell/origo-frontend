"use client";

import { useActionState, useEffect } from "react";
import { createProject, type FluxActionState } from "@/app/actions/flux";
import { Button } from "@/app/components/ui/Button";
import { Icon } from "@/app/components/ui/Icon";

const initialState: FluxActionState = undefined;

export function ProjectFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(createProject, initialState);

  useEffect(() => {
    if (state?.success) onClose();
  }, [state, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-200 ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-black/35" onClick={onClose} />

      <div
        className={`absolute inset-y-0 right-0 flex w-full max-w-[480px] flex-col bg-surface shadow-lg transition-transform duration-200 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <h2 className="m-0 font-display text-lg font-semibold text-text">New project</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-text-faint">
            <Icon name="x" size={18} />
          </button>
        </div>

        <form action={formAction} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 flex-col gap-4.5 overflow-auto px-6 py-6">
            <label className="flex flex-col gap-1.5 text-sm text-text-muted">
              Name
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. Rev-C flight controller"
                className="rounded border border-border bg-surface px-2.5 py-1.5 text-text"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm text-text-muted">
              Description
              <textarea
                name="description"
                rows={3}
                placeholder="What is this project about"
                className="rounded border border-border bg-surface px-2.5 py-1.5 text-text"
              />
            </label>

            {state?.errors?.name && <p className="text-sm text-danger">{state.errors.name[0]}</p>}
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-border px-6 py-4">
            <Button type="button" variant="ghost" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={pending}>
              {pending ? "Saving..." : "Create project"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

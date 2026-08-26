"use client";

import { useActionState, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { updateVenture, type UpdateVentureState } from "@/app/actions/venture";
import { Button } from "@/app/components/ui/Button";
import { FileUpload, type UploadedFile } from "@/app/components/ui/FileUpload";
import type { Venture } from "@/app/lib/dal";

const initialState: UpdateVentureState = undefined;

export function VentureEditForm({ venture }: { venture: Venture }) {
  const [state, formAction, pending] = useActionState(updateVenture, initialState);
  const [priority, setPriority] = useState(venture.priority);
  const [files, setFiles] = useState<UploadedFile[]>(
    venture.files.map((url) => ({ url, name: url.split("/").pop() ?? url }))
  );
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={venture.id} />
      <input type="hidden" name="path" value={pathname} />

      <label className="flex flex-col gap-1 text-sm text-text-muted">
        Namn
        <input
          type="text"
          name="name"
          required
          defaultValue={venture.name}
          className="rounded border border-field-border bg-surface px-2.5 py-1.5 text-text"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-text-muted">
        Beskrivning
        <textarea
          name="description"
          required
          defaultValue={venture.description}
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
          defaultValue={venture.budget}
          className="rounded border border-field-border bg-surface px-2.5 py-1.5 text-text"
        />
      </label>

      <div className="flex flex-col gap-1 text-sm text-text-muted">
        Bilagor
        <FileUpload folder="verso" files={files} onChange={setFiles} />
      </div>

      {files.map((file) => (
        <input key={file.url} type="hidden" name="files" value={file.url} />
      ))}

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <div className="mt-2 flex justify-end">
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Sparar..." : "Spara"}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createUpdate, updateUpdate, type FluxActionState } from "@/app/actions/flux";
import { Button } from "@/app/components/ui/Button";
import { FileUpload, type UploadedFile } from "@/app/components/ui/FileUpload";
import type { FluxUpdate } from "@/app/lib/dal";

const initialState: FluxActionState = undefined;

export function UpdateForm({
  update,
  defaultProject,
  defaultMilestone,
  defaultTask,
  onDone,
}: {
  update?: FluxUpdate;
  defaultProject: number;
  defaultMilestone: number | null;
  defaultTask: number | null;
  onDone?: () => void;
}) {
  const action = useMemo(
    () => (update ? updateUpdate.bind(null, update.id) : createUpdate),
    [update?.id]
  );

  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [files, setFiles] = useState<UploadedFile[]>(
    (update?.files ?? []).map((url) => ({ url, name: url.split("/").pop() ?? url }))
  );
  const previousSuccess = useRef(false);

  useEffect(() => {
    const isSuccess = !!state?.success;
    if (isSuccess && !previousSuccess.current) {
      if (update) {
        onDone?.();
      } else {
        formRef.current?.reset();
        setFiles([]);
      }
    }
    previousSuccess.current = isSuccess;
  }, [state?.success, update, onDone]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2.5">
      <input type="hidden" name="project" value={defaultProject} />
      <input type="hidden" name="milestone" value={defaultMilestone ?? ""} />
      <input type="hidden" name="task" value={defaultTask ?? ""} />
      <input type="hidden" name="files_field" value="1" />

      <textarea
        name="content"
        required
        rows={2}
        defaultValue={update?.content}
        placeholder="Skriv en uppdatering..."
        className="rounded border border-field-border bg-surface px-2.5 py-1.5 text-sm text-text"
      />

      <FileUpload folder="flux" files={files} onChange={setFiles} />
      {files.map((file) => (
        <input key={file.url} type="hidden" name="files" value={file.url} />
      ))}

      {state?.errors?.content && (
        <p className="text-sm text-danger">{state.errors.content[0]}</p>
      )}

      <div className="flex items-center justify-end gap-2.5">
        {update && (
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>
            Avbryt
          </Button>
        )}
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Sparar..." : update ? "Spara" : "Lägg till uppdatering"}
        </Button>
      </div>
    </form>
  );
}

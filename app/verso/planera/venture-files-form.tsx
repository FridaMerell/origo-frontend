"use client";

import { useActionState, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { updateVentureFiles, type UpdateVentureFilesState } from "@/app/actions/venture";
import { Button } from "@/app/components/ui/Button";
import { FileUpload, type UploadedFile } from "@/app/components/ui/FileUpload";
import type { Venture } from "@/app/lib/dal";

const initialState: UpdateVentureFilesState = undefined;

export function VentureFilesForm({ venture }: { venture: Venture }) {
  const [state, formAction, pending] = useActionState(updateVentureFiles, initialState);
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

      <FileUpload folder="verso" files={files} onChange={setFiles} />

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

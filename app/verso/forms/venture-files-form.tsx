"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { updateVentureFiles } from "@/app/actions/venture";
import { Button } from "@/app/components/ui/Button";
import { FileUpload } from "@/app/components/ui/FileUpload";
import { useDrawerClose } from "@/app/components/ui/Drawer";
import { useUploadedFiles } from "@/app/components/form/useUploadedFiles";
import type { Venture } from "@/app/lib/dal";

export function VentureFilesForm({ venture }: { venture: Venture }) {
  const uploadedFiles = useUploadedFiles(venture.files, venture.id);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();
  const closeDrawer = useDrawerClose();

  const onSubmit = () => {
    startTransition(async () => {
      const result = await updateVentureFiles(
        venture.id,
        uploadedFiles.urls,
        pathname
      );
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(undefined);
      closeDrawer();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <FileUpload folder="verso" files={uploadedFiles.files} onChange={uploadedFiles.setFiles} />

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="mt-2 flex justify-end">
        <Button type="button" variant="primary" size="sm" disabled={pending} onClick={onSubmit}>
          {pending ? "Sparar..." : "Spara"}
        </Button>
      </div>
    </div>
  );
}

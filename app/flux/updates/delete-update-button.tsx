"use client";

import { deleteUpdate } from "@/app/actions/flux";
import { DeleteButton } from "@/app/components/ui/DeleteButton";

export function DeleteUpdateButton({ id }: { id: number }) {
  return (
    <DeleteButton
      label="Ta bort uppdatering"
      onDelete={() => { deleteUpdate(id) }}
    />
  );
}

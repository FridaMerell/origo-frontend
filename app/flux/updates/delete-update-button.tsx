"use client";

import { deleteUpdate } from "@/app/actions/flux/updates";
import { DeleteButton } from "@/app/components/ui/DeleteButton";

export function DeleteUpdateButton({ id }: { id: number }) {
  return (
    <DeleteButton
      label="Ta bort uppdatering"
      confirmTitle="Ta bort uppdatering"
      confirmMessage="Ta bort den här uppdateringen? Det går inte att ångra."
      onDelete={() => { deleteUpdate(id) }}
    />
  );
}

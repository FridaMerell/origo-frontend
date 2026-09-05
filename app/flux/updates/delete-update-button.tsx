"use client";

import { deleteUpdate } from "@/app/actions/flux/updates";
import { DeleteButton } from "@/app/components/ui/DeleteButton";
import { useFluxUpdateActions, useFluxUpdates } from "@/app/flux/_state/flux-context";

export function DeleteUpdateButton({ id }: { id: number }) {
  const updates = useFluxUpdates();
  const { addUpdate, removeUpdate } = useFluxUpdateActions();
  const update = updates.find((item) => item.id === id);
  return (
    <DeleteButton
      label="Ta bort uppdatering"
      confirmTitle="Ta bort uppdatering"
      confirmMessage="Ta bort den här uppdateringen? Det går inte att ångra."
      onDelete={async () => {
        removeUpdate(id);
        const result = await deleteUpdate(id);
        if (result?.error && update) addUpdate(update);
      }}
    />
  );
}

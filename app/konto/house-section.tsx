"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/app/components/form/zodResolver";
import { createHouse, updateHouse } from "@/app/actions/account/houses";
import { redeemInvitation } from "@/app/actions/account/invitations";
import {
  createHouseSchema,
  type CreateHouseValues,
  pasteInvitationSchema,
  type PasteInvitationValues,
} from "@/app/lib/schemas";
import type { Facility, HouseInvitation } from "@/app/lib/dal";
import { InvitationManager } from "./invitation-manager";
import {
  BUTTON,
  ERROR_TEXT,
  Field,
  GHOST_BUTTON,
  LABEL,
  MONO,
  OK_TEXT,
  Section,
  ToggleForm,
} from "./ui";

function coord(value: number | null | undefined) {
  return value ? String(value) : "";
}

function HouseForm({ house, onDone }: { house?: Facility; onDone: () => void }) {
  const router = useRouter();
  const isEdit = Boolean(house);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateHouseValues>({
    resolver: zodResolver(createHouseSchema),
    defaultValues: {
      name: house?.name ?? "",
      address: house?.address ?? "",
      lat: coord(house?.lat),
      lng: coord(house?.lng),
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result =
      isEdit && house ? await updateHouse(house.id, values) : await createHouse(values);
    if (result?.fieldErrors) {
      for (const [key, message] of Object.entries(result.fieldErrors)) {
        if (message) setError(key as keyof CreateHouseValues, { message });
      }
      return;
    }
    if (result?.error) {
      setError("root", { message: result.error });
      return;
    }
    if (!isEdit) reset();
    router.refresh();
    onDone();
  });

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
      <Field label="Namn" error={errors.name} {...register("name")} />
      <Field label="Adress" error={errors.address} {...register("address")} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Latitud (valfritt)" inputMode="decimal" error={errors.lat} {...register("lat")} />
        <Field label="Longitud (valfritt)" inputMode="decimal" error={errors.lng} {...register("lng")} />
      </div>

      {errors.root && <p className={ERROR_TEXT}>{errors.root.message}</p>}

      <div className="flex gap-3">
        <button type="submit" className={BUTTON} disabled={isSubmitting}>
          {isSubmitting ? "Sparar …" : isEdit ? "Spara" : "Skapa hus"}
        </button>
        <button type="button" className={GHOST_BUTTON} onClick={onDone}>
          Avbryt
        </button>
      </div>
    </form>
  );
}

function HouseRow({ house, invitations }: { house: Facility; invitations: HouseInvitation[] }) {
  const [panel, setPanel] = useState<"none" | "edit" | "invites">("none");
  const toggle = (target: "edit" | "invites") =>
    setPanel((current) => (current === target ? "none" : target));

  return (
    <li className="py-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="flex min-w-0 flex-col">
          <span className="text-sm text-[#1B252B]">{house.name}</span>
          <span className={`${MONO} text-[10px] uppercase tracking-[0.1em] text-[#58636A]`}>
            {house.address || "—"}
          </span>
        </span>
        <span className="flex shrink-0 gap-2">
          <button type="button" className={GHOST_BUTTON} onClick={() => toggle("invites")}>
            Inbjudningar
          </button>
          <button type="button" className={GHOST_BUTTON} onClick={() => toggle("edit")}>
            Redigera
          </button>
        </span>
      </div>

      {panel === "edit" && (
        <div className="mt-3">
          <HouseForm house={house} onDone={() => setPanel("none")} />
        </div>
      )}
      {panel === "invites" && <InvitationManager houseId={house.id} invitations={invitations} />}
    </li>
  );
}

function JoinHouseForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [joined, setJoined] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PasteInvitationValues>({
    resolver: zodResolver(pasteInvitationSchema),
    defaultValues: { token: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setJoined(null);
    const result = await redeemInvitation({ token: values.token });
    if (result.fieldErrors?.token) {
      setError("token", { message: result.fieldErrors.token });
      return;
    }
    if (result.error) {
      setError("root", { message: result.error });
      return;
    }
    if (result.targetKind === "account") {
      setJoined("Origo");
    } else if (result.targetKind === "project") {
      setJoined(`projektet ${result.target?.name ?? ""}`.trim());
    } else {
      setJoined(result.target?.name ?? "huset");
    }
    reset();
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
      <Field label="Inbjudnings-token" error={errors.token} {...register("token")} />

      {errors.root && <p className={ERROR_TEXT}>{errors.root.message}</p>}
      {joined && <p className={OK_TEXT}>Du har nu tillgång till {joined}.</p>}

      <div className="flex gap-3">
        <button type="submit" className={BUTTON} disabled={isSubmitting}>
          {isSubmitting ? "Löser in …" : "Lägg till"}
        </button>
        <button type="button" className={GHOST_BUTTON} onClick={onDone}>
          Avbryt
        </button>
      </div>
    </form>
  );
}

export function HouseSection({
  houses,
  invitations,
}: {
  houses: Facility[];
  invitations: HouseInvitation[];
}) {
  return (
    <Section title="Hus">
      <div className="flex flex-col gap-2">
        <span className={LABEL}>Dina hus</span>
        {houses.length === 0 ? (
          <p className="text-sm text-[#58636A]">Du är inte med i något hus än.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-[#1B252B]/15 border-y border-[#1B252B]/15">
            {houses.map((house) => (
              <HouseRow
                key={house.id}
                house={house}
                invitations={invitations.filter((invitation) => String(invitation.house) === house.id)}
              />
            ))}
          </ul>
        )}
      </div>

      <ToggleForm label="+ Skapa hus" render={(close) => <HouseForm onDone={close} />} />
      <ToggleForm
        label="+ Lägg till hus från inbjudan"
        render={(close) => <JoinHouseForm onDone={close} />}
      />
    </Section>
  );
}

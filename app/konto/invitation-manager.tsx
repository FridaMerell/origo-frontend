"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/app/components/form/zodResolver";
import { createHouseInvitation, revokeHouseInvitation } from "@/app/actions/account/invitations";
import { houseInvitationSchema, type HouseInvitationValues } from "@/app/lib/schemas";
import type { HouseInvitation } from "@/app/lib/dal";
import { BUTTON, ERROR_TEXT, Field, formatExpiryDate, GHOST_BUTTON, InvitationLinkNotice, LABEL, MONO, ToggleForm } from "./ui";

function InvitationRow({ invitation }: { invitation: HouseInvitation }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const expires = formatExpiryDate(invitation.expires_at);

  const revoke = () => {
    setError(null);
    startTransition(async () => {
      const result = await revokeHouseInvitation(String(invitation.id));
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
      <span className="flex min-w-0 flex-col">
        <span className="text-sm text-[#1B252B]">{invitation.label || "Namnlös inbjudan"}</span>
        <span className={`${MONO} text-[10px] uppercase tracking-[0.1em] text-[#58636A]`}>
          {invitation.uses} inlösen · {expires ? `utgår ${expires}` : "ingen utgång"}
        </span>
        {error && <span className={ERROR_TEXT}>{error}</span>}
      </span>
      <button type="button" className={GHOST_BUTTON} disabled={pending} onClick={revoke}>
        {pending ? "Återkallar …" : "Återkalla"}
      </button>
    </li>
  );
}

function CreateInvitationForm({
  houseId,
  onCreated,
  onDone,
}: {
  houseId: string;
  onCreated: (token: string) => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<HouseInvitationValues>({
    resolver: zodResolver(houseInvitationSchema),
    defaultValues: { label: "", no_expiry: false },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await createHouseInvitation(houseId, values);
    if (result?.fieldErrors?.label) {
      setError("label", { message: result.fieldErrors.label });
      return;
    }
    if (result?.error || !result?.token) {
      setError("root", { message: result?.error ?? "Något gick fel." });
      return;
    }
    reset();
    onCreated(result.token);
    router.refresh();
    onDone();
  });

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
      <Field label="Etikett (valfritt)" placeholder="t.ex. Sommargäster" error={errors.label} {...register("label")} />
      <label className="flex items-center gap-2 text-sm text-[#1B252B]">
        <input type="checkbox" {...register("no_expiry")} />
        Ingen utgång (annars 7 dagar)
      </label>

      {errors.root && <p className={ERROR_TEXT}>{errors.root.message}</p>}

      <div className="flex gap-3">
        <button type="submit" className={BUTTON} disabled={isSubmitting}>
          {isSubmitting ? "Skapar …" : "Skapa inbjudan"}
        </button>
        <button type="button" className={GHOST_BUTTON} onClick={onDone}>
          Avbryt
        </button>
      </div>
    </form>
  );
}

export function InvitationManager({
  houseId,
  invitations,
}: {
  houseId: string;
  invitations: HouseInvitation[];
}) {
  const active = invitations.filter((invitation) => invitation.is_active);
  const [newToken, setNewToken] = useState<string | null>(null);

  return (
    <div className="mt-3 flex flex-col gap-3">
      <span className={LABEL}>Inbjudningar</span>
      {active.length === 0 ? (
        <p className="text-sm text-[#58636A]">Inga aktiva inbjudningar.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-[#1B252B]/15 border-y border-[#1B252B]/15">
          {active.map((invitation) => (
            <InvitationRow key={invitation.id} invitation={invitation} />
          ))}
        </ul>
      )}

      {newToken && (
        <InvitationLinkNotice token={newToken} onDismiss={() => setNewToken(null)} />
      )}

      <ToggleForm
        label="+ Skapa inbjudan"
        render={(close) => (
          <CreateInvitationForm houseId={houseId} onCreated={setNewToken} onDone={close} />
        )}
      />
    </div>
  );
}

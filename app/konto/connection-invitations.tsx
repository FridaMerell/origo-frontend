"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createAccountInvitation,
  createProjectInvitation,
  revokeInvitation,
} from "@/app/actions/account";
import {
  accountInvitationSchema,
  type AccountInvitationValues,
  projectInvitationSchema,
  type ProjectInvitationValues,
} from "@/app/lib/schemas";
import type { FluxProject, Invitation } from "@/app/lib/dal";
import {
  BUTTON,
  ERROR_TEXT,
  Field,
  GHOST_BUTTON,
  INPUT,
  LABEL,
  MONO,
  Section,
  ToggleForm,
} from "./ui";

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("sv-SE");
}

function InvitationLinkNotice({ token, onDismiss }: { token: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  const link =
    typeof window === "undefined"
      ? `/join?token=${token}`
      : `${window.location.origin}/join?token=${token}`;

  return (
    <div className="flex flex-col gap-2 border border-[#1B252B] bg-[#1B252B] p-4 text-[#F4F2EC]">
      <span className={`${MONO} text-[10px] uppercase tracking-[0.14em] text-[#C9D0CE]`}>
        Kopiera nu — länken visas bara denna gång
      </span>
      <code className="break-all text-sm">{link}</code>
      <div className="mt-1 flex gap-3">
        <button
          type="button"
          className={`${MONO} rounded-sm border border-[#F4F2EC]/40 px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] hover:border-[#F4F2EC]`}
          onClick={() => {
            void navigator.clipboard?.writeText(link).then(() => setCopied(true));
          }}
        >
          {copied ? "Kopierad" : "Kopiera länk"}
        </button>
        <button
          type="button"
          className={`${MONO} px-2 py-1.5 text-[11px] uppercase tracking-[0.12em] underline underline-offset-4`}
          onClick={onDismiss}
        >
          Klar
        </button>
      </div>
    </div>
  );
}

function InvitationRow({
  invitation,
  projectName,
}: {
  invitation: Invitation;
  projectName?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const expires = formatDate(invitation.expires_at);

  const target =
    invitation.target_kind === "project"
      ? `Projekt · ${projectName ?? `#${invitation.project}`}`
      : "Endast konto";

  const revoke = () => {
    setError(null);
    startTransition(async () => {
      const result = await revokeInvitation(String(invitation.id));
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
          {target} · {invitation.uses} inlösen · {expires ? `utgår ${expires}` : "ingen utgång"}
        </span>
        {error && <span className={ERROR_TEXT}>{error}</span>}
      </span>
      <button type="button" className={GHOST_BUTTON} disabled={pending} onClick={revoke}>
        {pending ? "Återkallar …" : "Återkalla"}
      </button>
    </li>
  );
}

function ProjectInvitationForm({
  projects,
  onCreated,
  onDone,
}: {
  projects: FluxProject[];
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
  } = useForm<ProjectInvitationValues>({
    resolver: zodResolver(projectInvitationSchema),
    defaultValues: { label: "", no_expiry: false, project: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await createProjectInvitation(values);
    if (result?.fieldErrors?.project) {
      setError("project", { message: result.fieldErrors.project });
      return;
    }
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
      <label className="flex flex-col gap-1.5">
        <span className={LABEL}>Projekt</span>
        <select className={INPUT} {...register("project")}>
          <option value="">Välj projekt …</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        {errors.project && <span className={ERROR_TEXT}>{errors.project.message}</span>}
      </label>
      <Field label="Etikett (valfritt)" placeholder="t.ex. Konsulter" error={errors.label} {...register("label")} />
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

function AccountInvitationForm({
  onCreated,
  onDone,
}: {
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
  } = useForm<AccountInvitationValues>({
    resolver: zodResolver(accountInvitationSchema),
    defaultValues: { label: "", no_expiry: false },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await createAccountInvitation(values);
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
      <p className="text-sm text-[#58636A]">
        Ger bara ett Origo-konto — ingen koppling till hus eller projekt.
      </p>
      <Field label="Etikett (valfritt)" placeholder="t.ex. Väntelista" error={errors.label} {...register("label")} />
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

export function ConnectionInvitations({
  invitations,
  projects,
}: {
  invitations: Invitation[];
  projects: FluxProject[];
}) {
  const [newToken, setNewToken] = useState<string | null>(null);
  const projectName = (id: number | null) =>
    projects.find((project) => project.id === id)?.name;

  const listed = invitations.filter(
    (invitation) => invitation.is_active && invitation.target_kind !== "house",
  );

  return (
    <Section title="Inbjudningar">
      <div className="flex flex-col gap-3">
        <span className={LABEL}>Projekt- och kontoinbjudningar</span>
        {listed.length === 0 ? (
          <p className="text-sm text-[#58636A]">Inga aktiva inbjudningar.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-[#1B252B]/15 border-y border-[#1B252B]/15">
            {listed.map((invitation) => (
              <InvitationRow
                key={invitation.id}
                invitation={invitation}
                projectName={projectName(invitation.project)}
              />
            ))}
          </ul>
        )}

        {newToken && (
          <InvitationLinkNotice token={newToken} onDismiss={() => setNewToken(null)} />
        )}
      </div>

      {projects.length > 0 && (
        <ToggleForm
          label="+ Bjud in till flux-projekt"
          render={(close) => (
            <ProjectInvitationForm
              projects={projects}
              onCreated={setNewToken}
              onDone={close}
            />
          )}
        />
      )}
      <ToggleForm
        label="+ Allmän inbjudan (endast konto)"
        render={(close) => (
          <AccountInvitationForm onCreated={setNewToken} onDone={close} />
        )}
      />
    </Section>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateProfile, changePassword } from "@/app/actions/account";
import {
  accountProfileSchema,
  type AccountProfileValues,
  passwordChangeSchema,
  type PasswordChangeValues,
} from "@/app/lib/schemas";
import type { User } from "@/app/lib/dal";
import { KontoShell } from "./konto-shell";
import { BUTTON, ERROR_TEXT, Field, INPUT, LABEL, MONO, OK_TEXT, Section } from "./ui";

function ProfileSection({ user }: { user: User }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AccountProfileValues>({
    resolver: zodResolver(accountProfileSchema),
    defaultValues: {
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      email: user.email ?? "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSaved(false);
    const result = await updateProfile(values);
    if (result?.fieldErrors) {
      for (const [key, message] of Object.entries(result.fieldErrors)) {
        if (message) setError(key as keyof AccountProfileValues, { message });
      }
      return;
    }
    if (result?.error) {
      setError("root", { message: result.error });
      return;
    }
    setSaved(true);
    router.refresh();
  });

  return (
    <Section title="Profil">
      <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Användarnamn</span>
          <input className={INPUT} value={user.username} disabled readOnly />
        </label>
        <Field label="Förnamn" error={errors.first_name} {...register("first_name")} />
        <Field label="Efternamn" error={errors.last_name} {...register("last_name")} />
        <Field label="E-post" type="email" error={errors.email} {...register("email")} />

        {errors.root && <p className={ERROR_TEXT}>{errors.root.message}</p>}
        {saved && <p className={OK_TEXT}>Sparat.</p>}

        <div>
          <button type="submit" className={BUTTON} disabled={isSubmitting}>
            {isSubmitting ? "Sparar …" : "Spara"}
          </button>
        </div>
      </form>
    </Section>
  );
}

function PasswordSection() {
  const [changed, setChanged] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PasswordChangeValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { current_password: "", new_password: "", confirm_password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setChanged(false);
    const result = await changePassword(values);
    if (result?.fieldErrors) {
      for (const [key, message] of Object.entries(result.fieldErrors)) {
        if (message) setError(key as keyof PasswordChangeValues, { message });
      }
      return;
    }
    if (result?.error) {
      setError("root", { message: result.error });
      return;
    }
    setChanged(true);
    reset();
  });

  return (
    <Section title="Lösenord">
      <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
        <Field
          label="Nuvarande lösenord"
          type="password"
          autoComplete="current-password"
          error={errors.current_password}
          {...register("current_password")}
        />
        <Field
          label="Nytt lösenord"
          type="password"
          autoComplete="new-password"
          error={errors.new_password}
          {...register("new_password")}
        />
        <Field
          label="Bekräfta nytt lösenord"
          type="password"
          autoComplete="new-password"
          error={errors.confirm_password}
          {...register("confirm_password")}
        />

        {errors.root && <p className={ERROR_TEXT}>{errors.root.message}</p>}
        {changed && <p className={OK_TEXT}>Lösenordet har bytts.</p>}

        <div>
          <button type="submit" className={BUTTON} disabled={isSubmitting}>
            {isSubmitting ? "Byter …" : "Byt lösenord"}
          </button>
        </div>
      </form>
    </Section>
  );
}

export function AccountView({ user }: { user: User }) {
  return (
    <KontoShell
      crumb="Origo / Konto"
      backHref="/"
      backLabel="Origo"
      kicker="Ditt konto"
      title="Konto"
      username={user.username}
    >
      <ProfileSection user={user} />
      <PasswordSection />

      <Section title="Anslutningar">
        <p className="text-sm text-[#58636A]">Hus du är med i och personliga API-tokener.</p>
        <Link
          href="/konto/anslutningar"
          className={`${MONO} w-fit text-[11px] uppercase tracking-[0.12em] underline underline-offset-4`}
        >
          Öppna anslutningar →
        </Link>
      </Section>
    </KontoShell>
  );
}

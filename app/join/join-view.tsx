"use client";

import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { redeemInvitation } from "@/app/actions/account";
import { redeemSignupSchema, type RedeemSignupValues } from "@/app/lib/schemas";
import { appHref } from "@/app/lib/tenant-links";
import { BUTTON, ERROR_TEXT, Field, MONO } from "@/app/konto/ui";

const KICKER = `${MONO} text-[11px] uppercase tracking-[0.18em] text-[#58636A]`;

function Frame({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#E7E5DE] px-5 py-6 text-[#1B252B] sm:px-10 sm:py-10">
      <span aria-hidden className="absolute left-1/2 top-0 h-full w-px bg-[#1B252B]/15" />
      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-md flex-col justify-center gap-4">
        {children}
      </div>
    </main>
  );
}

function GoToVerso() {
  return (
    <button
      type="button"
      className={`${BUTTON} mt-4 w-fit`}
      onClick={() => {
        window.location.href = appHref("verso");
      }}
    >
      Gå till Verso →
    </button>
  );
}

function LoggedInJoin({
  token,
  username,
  onDone,
}: {
  token: string;
  username: string;
  onDone: (houseName: string) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    setPending(true);
    setError(null);
    const result = await redeemInvitation({ token });
    setPending(false);
    if (result.fieldErrors?.token || result.error) {
      setError(
        result.fieldErrors?.token ?? result.error ?? "Inbjudan är inte längre giltig.",
      );
      return;
    }
    onDone(result.house?.name ?? "huset");
  };

  return (
    <>
      <p className={KICKER}>Inbjudan</p>
      <h1 className="text-4xl font-medium tracking-[-0.05em]">Gå med i huset</h1>
      <p className="text-sm text-[#58636A]">Inloggad som {username}.</p>
      {error && <p className={ERROR_TEXT}>{error}</p>}
      <button
        type="button"
        className={`${BUTTON} mt-2 w-fit`}
        disabled={pending}
        onClick={join}
      >
        {pending ? "Går med …" : "Gå med"}
      </button>
    </>
  );
}

function SignupJoin({
  token,
  onDone,
}: {
  token: string;
  onDone: (houseName: string) => void;
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RedeemSignupValues>({
    resolver: zodResolver(redeemSignupSchema),
    defaultValues: { token, username: "", password: "", email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await redeemInvitation(values);
    if (result.fieldErrors) {
      if (result.fieldErrors.token) setError("token", { message: result.fieldErrors.token });
      if (result.fieldErrors.username)
        setError("username", { message: result.fieldErrors.username });
      if (result.fieldErrors.password)
        setError("password", { message: result.fieldErrors.password });
      return;
    }
    if (result.error) {
      setError("root", { message: result.error });
      return;
    }
    onDone(result.house?.name ?? "huset");
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <p className={KICKER}>Inbjudan</p>
      <h1 className="text-4xl font-medium tracking-[-0.05em]">Skapa konto och gå med</h1>
      <input type="hidden" {...register("token")} />
      {errors.token && <p className={ERROR_TEXT}>{errors.token.message}</p>}
      <Field label="Användarnamn" autoComplete="username" error={errors.username} {...register("username")} />
      <Field
        label="Lösenord"
        type="password"
        autoComplete="new-password"
        error={errors.password}
        {...register("password")}
      />
      <Field
        label="E-post (valfritt)"
        type="email"
        autoComplete="email"
        error={errors.email}
        {...register("email")}
      />
      {errors.root && <p className={ERROR_TEXT}>{errors.root.message}</p>}
      <button type="submit" className={`${BUTTON} w-fit`} disabled={isSubmitting}>
        {isSubmitting ? "Skapar konto …" : "Skapa konto och gå med"}
      </button>
    </form>
  );
}

export function JoinView({ token, username }: { token: string; username: string | null }) {
  const [done, setDone] = useState<string | null>(null);

  if (!token) {
    return (
      <Frame>
        <p className={KICKER}>Inbjudan</p>
        <h1 className="text-4xl font-medium tracking-[-0.05em]">Ogiltig länk</h1>
        <p className="text-sm text-[#58636A]">Länken saknar en giltig inbjudan.</p>
      </Frame>
    );
  }

  if (done) {
    return (
      <Frame>
        <p className={KICKER}>Klart</p>
        <h1 className="text-4xl font-medium tracking-[-0.05em]">Du är med i {done}</h1>
        <GoToVerso />
      </Frame>
    );
  }

  return (
    <Frame>
      {username ? (
        <LoggedInJoin token={token} username={username} onDone={setDone} />
      ) : (
        <SignupJoin token={token} onDone={setDone} />
      )}
    </Frame>
  );
}

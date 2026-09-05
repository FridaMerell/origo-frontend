"use client";

import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/app/components/form/zodResolver";
import { redeemInvitation } from "@/app/actions/account/invitations";
import { redeemSignupSchema, type RedeemSignupValues } from "@/app/lib/schemas";
import { appHref, type AppLinkId } from "@/app/lib/tenant-links";
import { PageCrumb } from "@/app/components/page-crumb";
import { BUTTON, ERROR_TEXT, Field, MONO } from "@/app/konto/ui";

const KICKER = `${MONO} text-[11px] uppercase tracking-[0.18em] text-[#58636A]`;

function Frame({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#E7E5DE] px-5 py-6 text-[#1B252B] sm:px-10 sm:py-10">
      <span aria-hidden className="absolute left-1/2 top-0 h-full w-px bg-[#1B252B]/15" />
      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-md flex-col">
        <PageCrumb crumb="Origo / Inbjudan" backHref="/" backLabel="Origo" />
        <div className="flex flex-1 flex-col justify-center gap-4">{children}</div>
      </div>
    </main>
  );
}

type JoinOutcome = { kind: "house" | "project" | "account"; name: string | null };

const OUTCOME_APP: Record<JoinOutcome["kind"], { app: AppLinkId; label: string }> = {
  house: { app: "verso", label: "Gå till Verso →" },
  project: { app: "flux", label: "Gå till Flux →" },
  account: { app: "origo", label: "Gå till Origo →" },
};

function GoToApp({ kind }: { kind: JoinOutcome["kind"] }) {
  const { app, label } = OUTCOME_APP[kind];
  return (
    <button
      type="button"
      className={`${BUTTON} mt-4 w-fit`}
      onClick={() => {
        window.location.href = appHref(app);
      }}
    >
      {label}
    </button>
  );
}

function outcomeOf(result: {
  targetKind?: "house" | "project" | "account";
  target?: { id: number; name: string } | null;
}): JoinOutcome {
  return { kind: result.targetKind ?? "house", name: result.target?.name ?? null };
}

function LoggedInJoin({
  token,
  username,
  onDone,
}: {
  token: string;
  username: string;
  onDone: (outcome: JoinOutcome) => void;
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
    onDone(outcomeOf(result));
  };

  return (
    <>
      <p className={KICKER}>Inbjudan</p>
      <h1 className="text-4xl font-medium tracking-[-0.05em]">Lös in inbjudan</h1>
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
  onDone: (outcome: JoinOutcome) => void;
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
    onDone(outcomeOf(result));
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

function doneHeading({ kind, name }: JoinOutcome) {
  if (kind === "account") return "Kontot är klart";
  if (kind === "project") return `Du har nu tillgång till ${name ?? "projektet"}`;
  return `Du har nu tillgång till ${name ?? "huset"}`;
}

export function JoinView({ token, username }: { token: string; username: string | null }) {
  const [done, setDone] = useState<JoinOutcome | null>(null);

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
        <h1 className="text-4xl font-medium tracking-[-0.05em]">{doneHeading(done)}</h1>
        <GoToApp kind={done.kind} />
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

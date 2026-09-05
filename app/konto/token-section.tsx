"use client";

import { useState, useTransition } from "react";
import { getSelfToken, revokeSelfToken, rotateSelfToken } from "@/app/actions/account/tokens";
import { BUTTON, ERROR_TEXT, GHOST_BUTTON, MONO, OK_TEXT, Section } from "./ui";

function TokenReveal({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-2 border border-[#1B252B] bg-[#1B252B] p-4 text-[#F4F2EC]">
      <span className={`${MONO} text-[10px] uppercase tracking-[0.14em] text-[#C9D0CE]`}>
        Authorization: Token …
      </span>
      <code className="break-all text-sm">{token}</code>
      <button
        type="button"
        className={`${MONO} w-fit rounded-sm border border-[#F4F2EC]/40 px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] hover:border-[#F4F2EC]`}
        onClick={() => {
          void navigator.clipboard?.writeText(token).then(() => setCopied(true));
        }}
      >
        {copied ? "Kopierad" : "Kopiera"}
      </button>
    </div>
  );
}

export function TokenSection() {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run<T extends { error?: string }>(
    action: () => Promise<T>,
    onOk: (result: T) => void,
  ) {
    setError(null);
    setStatus(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      onOk(result);
    });
  }

  return (
    <Section title="API-token">
      <p className="text-sm text-[#58636A]">
        En personlig token för att nå Origo-API:t utifrån. Skicka den som{" "}
        <code className="text-[#1B252B]">Authorization: Token &lt;token&gt;</code>.
      </p>

      {token && <TokenReveal token={token} />}
      {error && <p className={ERROR_TEXT}>{error}</p>}
      {status && <p className={OK_TEXT}>{status}</p>}

      <div className="flex flex-wrap gap-3">
        {token ? (
          <>
            <button
              type="button"
              className={GHOST_BUTTON}
              disabled={pending}
              onClick={() =>
                run(rotateSelfToken, (result) => {
                  setToken(result.token ?? null);
                  setStatus("Token roterad — den gamla slutade fungera.");
                })
              }
            >
              {pending ? "Roterar …" : "Rotera"}
            </button>
            <button
              type="button"
              className={GHOST_BUTTON}
              disabled={pending}
              onClick={() =>
                run(revokeSelfToken, () => {
                  setToken(null);
                  setStatus("Token återkallad.");
                })
              }
            >
              {pending ? "Återkallar …" : "Återkalla"}
            </button>
          </>
        ) : (
          <button
            type="button"
            className={BUTTON}
            disabled={pending}
            onClick={() => run(getSelfToken, (result) => setToken(result.token ?? null))}
          >
            {pending ? "Hämtar …" : "Visa token"}
          </button>
        )}
      </div>
    </Section>
  );
}

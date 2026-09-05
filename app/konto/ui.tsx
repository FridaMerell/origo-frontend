"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import type { FieldError } from "react-hook-form";

// The account pages live on the theme-less root, so they can't use the
// design-token utilities (bg-surface, text-text, …). These mirror
// root-home.tsx's palette.
export const MONO = "font-[family-name:var(--font-geist-mono)]";
export const LABEL = `${MONO} text-[10px] uppercase tracking-[0.12em] text-[#58636A]`;
export const INPUT =
  "rounded-sm border border-[#1B252B]/30 bg-transparent px-3 py-2 text-[#1B252B] outline-none transition-colors focus:border-[#1B252B] disabled:opacity-50";
export const BUTTON = `${MONO} rounded-sm bg-[#1B252B] px-4 py-2 text-xs uppercase tracking-[0.12em] text-[#F4F2EC] transition-colors hover:bg-[#58636A] disabled:opacity-50`;
export const GHOST_BUTTON = `${MONO} rounded-sm border border-[#1B252B]/30 px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-[#1B252B] transition-colors hover:border-[#1B252B] disabled:opacity-50`;
export const HEADING = `${MONO} text-[11px] uppercase tracking-[0.16em] text-[#58636A]`;
export const ERROR_TEXT = "text-xs text-[#B14B3C]";
export const OK_TEXT = "text-xs text-[#4C8B3B]";

export function Field({
  label,
  error,
  ...props
}: { label: string; error?: FieldError } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={LABEL}>{label}</span>
      <input className={INPUT} {...props} />
      {error && <span className={ERROR_TEXT}>{error.message}</span>}
    </label>
  );
}

export function formatExpiryDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("sv-SE");
}

/** Shown once right after an invitation link is created — it can't be retrieved again afterward. */
export function InvitationLinkNotice({ token, onDismiss }: { token: string; onDismiss: () => void }) {
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

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-l border-[#1B252B] bg-[#E7E5DE]/90 pl-5">
      <h2 className={HEADING}>{title}</h2>
      <div className="mt-4 flex flex-col gap-8">{children}</div>
    </section>
  );
}

/** A labelled toggle button that reveals a form. `render` receives a `close`
 *  callback so the form can collapse itself (on cancel, or after success). */
export function ToggleForm({
  label,
  render,
}: {
  label: string;
  render: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={`${GHOST_BUTTON} w-fit`}
      >
        {open ? "✕ Stäng" : label}
      </button>
      {open && render(() => setOpen(false))}
    </div>
  );
}

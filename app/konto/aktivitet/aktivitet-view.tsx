"use client";

import type { ActivityItem, User } from "@/app/lib/dal";
import { KontoShell } from "../konto-shell";
import { LABEL, MONO, Section } from "../ui";

function formatWhen(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" });
}

export function AktivitetView({
  user,
  activity,
}: {
  user: User;
  activity: ActivityItem[];
}) {
  return (
    <KontoShell
      crumb="Konto / Aktivitet"
      backHref="/konto"
      backLabel="Konto"
      kicker="Konto"
      title="Aktivitet"
      username={user.username}
    >
      <Section title="Senaste actions">
        {activity.length === 0 ? (
          <p className="text-sm text-[#58636A]">Ingen aktivitet att visa än.</p>
        ) : (
          <ol className="flex flex-col">
            {activity.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-1 border-b border-[#1B252B]/20 py-3 sm:flex-row sm:items-baseline sm:gap-6"
              >
                <time className={`${MONO} w-40 shrink-0 text-[11px] text-[#58636A]`}>
                  {formatWhen(item.createdAt)}
                </time>
                <span className="min-w-0 flex-1">
                  {item.action && (
                    <span className={`${LABEL} mr-3`}>{item.action}</span>
                  )}
                  <span className="text-sm">
                    {item.description || item.target || "—"}
                  </span>
                  {item.description && item.target && (
                    <span className="ml-2 text-sm text-[#58636A]">
                      {item.target}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </KontoShell>
  );
}

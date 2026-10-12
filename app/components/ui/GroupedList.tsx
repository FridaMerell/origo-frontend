import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "./Card";
import { EmptyState } from "./EmptyState";

export type GroupedListGroup<T> = {
  label: string;
  items: T[];
};

export function groupItems<T>(items: T[], labelFor: (item: T) => string): GroupedListGroup<T>[] {
  const groups: GroupedListGroup<T>[] = [];
  for (const item of items) {
    const label = labelFor(item);
    const group = groups.find((g) => g.label === label);
    if (group) group.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}

export function GroupedList<T>({
  groups,
  emptyMessage,
  getKey,
  getHref,
  renderRow,
}: {
  groups: GroupedListGroup<T>[];
  emptyMessage: string;
  getKey: (item: T) => string;
  getHref: (item: T) => string;
  renderRow: (item: T) => ReactNode;
}) {
  if (groups.length === 0) {
    return <EmptyState>{emptyMessage}</EmptyState>;
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.label} className="flex min-w-0 flex-col gap-2">
          <h2 className="m-0 px-1 font-display text-lg font-semibold leading-tight text-text">
            {group.label}
          </h2>
          <Card className="flex flex-col gap-0 overflow-hidden p-0">
            {group.items.map((item) => (
              <Link
                key={getKey(item)}
                href={getHref(item)}
                className="flex min-h-14 items-center justify-between gap-3 border-b border-border px-4 py-3 no-underline duration-150 last:border-b-0 hover:bg-surface-2 active:bg-surface-2 focus-visible:bg-surface-2 sm:py-2.5"
              >
                {renderRow(item)}
              </Link>
            ))}
          </Card>
        </section>
      ))}
    </div>
  );
}

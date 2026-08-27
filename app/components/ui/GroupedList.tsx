import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "./Card";

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
    return <Card className="text-sm text-text-muted">{emptyMessage}</Card>;
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1.5">
          <span className="px-1 text-xs font-semibold uppercase tracking-wide text-text-faint">
            {group.label}
          </span>
          <Card className="flex flex-col gap-0 p-0">
            {group.items.map((item) => (
              <Link
                key={getKey(item)}
                href={getHref(item)}
                className="flex items-center justify-between gap-4 border-b border-border px-4 py-2.5 last:border-b-0 hover:bg-surface-2"
              >
                {renderRow(item)}
              </Link>
            ))}
          </Card>
        </div>
      ))}
    </div>
  );
}

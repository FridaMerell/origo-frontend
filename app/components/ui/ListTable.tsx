"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Icon } from "./Icon";

export type ListTableColumn<T> = {
  key: string;
  header?: ReactNode;
  render: (item: T) => ReactNode;
  width?: string;
  align?: "left" | "right" | "center";
};

export type ListTableRow<T> = {
  id: string | number;
  item: T;
  children?: ListTableRow<T>[];
};

type ListTableProps<T> = {
  columns: ListTableColumn<T>[];
  rows: ListTableRow<T>[];
  showHeader?: boolean;
  caption?: ReactNode;
  onRowClick?: (item: T) => void;
};

const alignClass = (align: ListTableColumn<unknown>["align"]) =>
  align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

export function ListTable<T>({ columns, rows, showHeader = true, caption, onRowClick }: ListTableProps<T>) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string | number>>(new Set());

  const gridTemplateColumns = columns.map((c) => c.width ?? "1fr").join(" ");

  function toggle(id: string | number) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderRows(list: ListTableRow<T>[], depth: number): ReactNode {
    return list.map((row) => {
      const hasChildren = Boolean(row.children?.length);
      const collapsed = collapsedIds.has(row.id);
      return (
        <div key={row.id}>
          <div
            className={`grid items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0 hover:bg-surface-2 ${onRowClick ? "cursor-pointer" : ""}`}
            style={{ gridTemplateColumns }}
            onClick={onRowClick ? () => onRowClick(row.item) : undefined}
          >
            {columns.map((col, i) => (
              <div
                key={col.key}
                className={`flex min-w-0 items-center font-body text-sm text-text ${alignClass(col.align)}`}
                style={i === 0 ? { paddingLeft: depth * 20 } : undefined}
              >
                {i === 0 && hasChildren && (
                  <button
                    type="button"
                    onClick={() => toggle(row.id)}
                    aria-label={collapsed ? "Expandera" : "Fäll ihop"}
                    className="mr-1 flex size-4 shrink-0 items-center justify-center text-text-faint hover:text-text"
                  >
                    <Icon name={collapsed ? "chevron-right" : "chevron-down"} size={12} />
                  </button>
                )}
                {i === 0 && !hasChildren && depth > 0 && <span className="mr-1 inline-block size-4 shrink-0" />}
                <span className="min-w-0 truncate">{col.render(row.item)}</span>
              </div>
            ))}
          </div>
          {hasChildren && !collapsed && renderRows(row.children!, depth + 1)}
        </div>
      );
    });
  }

  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface shadow-sm">
      {caption && (
        <div className="border-b border-border px-4 py-2.5 font-body text-xs font-semibold uppercase tracking-wide text-text-muted">
          {caption}
        </div>
      )}
      {showHeader && (
        <div
          className="grid gap-3 border-b border-border bg-surface-2 px-4 py-2 font-body text-xs font-semibold uppercase tracking-wide text-text-muted"
          style={{ gridTemplateColumns }}
        >
          {columns.map((col) => (
            <div key={col.key} className={alignClass(col.align)}>
              {col.header}
            </div>
          ))}
        </div>
      )}
      <div>{renderRows(rows, 0)}</div>
    </div>
  );
}

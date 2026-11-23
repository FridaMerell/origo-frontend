import type { ReactNode } from "react";

/** Quiet placeholder for lists and sections with nothing in them yet. */
export function EmptyState({
  icon,
  title,
  children,
  action,
  className = "",
}: {
  icon?: ReactNode;
  /** A short heading above the text, e.g. "Backloggen är tom". */
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-card border border-dashed border-border-strong px-4 py-10 text-center text-text-muted ${className}`}
    >
      {icon && <span className="text-text-faint">{icon}</span>}
      {title && <p className="m-0 font-display text-lg font-semibold text-text">{title}</p>}
      {children && <p className="m-0 max-w-sm text-sm leading-6">{children}</p>}
      {action}
    </div>
  );
}

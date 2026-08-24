import type { ReactNode } from "react";

export default function FluxLayout({ children }: { children: ReactNode }) {
  return (
    <div data-theme="flux" className="flex min-h-full flex-1 flex-col bg-bg text-text font-body">
      {children}
    </div>
  );
}

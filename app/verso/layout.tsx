import type { ReactNode } from "react";

export default function VersoLayout({ children }: { children: ReactNode }) {
  return (
    <div data-theme="verso" className="flex min-h-full flex-1 flex-col bg-bg text-text font-body">
      {children}
    </div>
  );
}

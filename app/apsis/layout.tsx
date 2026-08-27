import type { ReactNode } from "react";
import { ApsisProviders } from "@/app/lib/apsis-providers";
import ApsisShell from "./apsis-shell";

export const metadata = {
  title: "Apsis | Origo",
  description: "En bildsamling av kyrkoabsider.",
};

export default function ApsisLayout({ children }: { children: ReactNode }) {
  return (
    <ApsisProviders>
      <ApsisShell>{children}</ApsisShell>
    </ApsisProviders>
  );
}

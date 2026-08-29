import type { ReactNode } from "react";
import TempusShell from "./tempus-shell";
import { TempusProviders } from "../lib/tempus-providers"

export const metadata = {
  title: "Tempus | Origo",
  description: "Säsongsöversikt och ruttplanering för naturintresserade.",
};

export default async function TempusLayout({ children }: { children: ReactNode }) {
  return (
    <TempusProviders>
      <TempusShell>{children}</TempusShell>
    </TempusProviders>
  );
}

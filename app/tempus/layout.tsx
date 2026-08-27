import type { ReactNode } from "react";
import TempusShell from "./tempus-shell";

export const metadata = {
  title: "Tempus | Origo",
  description: "Säsongsöversikt och ruttplanering för naturintresserade.",
};

export default function TempusLayout({ children }: { children: ReactNode }) {
  return <TempusShell>{children}</TempusShell>;
}

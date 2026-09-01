import type { ReactNode } from "react";
import { Suspense } from "react";
import TempusShell from "./tempus-shell";
import { TempusProviders } from "../lib/tempus-providers";
import { NavProgressBar } from "@/app/lib/nav-progress";
import { Splash } from "@/app/components/ui/Splash";

export const metadata = {
  title: "Tempus | Origo",
  description: "Säsongsöversikt och ruttplanering för naturintresserade.",
};

export default function TempusLayout({ children }: { children: ReactNode }) {
  return (
    <div data-theme="tempus" className="flex flex-1 flex-col bg-bg font-body text-text">
      <NavProgressBar />
      <Suspense fallback={<Splash tenant="tempus" />}>
        <TempusProviders>
          <TempusShell>{children}</TempusShell>
        </TempusProviders>
      </Suspense>
    </div>
  );
}

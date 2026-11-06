import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { getCurrentUser } from "@/app/lib/dal/auth";
import { getUsers } from "@/app/lib/dal/flux";
import { UserProvider } from "@/app/lib/user-context";
import { NavProgressProvider } from "@/app/lib/nav-progress";
import { resolveTenant } from "@/app/lib/tenant";
import { ToastProvider } from "@/app/components/ui/ToastProvider";
import { ServiceWorkerRegistrar } from "@/app/components/ServiceWorkerRegistrar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Origo",
  description: "Origo application",
};

// iOS Safari zoomar in på fält med textstorlek under 16px när de får fokus,
// även när fokus återställs efter att skärmen tänts. maximumScale stoppar den
// automatiska zoomen; iOS låter fortfarande användaren nypzooma.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const requestHeaders = await headers();
  const hostname = requestHeaders.get("host")?.split(":")[0] ?? "";
  const tenant = resolveTenant(hostname) ?? "tempus";
  const [user, users] = await Promise.all([
    getCurrentUser(),
    tenant === "flux" ? Promise.resolve([]) : getUsers(),
  ]);
  
  return (
    <html
      lang="sv"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-theme="origo"
    >
      <body className="min-h-full flex flex-col">
        <NavProgressProvider>
          <ToastProvider theme={tenant}>
            <UserProvider user={user} users={users}>
              <ServiceWorkerRegistrar />
              {children}
            </UserProvider>
          </ToastProvider>
        </NavProgressProvider>
      </body>
    </html>
  );
}

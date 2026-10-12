import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  IBM_Plex_Mono,
  Karla,
  PT_Serif,
  Petrona,
  Source_Serif_4,
} from "next/font/google";
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

// The tenant themes' typefaces (app/styles/tokens/typography.css). Served from
// this site by next/font, so visitors' browsers never contact Google for them.
// Only the themes that use a face need it, so none are preloaded. (next/font
// wants every option written out as a literal, hence the repetition.)
const petrona = Petrona({
  variable: "--font-petrona",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
});
const karla = Karla({
  variable: "--font-karla",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
});
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  display: "swap",
  preload: false,
});
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],
  display: "swap",
  preload: false,
});
const ptSerif = PT_Serif({
  variable: "--font-pt-serif",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Origo",
  description: "Origo application",
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
      className={`${geistSans.variable} ${geistMono.variable} ${petrona.variable} ${karla.variable} ${plexMono.variable} ${sourceSerif.variable} ${ptSerif.variable} h-full antialiased`}
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

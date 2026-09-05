import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { getCurrentUser, getUsers } from "@/app/lib/dal";
import { UserProvider } from "@/app/lib/user-context";
import { NavProgressProvider } from "@/app/lib/nav-progress";
import { resolveTenant } from "@/app/lib/tenant";
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
  manifest: "/manifest.json",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const requestHeaders = await headers();
  const hostname = requestHeaders.get("host")?.split(":")[0] ?? "";
  const [user, users] = await Promise.all([
    getCurrentUser(),
    resolveTenant(hostname) === "flux" ? Promise.resolve([]) : getUsers(),
  ]);
  
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-theme="origo"
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Petrona:wght@400;500;600;700&family=Karla:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600;8..60,700&family=PT+Serif:ital,wght@0,400;0,700;1,400&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <NavProgressProvider>
          <UserProvider user={user} users={users}>{children}</UserProvider>
        </NavProgressProvider>
      </body>
    </html>
  );
}

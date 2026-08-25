import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getCurrentUser, getUsers } from "@/app/lib/dal";
import { UserProvider } from "@/app/lib/user-context";
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [user, users] = await Promise.all([getCurrentUser(), getUsers()]);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <UserProvider user={user} users={users}>{children}</UserProvider>
      </body>
    </html>
  );
}

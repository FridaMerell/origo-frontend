import type { Metadata } from "next";
import NotificationsView from "./notifications-view";

export const metadata: Metadata = {
  title: "Notifikationer | Apsis",
  description: "Dina notifikationer från Apsis.",
};

export default function NotifikationerPage() {
  return <NotificationsView />;
}

import type { Metadata } from "next";
import HomeView from "./home-view";

export const metadata: Metadata = {
  title: "Absider | Apsis",
  description: "En bildsamling av kyrkoabsider.",
};

export default function ApsisPage() {
  return <HomeView />;
}

import type { Metadata } from "next";
import Home from "./Home";

export const metadata: Metadata = {
  title: "Absider | Apsis",
  description: "En bildsamling av kyrkoabsider.",
};

export default function ApsisPage() {
  return <Home />;
}

import type { Metadata } from "next";
import SlumpaView from "./slumpa-view";

export const metadata: Metadata = {
  title: "Slumpa | Apsis",
  description: "Slumpa fram en kyrkoabsid ur samlingen.",
};

export default function SlumpaPage() {
  return <SlumpaView />;
}

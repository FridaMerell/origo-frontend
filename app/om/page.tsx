import type { Metadata } from "next";
import OmView from "./om-view";

export const metadata: Metadata = {
  title: "Om | Origo",
  description: "Vad Origo är och vad som finns bakom inloggningen.",
};

export default function AboutPage() {
  return <OmView />;
}

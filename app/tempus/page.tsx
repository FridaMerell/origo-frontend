import type { Metadata } from "next";
import Home from "./Home";

export const metadata: Metadata = {
  title: "Tempus | Origo",
  description: "Säsongsöversikt och ruttplanering.",
};

export default function TempusPage() {
  return <Home />;
}

import type { Metadata } from "next";
import RootHome from "./root-home";

export const metadata: Metadata = {
  title: "Origo | Fåvitsko",
  description: "Samlingsapplikation för en radda appar med helt skilda användningsområden",
};

export default function RootPage() {
  return <RootHome />;
}

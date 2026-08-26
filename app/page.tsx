import type { Metadata } from "next";
import RootHome from "./root-home";

export const metadata: Metadata = {
  title: "Origo",
  description: "Origo application",
};

export default function RootPage() {
  return <RootHome />;
}

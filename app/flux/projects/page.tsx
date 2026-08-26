import type { Metadata } from "next";
import FluxProjectsView from "./projects-view";

export const metadata: Metadata = {
  title: "Projekt | Flux",
  description: "Alla Flux-projekt",
};

export default function FluxProjectsPage() {
  return <FluxProjectsView />;
}

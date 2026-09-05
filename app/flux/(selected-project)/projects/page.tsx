import type { Metadata } from "next";
import FluxProjectsView from "@/app/flux/projects/projects-view";

export const metadata: Metadata = {
  title: "Projekt | Flux",
  description: "Alla Flux-projekt",
};

export default function FluxProjectsPage() {
  return <FluxProjectsView />;
}

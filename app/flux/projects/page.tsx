import type { Metadata } from "next";
import FluxProjectsView from "./projects-view";

export const metadata: Metadata = {
  title: "Projects | Flux",
  description: "All Flux projects",
};

export default function FluxProjectsPage() {
  return <FluxProjectsView />;
}

import type { Metadata } from "next";
import FluxTasksView from "./tasks-view";

export const metadata: Metadata = {
  title: "Uppgifter | Flux",
  description: "All Flux tasks",
};

export default function FluxTasksPage() {
  return <FluxTasksView />;
}

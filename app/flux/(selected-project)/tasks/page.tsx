import type { Metadata } from "next";
import FluxTasksView from "@/app/flux/tasks/tasks-view";

export const metadata: Metadata = {
  title: "Uppgifter | Flux",
  description: "Alla Flux-uppgifter",
};

export default function FluxTasksPage() {
  return <FluxTasksView />;
}

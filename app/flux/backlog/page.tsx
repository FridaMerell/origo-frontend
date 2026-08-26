import type { Metadata } from "next";
import FluxBacklogView from "./backlog-view";

export const metadata: Metadata = {
  title: "Backlog | Flux",
  description: "Unscheduled and overdue Flux tasks by priority",
};

export default function FluxBacklogPage() {
  return <FluxBacklogView />;
}

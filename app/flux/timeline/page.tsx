import type { Metadata } from "next";
import { TaskPanel } from "@/app/flux/tasks/task-panel";
import { AllProjectsTimelineData } from "./all-projects-timeline-data";
import FluxTimelineView from "./timeline-view";

export const metadata: Metadata = {
  title: "Tidslinje | Flux",
  description: "Uppgiftstidslinje för alla Flux-projekt",
};

export default function FluxTimelinePage() {
  return (
    <AllProjectsTimelineData>
      <FluxTimelineView />
      <TaskPanel />
    </AllProjectsTimelineData>
  );
}

import type { Metadata } from "next";
import FluxTimelineView from "./timeline-view";

export const metadata: Metadata = {
  title: "Timeline | Flux",
  description: "Task timeline across all Flux projects",
};

export default function FluxTimelinePage() {
  return <FluxTimelineView />;
}

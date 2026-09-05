import type { Metadata } from "next";
import FluxTimelineView from "@/app/flux/timeline/timeline-view";

export const metadata: Metadata = {
  title: "Tidslinje | Flux",
  description: "Uppgiftstidslinje för alla Flux-projekt",
};

export default function FluxTimelinePage() {
  return <FluxTimelineView />;
}

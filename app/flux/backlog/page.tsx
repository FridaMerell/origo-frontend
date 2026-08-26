import type { Metadata } from "next";
import FluxBacklogView from "./backlog-view";

export const metadata: Metadata = {
  title: "Backlog | Flux",
  description: "Oplanerade och försenade Flux-uppgifter efter prioritet",
};

export default function FluxBacklogPage() {
  return <FluxBacklogView />;
}

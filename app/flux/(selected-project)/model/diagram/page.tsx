import type { Metadata } from "next";
import { ModelDiagramView } from "@/app/flux/model/model-diagram-view";

export const metadata: Metadata = {
  title: "Datamodelldiagram | Flux",
  description: "ER-diagram över projektets datamodell",
};

export default function FluxModelDiagramPage() {
  return <ModelDiagramView />;
}

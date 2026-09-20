import type { Metadata } from "next";
import { ScaffoldView } from "@/app/flux/model/scaffold-view";

export const metadata: Metadata = {
  title: "Kod | Flux",
  description: "Generera modeller, interfaces och projektskelett från datamodellen",
};

export default function FluxModelScaffoldPage() {
  return <ScaffoldView />;
}

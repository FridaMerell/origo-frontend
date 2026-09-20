import type { Metadata } from "next";
import { ModelView } from "@/app/flux/model/model-view";

export const metadata: Metadata = {
  title: "Entiteter | Flux",
  description: "Entiteter, fält och relationer för projektets datamodell",
};

export default function FluxModelPage() {
  return <ModelView />;
}

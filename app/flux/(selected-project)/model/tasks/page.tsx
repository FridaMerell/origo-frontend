import type { Metadata } from "next";
import { TasksView } from "@/app/flux/model/tasks-view";

export const metadata: Metadata = {
  title: "Uppgifter från modell | Flux",
  description: "Generera standarduppgifter från datamodellen",
};

export default function FluxModelTasksPage() {
  return <TasksView />;
}

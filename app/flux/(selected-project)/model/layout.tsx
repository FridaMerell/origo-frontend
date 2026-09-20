import type { ReactNode } from "react";
import { getFluxEntities, getFluxFields, getFluxRelations } from "@/app/lib/dal";
import { ModelProvider } from "@/app/flux/model/model-context";
import { ModelNav } from "@/app/flux/model/model-nav";
import { getModelProjectId } from "@/app/flux/model/project";

export default async function FluxModelLayout({ children }: { children: ReactNode }) {
  const projectId = await getModelProjectId();

  if (projectId === null) {
    return <p className="text-sm text-text-muted">Inget projekt valt.</p>;
  }

  const id = String(projectId);
  const [entities, fields, relations] = await Promise.all([
    getFluxEntities({ project: id }),
    getFluxFields({ entity__project: id }),
    getFluxRelations({ source__project: id }),
  ]);

  return (
    <ModelProvider
      key={id}
      projectId={projectId}
      initialEntities={entities}
      initialFields={fields}
      initialRelations={relations}
    >
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold text-text">Datamodell</h1>
        <ModelNav />
        {children}
      </div>
    </ModelProvider>
  );
}

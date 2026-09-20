import type { Metadata } from "next";
import { getFluxResources, getFluxRolePermissions, getFluxRoles } from "@/app/lib/dal";
import { getModelProjectId } from "@/app/flux/model/project";
import { RolesView } from "@/app/flux/model/roles-view";

export const metadata: Metadata = {
  title: "Roller | Flux",
  description: "Roller och behörigheter per resurs",
};

export default async function FluxModelRolesPage() {
  const projectId = await getModelProjectId();
  const id = projectId === null ? null : String(projectId);
  const [roles, resources, permissions] = id
    ? await Promise.all([
        getFluxRoles({ project: id }),
        getFluxResources({ entity__project: id }),
        getFluxRolePermissions({ role__project: id }),
      ])
    : [[], [], []];
  return <RolesView initialRoles={roles} initialResources={resources} initialPermissions={permissions} />;
}

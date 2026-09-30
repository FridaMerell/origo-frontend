import type { ReactNode } from "react"
import { loadApiWorkbenchData } from "./api/api-data"
import { ModelDataProvider } from "./model-data-provider"
import { ModelNav, type ModelNavIndex } from "./model-nav"

export default async function ModelLayout({ children }: { children: ReactNode }) {
  const data = await loadApiWorkbenchData()
  const design = data?.design
  const resources = design?.resources ?? []
  const index: ModelNavIndex = {
    domain: (design?.entities ?? []).map((entity) => ({ href: "/model/domain?entity=" + entity.id + "#entity-" + entity.id, label: entity.name, group: "Entiteter" })),
    api: [
      ...resources.map((resource) => ({ href: "/model/api/resources/" + resource.id, label: "/" + resource.path + "/", mono: true, group: "Resurser" })),
      ...(design?.api_projections ?? []).map((projection) => ({ href: "/model/api/projections/" + projection.id, label: projection.name, mono: true, group: "Svarstyper" })),
    ],
    frontend: (design?.screens ?? []).map((screen) => ({ href: "/model/frontend/screens/" + screen.id + "/edit", label: screen.name, hint: screen.route, group: "Skärmar" })),
    integrations: (design?.integrations ?? []).map((integration) => ({ href: "/model/integrations#integration-" + integration.id, label: integration.name, hint: integration.kind, group: "Integrationer" })),
  }
  const counts = {
    domain: design?.entities?.length ?? 0,
    api: resources.length,
    frontend: design?.screens?.length ?? 0,
    integrations: design?.integrations?.length ?? 0,
  }

  return (
    <ModelDataProvider data={data}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
        <aside className="sticky top-2 z-20 lg:top-24 lg:w-64 lg:shrink-0">
          <ModelNav counts={counts} index={index} />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </ModelDataProvider>
  )
}

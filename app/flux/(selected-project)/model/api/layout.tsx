import type { ReactNode } from "react"
import { Plus } from "lucide-react"
import { ActionLink, ModelPageHeader } from "../model-ui"

export default function ApiWorkbenchLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6 pb-12">
      <ModelPageHeader
        title="API"
        description="Resurser, endpoints och svarskontrakt – och koden Flux genererar från dem."
        actions={
          <>
            <ActionLink href="/model/api/resources/new" variant="primary"><Plus size={15} aria-hidden /> Ny resurs</ActionLink>
            <ActionLink href="/model/api/operations/new">Ny operation</ActionLink>
            <ActionLink href="/model/scaffold">Kodgenerator</ActionLink>
          </>
        }
      />
      {children}
    </div>
  )
}

import type { FluxScaffoldTarget } from "@/app/lib/dal/flux"
import { scaffoldTargets } from "../api/api-components"
import { ApiCodeGenerator } from "../api/api-code-generator"
import { loadApiWorkbenchData } from "../api/api-data"
import { ModelPageHeader, ModelSection } from "../model-ui"

function targetFor(value: string | undefined, preferredTargets: string[]): FluxScaffoldTarget {
  if (scaffoldTargets.some((target) => target.id === value)) return value as FluxScaffoldTarget
  const preferred = preferredTargets.find((target) => scaffoldTargets.some((item) => item.id === target))
  return preferred as FluxScaffoldTarget | undefined ?? "typescript"
}

export default async function FluxScaffoldPage({
  searchParams,
}: {
  searchParams: Promise<{ target?: string; file?: string }>
}) {
  const [query, data] = await Promise.all([searchParams, loadApiWorkbenchData()])
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att öppna kodgeneratorn.</p>

  const stack = data.design.stack_profile
  const target = targetFor(query.target, stack?.targets ?? [])
  return (
    <div className="flex flex-col gap-6 pb-12">
      <ModelPageHeader
        back={{ href: "/model/delivery", label: "Leverans" }}
        title="Kodgenerator"
        description={"Genererar kod från " + data.design.entities.length + " entiteter och " + data.design.api_operations.length + " API-operationer" + (stack ? " för " + stack.database + " med " + stack.auth_method + "." : ". Ingen stackprofil är vald än.")}
      />

      <ApiCodeGenerator target={target} file={query.file} targets={scaffoldTargets} />

      <ModelSection id="scaffold-requirements" title="Krav för vissa targets">
        <dl className="divide-y divide-border px-4 py-1 text-sm sm:px-5">
          <div className="flex gap-4 py-2.5"><dt className="w-28 shrink-0 font-medium text-text">Design tokens</dt><dd className="text-text-muted">Projektet behöver en vald identitet.</dd></div>
          <div className="flex gap-4 py-2.5"><dt className="w-28 shrink-0 font-medium text-text">Integration</dt><dd className="text-text-muted">Minst ett integrationsanrop med giltig bas-URL.</dd></div>
        </dl>
      </ModelSection>
    </div>
  )
}

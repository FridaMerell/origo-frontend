"use client"

import { useState } from "react"
import { PencilIcon, PlusIcon } from "lucide-react"
import { Button } from "@/app/components/ui/Button"
import { DeleteButton } from "@/app/components/ui/DeleteButton"
import { deleteIntegration } from "@/app/actions/flux/design"
import type { FluxIntegration } from "@/app/lib/dal"
import { INTEGRATION_KIND_LABELS, IntegrationFormDrawer } from "./integration-form-drawer"
import { useModel } from "./model-context"

export function IntegrationsView({ initialIntegrations }: { initialIntegrations: FluxIntegration[] }) {
  const { projectId } = useModel()
  const [integrations, setIntegrations] = useState(initialIntegrations)
  const [drawer, setDrawer] = useState<{ open: boolean; integration?: FluxIntegration }>({ open: false })

  const removeIntegration = async (integration: FluxIntegration) => {
    setIntegrations((prev) => prev.filter((item) => item.id !== integration.id))
    const result = await deleteIntegration(integration.id)
    if (result?.error) setIntegrations((prev) => [...prev, integration])
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-text-muted">Externa tjänster och de miljövariabler de kräver. De hamnar i projektskelettets .env.example.</p>
        <Button variant="secondary" size="sm" onClick={() => setDrawer({ open: true })}>
          <PlusIcon size={14} />
          Ny integration
        </Button>
      </div>

      {integrations.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-text-muted">
          Inga integrationer än.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {integrations.map((integration) => (
            <li key={integration.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0 text-sm">
                <span className="font-medium text-text">{integration.name}</span>
                <span className="ml-2 text-xs text-text-faint">{INTEGRATION_KIND_LABELS[integration.kind]}</span>
                {integration.env_vars.length > 0 && (
                  <p className="mt-1 font-mono text-xs text-text-muted">{integration.env_vars.join(", ")}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label="Redigera integration"
                  className="rounded-md p-1 text-text-faint transition-colors hover:bg-surface-2 hover:text-text"
                  onClick={() => setDrawer({ open: true, integration })}
                >
                  <PencilIcon size={14} />
                </button>
                <DeleteButton
                  label="Ta bort integration"
                  confirmTitle="Ta bort integration"
                  confirmMessage="Ta bort integrationen? Det går inte att återställa."
                  showTitle
                  className="rounded-md p-1 text-text-faint transition-colors hover:bg-danger-wash hover:text-danger disabled:opacity-50"
                  onDelete={() => removeIntegration(integration)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <IntegrationFormDrawer
        open={drawer.open}
        onClose={() => setDrawer({ open: false })}
        projectId={projectId}
        integration={drawer.integration}
        onSaved={(saved) =>
          setIntegrations((prev) => (prev.some((item) => item.id === saved.id) ? prev.map((item) => (item.id === saved.id ? saved : item)) : [...prev, saved]))
        }
      />
    </div>
  )
}

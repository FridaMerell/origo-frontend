"use client"

import { createContext, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react"
import { useRouter } from "next/navigation"
import { useSelectedFluxProject } from "@/app/flux/_state/flux-context"
import type { FluxEntity, FluxField, FluxRelation } from "@/app/lib/dal"

type ModelState = {
  projectId: number
  entities: FluxEntity[]
  fields: FluxField[]
  relations: FluxRelation[]
  setEntities: Dispatch<SetStateAction<FluxEntity[]>>
  setFields: Dispatch<SetStateAction<FluxField[]>>
  setRelations: Dispatch<SetStateAction<FluxRelation[]>>
}

const ModelContext = createContext<ModelState | null>(null)

export function ModelProvider({
  projectId,
  initialEntities,
  initialFields,
  initialRelations,
  children,
}: {
  projectId: number
  initialEntities: FluxEntity[]
  initialFields: FluxField[]
  initialRelations: FluxRelation[]
  children: ReactNode
}) {
  const [entities, setEntities] = useState(initialEntities)
  const [fields, setFields] = useState(initialFields)
  const [relations, setRelations] = useState(initialRelations)

  // Switching project in Flux only updates client state (cookie + client-side board fetch), so
  // the server-rendered model would keep showing the previous project. The cookie is already
  // set at that point; refreshing re-runs the server layout, whose new key remounts everything.
  const { selectedProject } = useSelectedFluxProject()
  const router = useRouter()
  useEffect(() => {
    if (selectedProject && selectedProject.id !== projectId) router.refresh()
  }, [selectedProject, projectId, router])

  return (
    <ModelContext.Provider value={{ projectId, entities, fields, relations, setEntities, setFields, setRelations }}>
      {children}
    </ModelContext.Provider>
  )
}

export function useModel(): ModelState {
  const value = useContext(ModelContext)
  if (!value) throw new Error("useModel must be used inside ModelProvider")
  return value
}

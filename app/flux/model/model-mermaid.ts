import { schemaToMermaid, type DbSchema, type RelCardinality } from "@/app/flux/documents/db-mermaid"
import type { FluxEntity, FluxField, FluxRelation, FluxRelationKind } from "@/app/lib/dal"

const KIND_TO_CARDINALITY: Record<FluxRelationKind, RelCardinality> = {
  fk: "one-many",
  o2o: "one-one",
  m2m: "many-many",
}

/** Build the ER schema of a project's data model. A foreign key points from the
 *  "many" side (source) to the "one" side (target), so the diagram is drawn
 *  target -> source to read "one target has many sources". */
export function modelToSchema(
  entities: FluxEntity[],
  fields: FluxField[],
  relations: FluxRelation[],
): DbSchema {
  const nameById = new Map(entities.map((entity) => [entity.id, entity.name]))

  return {
    tables: entities.map((entity) => ({
      name: entity.name,
      fields: [
        { name: "id", type: "int", key: "PK" as const },
        ...fields
          .filter((field) => field.entity === entity.id)
          .map((field) => ({ name: field.name, type: field.type, key: field.unique ? ("UK" as const) : ("" as const) })),
      ],
    })),
    relations: relations.flatMap((relation) => {
      const source = nameById.get(relation.source)
      const target = nameById.get(relation.target)
      if (!source || !target) return []
      const flip = relation.kind === "fk"
      return [{
        id: `r${relation.id}`,
        from: flip ? target : source,
        to: flip ? source : target,
        cardinality: KIND_TO_CARDINALITY[relation.kind],
        label: relation.name,
      }]
    }),
  }
}

export function modelToMermaid(entities: FluxEntity[], fields: FluxField[], relations: FluxRelation[]): string {
  return schemaToMermaid(modelToSchema(entities, fields, relations))
}

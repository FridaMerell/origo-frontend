/**
 * Extract just the declaration for one generated name from a file that bundles several
 * (e.g. api-projections.ts has one `export type X = {...}` per ApiProjection). Mirrors
 * flux/services/scaffold/common.py's pascal() so a projection's stored `name` maps to the
 * exact identifier the Python generator wrote.
 */

const WORDS = /[A-Z]+(?=[A-Z][a-z])|[A-Z]?[a-z]+\d*|[A-Z]+\d*|\d+/g

export function toPascalCase(value: string): string {
  const words = value.match(WORDS) ?? []
  return words
    .map((word) => (word === word.toUpperCase() ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word[0].toUpperCase() + word.slice(1)))
    .join("")
}

/** The full `export type Name = {...};` (or `= ...;` for a non-object alias) statement, brace-balanced. */
export function extractTypeScriptDeclaration(content: string, name: string): string | undefined {
  const marker = `export type ${toPascalCase(name)} = `
  const start = content.indexOf(marker)
  if (start === -1) return undefined

  const afterEquals = start + marker.length
  if (content[afterEquals] !== "{") {
    const end = content.indexOf(";", afterEquals)
    return end === -1 ? undefined : content.slice(start, end + 1)
  }

  let depth = 0
  for (let index = afterEquals; index < content.length; index++) {
    if (content[index] === "{") depth++
    else if (content[index] === "}") {
      depth--
      if (depth === 0) {
        const semicolon = content.indexOf(";", index)
        const end = semicolon === -1 ? index + 1 : semicolon + 1
        return content.slice(start, end)
      }
    }
  }
  return undefined
}

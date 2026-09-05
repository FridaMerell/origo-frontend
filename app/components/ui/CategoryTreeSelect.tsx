"use client"

import { useDeferredValue, useMemo, useState } from "react"
import { useDismissableOpen } from "./use-dismissable-open"
import { Check, ChevronDown, Search } from "lucide-react"

export type CategoryTreeSelectItem = {
  id: string
  label: string
  parent_category?: string | null
  is_primary?: boolean
}

type CategoryTreeSelectProps<T extends CategoryTreeSelectItem> = {
  categories: T[]
  value: string | null
  onChange: (value: string | null) => void
  className?: string
  placeholder?: string
  allLabel?: string
  searchPlaceholder?: string
}

type TreeNode<T extends CategoryTreeSelectItem> = {
  item: T
  children: TreeNode<T>[]
  depth: number
}

function normalize(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("sv")
    .replace(/[\s-]+/g, " ")
}

function sortItems<T extends CategoryTreeSelectItem>(a: T, b: T) {
  return Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary)) || a.label.localeCompare(b.label, "sv")
}

function buildTree<T extends CategoryTreeSelectItem>(categories: T[]): TreeNode<T>[] {
  const nodesById = new Map<string, TreeNode<T>>()
  const childrenByParent = new Map<string, T[]>()
  const roots: T[] = []

  categories.forEach((category) => {
    nodesById.set(category.id, { item: category, children: [], depth: 0 })
  })

  categories.forEach((category) => {
    const parentId = category.parent_category?.trim()
    if (parentId && nodesById.has(parentId)) {
      const children = childrenByParent.get(parentId) ?? []
      children.push(category)
      childrenByParent.set(parentId, children)
    } else {
      roots.push(category)
    }
  })

  const attach = (items: T[], depth: number): TreeNode<T>[] =>
    items
      .sort(sortItems)
      .map((item) => ({
        item,
        depth,
        children: attach(childrenByParent.get(item.id) ?? [], depth + 1),
      }))

  return attach(roots, 0)
}

function filterTree<T extends CategoryTreeSelectItem>(
  nodes: TreeNode<T>[],
  query: string,
  byId: Map<string, T>
): TreeNode<T>[] {
  if (!query) return nodes

  const matches = (item: T) => {
    const path: string[] = []
    let current: T | undefined = item

    while (current) {
      path.unshift(current.label)
      const parentId: string | undefined = current.parent_category?.trim()
      current = parentId ? byId.get(parentId) : undefined
    }

    const haystack = normalize([
      ...path,
      item.is_primary ? "primär" : "",
    ].join(" "))
    return haystack.includes(query)
  }

  const walk = (node: TreeNode<T>): TreeNode<T> | null => {
    const filteredChildren = node.children
      .map(walk)
      .filter((child): child is TreeNode<T> => Boolean(child))

    if (!matches(node.item) && filteredChildren.length === 0) return null

    return {
      ...node,
      children: matches(node.item) ? node.children : filteredChildren,
    }
  }

  return nodes.map(walk).filter((node): node is TreeNode<T> => Boolean(node))
}

function flattenSelectedPath<T extends CategoryTreeSelectItem>(
  categories: T[],
  value: string | null
): string[] {
  if (!value) return []

  const byId = new Map(categories.map((category) => [category.id, category] as const))
  const path: string[] = []
  let current = byId.get(value)

  while (current) {
    path.unshift(current.label)
    const parentId = current.parent_category?.trim()
    current = parentId ? byId.get(parentId) : undefined
  }

  return path
}

function findItem<T extends CategoryTreeSelectItem>(categories: T[], value: string | null) {
  if (!value) return null
  return categories.find((category) => category.id === value) ?? null
}

export function CategoryTreeSelect<T extends CategoryTreeSelectItem>({
  categories,
  value,
  onChange,
  className = "",
  placeholder = "Välj kategori",
  allLabel = "Alla kategorier",
  searchPlaceholder = "Sök kategori",
}: CategoryTreeSelectProps<T>) {
  const { open, setOpen, ref } = useDismissableOpen<HTMLDivElement>()
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)

  const selectedItem = findItem(categories, value)
  const selectedPath = flattenSelectedPath(categories, value)
  const tree = useMemo(() => buildTree(categories), [categories])
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category] as const)),
    [categories]
  )
  const normalizedSearch = normalize(deferredSearch)
  const visibleTree = useMemo(
    () => filterTree(tree, normalizedSearch, categoryById),
    [categoryById, normalizedSearch, tree]
  )

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-2 rounded border border-field-border bg-surface px-3 py-2.5 text-left text-sm text-text transition-colors hover:border-accent focus:border-accent focus:outline-none"
      >
        <span className="min-w-0 truncate">
          {selectedPath.length > 0 ? selectedPath.join(" · ") : selectedItem?.label ?? placeholder}
        </span>
        <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded border border-border bg-surface shadow-sm">
          <div className="border-b border-border p-2">
            <div className="flex items-center gap-2 rounded border border-field-border bg-surface-2 px-2.5 py-2">
              <Search size={14} className="shrink-0 text-text-faint" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-sm text-text placeholder:text-text-faint focus:outline-none"
              />
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto py-1">
            <button
              type="button"
              role="option"
              aria-selected={value === null}
              onClick={() => {
                onChange(null)
                setOpen(false)
                setSearch("")
              }}
              className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent-wash hover:text-accent ${value === null ? "bg-accent-wash text-accent" : "text-text"
                }`}
            >
              <span className="truncate">{allLabel}</span>
              {value === null ? <Check name="check" size={14} /> : null}
            </button>

            {visibleTree.length > 0 ? (
              <div role="listbox" aria-label="Kategoriträd">
                {visibleTree.map((node) => (
                  <CategoryTreeNode
                    key={node.item.id}
                    node={node}
                    value={value}
                    onChange={(nextValue) => {
                      onChange(nextValue)
                      setOpen(false)
                      setSearch("")
                    }}
                  />
                ))}
              </div>
            ) : (
              <p className="px-3 py-3 text-sm text-text-muted">Inga kategorier matchar sökningen.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function CategoryTreeNode<T extends CategoryTreeSelectItem>({
  node,
  value,
  onChange,
}: {
  node: TreeNode<T>
  value: string | null
  onChange: (value: string) => void
}) {
  const isSelected = node.item.id === value

  return (
    <div>
      <button
        type="button"
        role="option"
        aria-selected={isSelected}
        onClick={() => onChange(node.item.id)}
        className={`flex w-full items-center justify-between gap-2 py-2 pr-3 text-left text-sm transition-colors hover:bg-accent-wash hover:text-accent ${isSelected ? "bg-accent-wash text-accent" : "text-text"
          }`}
        style={{ paddingLeft: 12 + node.depth * 18 }}
      >
        <span className="min-w-0 truncate">
          {node.item.label}
          {node.item.is_primary ? (
            <span className="ml-2 rounded-full border border-current/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
              Primär
            </span>
          ) : null}
        </span>
        {isSelected ? <Check size={14} className="shrink-0" /> : null}
      </button>

      {node.children.length > 0 ? (
        <div className="border-l border-border">
          {node.children.map((child) => (
            <CategoryTreeNode
              key={child.item.id}
              node={child}
              value={value}
              onChange={onChange}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

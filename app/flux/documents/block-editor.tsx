"use client"

import { useCallback, useMemo, useRef } from "react"
import { Button } from "@/app/components/ui/Button"
import { Icon } from "@/app/components/ui/Icon"
import { BLOCK_LABELS, blockId, type BlockType, type DocumentBlock } from "./blocks"
import { schemaToMermaid, starterSchema } from "./db-mermaid"
import { DbSchemaEditor } from "./dbschema-editor"
import { FlowchartEditor } from "./flowchart-editor"
import { MarkdownEditor } from "./markdown-editor"

const EMPTY_FLOW = 'flowchart TD\n  start(["Start"]) --> slut(["Slut"])'

function emptyBlock(type: BlockType): DocumentBlock {
  if (type === "flowchart") return { id: blockId(), type, content: EMPTY_FLOW }
  if (type === "dbschema") return { id: blockId(), type, content: schemaToMermaid(starterSchema()) }
  return { id: blockId(), type: "text", content: "" }
}

const BLOCK_ICON: Record<BlockType, string> = {
  text: "file-text",
  flowchart: "git-fork",
  dbschema: "database",
}

function BlockRow({
  block,
  index,
  count,
  onUpdate,
  onRemove,
  onMove,
}: {
  block: DocumentBlock
  index: number
  count: number
  onUpdate: (id: string, content: string) => void
  onRemove: (id: string) => void
  onMove: (index: number, direction: -1 | 1) => void
}) {
  // Stable per-block change handler: the nested editors (MDXEditor, ReactFlow)
  // subscribe to it in effects, so a fresh closure each render would loop.
  const handleChange = useCallback((next: string) => onUpdate(block.id, next), [onUpdate, block.id])

  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-faint">
          <Icon name={BLOCK_ICON[block.type]} size={14} />
          {BLOCK_LABELS[block.type]}
        </span>
        <span className="flex items-center gap-1">
          <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0} className="rounded p-1 text-text-muted hover:bg-surface-2 hover:text-text disabled:opacity-30" aria-label="Flytta upp">
            <Icon name="chevron-up" size={14} />
          </button>
          <button type="button" onClick={() => onMove(index, 1)} disabled={index === count - 1} className="rounded p-1 text-text-muted hover:bg-surface-2 hover:text-text disabled:opacity-30" aria-label="Flytta ned">
            <Icon name="chevron-down" size={14} />
          </button>
          <button type="button" onClick={() => onRemove(block.id)} disabled={count === 1} className="rounded p-1 text-text-muted hover:bg-surface-2 hover:text-danger disabled:opacity-30" aria-label="Ta bort block">
            <Icon name="trash-2" size={14} />
          </button>
        </span>
      </div>
      <div className="p-3">
        {block.type === "text" ? (
          <MarkdownEditor value={block.content} onChange={handleChange} />
        ) : block.type === "flowchart" ? (
          <FlowchartEditor value={block.content} onChange={handleChange} />
        ) : (
          <DbSchemaEditor value={block.content} onChange={handleChange} />
        )}
      </div>
    </div>
  )
}

export function BlockEditor({
  blocks,
  onChange,
}: {
  blocks: DocumentBlock[]
  onChange: (blocks: DocumentBlock[]) => void
}) {
  const blocksRef = useRef(blocks)
  blocksRef.current = blocks
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const updateBlock = useCallback((id: string, content: string) => {
    const current = blocksRef.current
    const block = current.find((item) => item.id === id)
    if (!block || block.content === content) return
    onChangeRef.current(current.map((item) => item.id === id ? { ...item, content } : item))
  }, [])

  const removeBlock = useCallback((id: string) => {
    onChangeRef.current(blocksRef.current.filter((item) => item.id !== id))
  }, [])

  const moveBlock = useCallback((index: number, direction: -1 | 1) => {
    const current = blocksRef.current
    const next = index + direction
    if (next < 0 || next >= current.length) return
    const reordered = [...current]
    ;[reordered[index], reordered[next]] = [reordered[next], reordered[index]]
    onChangeRef.current(reordered)
  }, [])

  const addBlock = useCallback((type: BlockType) => {
    onChangeRef.current([...blocksRef.current, emptyBlock(type)])
  }, [])

  const types = useMemo(() => Object.keys(BLOCK_LABELS) as BlockType[], [])

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, index) => (
        <BlockRow
          key={block.id}
          block={block}
          index={index}
          count={blocks.length}
          onUpdate={updateBlock}
          onRemove={removeBlock}
          onMove={moveBlock}
        />
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-text-muted">Lägg till block:</span>
        {types.map((type) => (
          <Button key={type} type="button" variant="secondary" size="sm" onClick={() => addBlock(type)}>
            <Icon name="plus" size={14} /> {BLOCK_LABELS[type]}
          </Button>
        ))}
      </div>
    </div>
  )
}

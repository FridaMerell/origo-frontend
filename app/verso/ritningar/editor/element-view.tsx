import type { DrawingElement, DrawingRole, DrawingUnit } from "@/app/lib/dal"
import { dimensionGeometry, formatLength } from "./geometry"

const STROKE_PX = 1.5
const HIT_PX = 14

type Props = {
  el: DrawingElement
  selected: boolean
  unit: DrawingUnit
  /** Default text height in drawing units. */
  textSize: number
}

/** Surfaces to cover get a light wash, openings (windows, doors) a stronger one. */
const roleFill = (role?: DrawingRole) =>
  role === "surface" ? "var(--accent-wash)" : role === "opening" ? "var(--border)" : "none"

/** Transparent, wide stroke so thin lines are easy to hit with a pointer. */
const hit = { stroke: "transparent", strokeWidth: HIT_PX, fill: "none", vectorEffect: "non-scaling-stroke" as const, pointerEvents: "stroke" as const }

export function ElementView({ el, selected, unit, textSize }: Props) {
  const color = selected ? "var(--accent)" : (el.stroke ?? "currentColor")
  const line = {
    stroke: color,
    strokeWidth: el.strokeWidth ?? STROKE_PX,
    vectorEffect: "non-scaling-stroke" as const,
    fill: "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  }

  switch (el.type) {
    case "line":
      return (
        <g data-element-id={el.id}>
          <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} {...line} />
          <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} {...hit} />
        </g>
      )
    case "polyline": {
      const points = el.points.map((p) => `${p.x},${p.y}`).join(" ")
      return (
        <g data-element-id={el.id}>
          <polyline points={points} {...line} />
          <polyline points={points} {...hit} />
        </g>
      )
    }
    case "polygon": {
      const points = el.points.map(([x, y]) => `${x},${y}`).join(" ")
      return (
        <g data-element-id={el.id}>
          <polygon points={points} {...line} fill={roleFill(el.role)} />
          <polygon points={points} {...hit} />
        </g>
      )
    }
    case "rect":
      return (
        <g data-element-id={el.id}>
          <rect x={el.x} y={el.y} width={el.width} height={el.height} {...line} fill={roleFill(el.role)} />
          <rect x={el.x} y={el.y} width={el.width} height={el.height} {...hit} />
        </g>
      )
    case "ellipse":
      return (
        <g data-element-id={el.id}>
          <ellipse cx={el.cx} cy={el.cy} rx={el.rx} ry={el.ry} {...line} />
          <ellipse cx={el.cx} cy={el.cy} rx={el.rx} ry={el.ry} {...hit} />
        </g>
      )
    case "dimension": {
      const g = dimensionGeometry(el)
      const tick = textSize * 0.4
      const tickDx = (g.unit.x - g.unit.y) * tick
      const tickDy = (g.unit.y + g.unit.x) * tick
      return (
        <g data-element-id={el.id}>
          <g {...line} strokeWidth={(el.strokeWidth ?? STROKE_PX) * 0.7}>
            <line x1={g.ext1.from.x} y1={g.ext1.from.y} x2={g.ext1.to.x} y2={g.ext1.to.y} />
            <line x1={g.ext2.from.x} y1={g.ext2.from.y} x2={g.ext2.to.x} y2={g.ext2.to.y} />
            <line x1={g.a.x} y1={g.a.y} x2={g.b.x} y2={g.b.y} />
            <line x1={g.a.x - tickDx} y1={g.a.y - tickDy} x2={g.a.x + tickDx} y2={g.a.y + tickDy} />
            <line x1={g.b.x - tickDx} y1={g.b.y - tickDy} x2={g.b.x + tickDx} y2={g.b.y + tickDy} />
          </g>
          <text
            x={g.mid.x}
            y={g.mid.y}
            transform={`rotate(${g.angle} ${g.mid.x} ${g.mid.y}) translate(0 ${-textSize * 0.25})`}
            fontSize={textSize}
            textAnchor="middle"
            fill={color}
            style={{ userSelect: "none" }}
          >
            {formatLength(g.length, unit)}
          </text>
          <line x1={g.a.x} y1={g.a.y} x2={g.b.x} y2={g.b.y} {...hit} />
        </g>
      )
    }
    case "text":
      return (
        <text
          data-element-id={el.id}
          x={el.x}
          y={el.y}
          fontSize={el.size ?? textSize}
          fill={color}
          style={{ userSelect: "none" }}
        >
          {el.text}
        </text>
      )
    case "note": {
      const size = textSize
      const lines = el.text.split("\n")
      const width = Math.max(4, ...lines.map((l) => l.length)) * size * 0.6 + size
      const height = lines.length * size * 1.3 + size * 0.6
      return (
        <g data-element-id={el.id}>
          <rect
            x={el.x}
            y={el.y}
            width={width}
            height={height}
            fill="var(--accent-wash)"
            stroke={color}
            strokeWidth={STROKE_PX}
            vectorEffect="non-scaling-stroke"
          />
          <text x={el.x + size * 0.5} y={el.y + size * 1.1} fontSize={size} fill="currentColor" style={{ userSelect: "none" }}>
            {lines.map((l, i) => (
              <tspan key={i} x={el.x + size * 0.5} dy={i === 0 ? 0 : size * 1.3}>
                {l}
              </tspan>
            ))}
          </text>
        </g>
      )
    }
  }
}

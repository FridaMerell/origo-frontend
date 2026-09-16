import type { Map } from "maplibre-gl"

type Point = readonly [number, number]

function seeded(seed: number) {
  let value = seed >>> 0
  return () => {
    value = Math.imul(value ^ value >>> 15, 1 | value)
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value)
    return ((value ^ value >>> 14) >>> 0) / 4294967296
  }
}

function canvasImage(width: number, height: number, draw: (context: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Kunde inte skapa karttexturen.")
  context.lineCap = "round"
  context.lineJoin = "round"
  draw(context)
  return context.getImageData(0, 0, width, height)
}

function roughStroke(context: CanvasRenderingContext2D, points: Point[], seed: number, opacity: number) {
  const random = seeded(seed)
  context.beginPath()
  points.forEach(([x, y], index) => {
    const px = x + (random() - .5) * .7
    const py = y + (random() - .5) * .7
    if (index === 0) context.moveTo(px, py)
    else context.lineTo(px, py)
  })
  context.strokeStyle = `rgba(79, 91, 86, ${opacity})`
  context.lineWidth = .45
  context.stroke()
}

function replaceImage(map: Map, name: string, image: ImageData) {
  if (map.hasImage(name)) map.removeImage(name)
  map.addImage(name, image)
}

export async function registerAtlasPatterns(map: Map) {
  const marsh = canvasImage(48, 48, (context) => {
    for (let x = 7; x < 48; x += 15) roughStroke(context, [[x - 3, 9], [x + 1, 15], [x - 1, 22], [x + 2, 30], [x, 40]], 8100 + x, .42)
  })
  replaceImage(map, "marsh", marsh)

  const waterHatch = canvasImage(64, 18, (context) => {
    roughStroke(context, [[0, 4], [18, 3.7], [39, 4.4], [64, 3.9]], 8301, .4)
    roughStroke(context, [[0, 10], [21, 10.5], [43, 9.7], [64, 10.2]], 8302, .36)
    roughStroke(context, [[0, 16], [15, 15.6], [37, 16.2], [64, 15.8]], 8303, .32)
  })
  replaceImage(map, "water-hatch", waterHatch)
}

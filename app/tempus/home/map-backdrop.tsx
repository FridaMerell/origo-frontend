"use client"

import { useEffect, useRef } from "react"
import { BiotopeMap, type BiotopeMapProps } from "../ui/biotope-map/BiotopeMap"

// How much ink the map has. Each mask is two layers: the loupe's circle of full
// ink, and the map's own ink, which thins out towards the text on its left.
// Only the last gradient differs. The classes are written out in full because
// Tailwind only finds class names that stand whole in the source.
const INK = {
  // The page's main picture: nearly full ink from a third of the way in.
  header:
    "[&_svg]:[mask-image:radial-gradient(circle_at_var(--sketch-loupe-x)_var(--sketch-loupe-y),#000_0,#000_calc(var(--sketch-loupe)*.5),transparent_var(--sketch-loupe)),linear-gradient(to_right,transparent,rgb(0_0_0/.85)_35%)]",
  // Beside a list: faint under the species, full ink at the far right.
  row:
    "[&_svg]:[mask-image:radial-gradient(circle_at_var(--sketch-loupe-x)_var(--sketch-loupe-y),#000_0,#000_calc(var(--sketch-loupe)*.5),transparent_var(--sketch-loupe)),linear-gradient(to_right,transparent,rgb(0_0_0/.95)_75%)]",
}

// The loupe's own layer: the same map drawn darker and heavier, visible only
// inside the circle, so the loupe shows a different drawing and not just more
// of the same faint one. The circle is cut by the same fade as the map's own
// ink, so the heavy drawing never reaches the text on the left.
const LENS = {
  header:
    "[&_svg]:[mask-composite:intersect] [&_svg]:[mask-image:radial-gradient(circle_at_var(--sketch-loupe-x)_var(--sketch-loupe-y),#000_0,#000_calc(var(--sketch-loupe)*.6),transparent_var(--sketch-loupe)),linear-gradient(to_right,transparent,#000_35%)]",
  row:
    "[&_svg]:[mask-composite:intersect] [&_svg]:[mask-image:radial-gradient(circle_at_var(--sketch-loupe-x)_var(--sketch-loupe-y),#000_0,#000_calc(var(--sketch-loupe)*.6),transparent_var(--sketch-loupe)),linear-gradient(to_right,transparent,#000_75%)]",
}

// Drawn in the page's own ink, so the map reads as a drawing and not as a tint.
const THEME = { paper: "transparent", paperWarm: "transparent", contourMinor: "var(--text-faint)", inkSoft: "var(--text)" }

const LENS_THEME = { ...THEME, contourMinor: "var(--text)" }

// A biotope map as a backdrop that fills its parent, with the loupe: a soft
// circle of full ink that follows the mouse while it is over the map. The
// circle's opening and closing is styled in globals.css.
export function MapBackdrop({ ink, ...map }: { ink: keyof typeof INK } & Pick<BiotopeMapProps, "biotope" | "seed">) {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = root.current
    if (!element) return

    // The map lies behind text and takes no pointer events itself, so the
    // mouse is followed on the window and compared with the map's box.
    const follow = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return
      const box = element.getBoundingClientRect()
      const x = event.clientX - box.left
      const y = event.clientY - box.top
      const inside = x >= 0 && y >= 0 && x <= box.width && y <= box.height
      element.dataset.loupe = inside ? "on" : "off"
      if (!inside) return
      element.style.setProperty("--sketch-loupe-x", `${x}px`)
      element.style.setProperty("--sketch-loupe-y", `${y}px`)
    }
    window.addEventListener("pointermove", follow, { passive: true })
    return () => window.removeEventListener("pointermove", follow)
  }, [])

  return (
    <div ref={root} data-loupe="off" className="tempus-sketch absolute inset-0">
      <div className={`absolute inset-0 ${INK[ink]}`}>
        <BiotopeMap
          {...map}
          theme={THEME}
          compass={false}
          aria-hidden="true"
          preserveAspectRatio="xMaxYMid slice"
          className="absolute inset-0 size-full!"
        />
      </div>
      <div className={`absolute inset-0 ${LENS[ink]}`}>
        <BiotopeMap
          {...map}
          theme={LENS_THEME}
          compass={false}
          aria-hidden="true"
          preserveAspectRatio="xMaxYMid slice"
          className="absolute inset-0 size-full!"
        />
      </div>
    </div>
  )
}

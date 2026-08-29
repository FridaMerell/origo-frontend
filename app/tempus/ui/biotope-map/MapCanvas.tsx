import type { ComponentPropsWithoutRef } from "react";
import type { El, MapTheme, Scene } from "./types";
import { mapThemeStyle } from "./theme";

export type MapCanvasProps = Omit<ComponentPropsWithoutRef<"svg">, "children"> & {
  scene: Scene;
  title?: string | undefined;
  theme?: Partial<MapTheme> | undefined;
  fit?: "contain" | "cover" | undefined;
};

function compactElements(elements: El[]): El[] {
  const compacted: El[] = [];

  for (const element of elements) {
    const previous = compacted[compacted.length - 1];
    const canMerge =
      element.t === "path" &&
      element.f === "none" &&
      previous?.t === "path" &&
      previous.f === "none" &&
      previous.layer === element.layer &&
      previous.s === element.s &&
      previous.w === element.w &&
      previous.o === element.o &&
      previous.dash === element.dash &&
      previous.transform === element.transform;

    if (canMerge && previous?.t === "path") previous.d += element.d;
    else compacted.push({ ...element });
  }

  return compacted;
}

export function MapCanvas({
  scene,
  title,
  theme,
  fit = "contain",
  className,
  style,
  ...svgProps
}: MapCanvasProps) {
  const elements = compactElements(scene.elements);

  return (
    <svg
      {...svgProps}
      viewBox={`0 0 ${scene.width} ${scene.height}`}
      preserveAspectRatio={svgProps.preserveAspectRatio ?? (fit === "cover" ? "xMidYMid slice" : undefined)}
      className={[fit === "cover" ? "block h-full w-full" : "block h-auto w-full", className]
        .filter(Boolean)
        .join(" ")}
      style={{ ...mapThemeStyle(theme), ...style }}
      role={title ? "img" : svgProps.role}
      aria-label={title ?? svgProps["aria-label"]}
    >
      {title ? <title>{title}</title> : null}
      <g strokeLinecap="round" strokeLinejoin="round">
        {elements.map((el, i) => {
          if (el.t === "rect")
            return (
              <rect
                key={i}
                x={el.x}
                y={el.y}
                width={el.w}
                height={el.h}
                fill={el.f ?? "none"}
                stroke={el.s}
                strokeWidth={el.sw}
              />
            );
          if (el.t === "text")
            return (
              <text
                key={i}
                x={el.x}
                y={el.y}
                fill={el.f}
                fontSize={el.size}
                letterSpacing={el.ls}
                textAnchor={el.anchor ?? "start"}
                fontFamily="ui-monospace, monospace"
              >
                {el.str}
              </text>
            );
          return (
            <path
              key={i}
              d={el.d}
              fill={el.f ?? "none"}
              stroke={el.s}
              strokeWidth={el.w}
              opacity={el.o}
              strokeDasharray={el.dash}
              transform={el.transform}
            />
          );
        })}
      </g>
    </svg>
  );
}

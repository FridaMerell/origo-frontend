import type { CSSProperties } from "react";
import type { MapTheme } from "./types";

export function mapThemeStyle(theme?: Partial<MapTheme>): CSSProperties {
  return {
    "--biotope-map-paper": theme?.paper,
    "--biotope-map-paper-warm": theme?.paperWarm,
    "--biotope-map-sea": theme?.sea,
    "--biotope-map-sea-deep": theme?.seaDeep,
    "--biotope-map-water": theme?.water,
    "--biotope-map-water-line": theme?.waterLine,
    "--biotope-map-contour-minor": theme?.contourMinor,
    "--biotope-map-contour-major": theme?.contourMajor,
    "--biotope-map-ink": theme?.ink,
    "--biotope-map-ink-soft": theme?.inkSoft,
    "--biotope-map-field": theme?.field,
    "--biotope-map-forest": theme?.forest,
    "--biotope-map-area-fill": theme?.areaFill,
    "--biotope-map-area-stroke": theme?.areaStroke,
  } as CSSProperties;
}

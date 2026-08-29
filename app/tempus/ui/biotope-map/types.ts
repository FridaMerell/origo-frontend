export type Biotope =
  | "boreal"
  | "lakes"
  | "rivers"
  | "seashore"
  | "marsh"
  | "agricultural"
  | "meadow"
  | "mountains";

export const BIOTOPES: { id: Biotope; label: string; hint: string }[] = [
  { id: "boreal", label: "Boreal forest", hint: "Rolling taiga, dense conifer cover" },
  { id: "lakes", label: "Lakes", hint: "Basins and still water bodies" },
  { id: "rivers", label: "Running water", hint: "River course with tributaries" },
  { id: "seashore", label: "Seashore", hint: "Coastline, shallows and dunes" },
  { id: "marsh", label: "Marshes / wetlands", hint: "Flat mire, pools and reeds" },
  { id: "agricultural", label: "Agricultural area", hint: "Parcels, hedgerows, tracks" },
  { id: "meadow", label: "Fields / meadows", hint: "Open grassland, gentle relief" },
  { id: "mountains", label: "Mountains", hint: "Ridges, steep dense contours" },
];

export type FeatureKey =
  | "trees"
  | "ponds"
  | "meadows"
  | "hills"
  | "valleys"
  | "roads";

export const FEATURES: { id: FeatureKey; label: string }[] = [
  { id: "trees", label: "Trees" },
  { id: "ponds", label: "Lakes / ponds" },
  { id: "meadows", label: "Meadows" },
  { id: "hills", label: "Hills" },
  { id: "valleys", label: "Valleys" },
  { id: "roads", label: "Roads" },
];

export type MapOptions = {
  biotope: Biotope;
  seed: string;
  width: number;
  height: number;
  detail: number; // contour density 1..10
  features: Record<FeatureKey, boolean>;
  featureAmount: number; // 1..10
  waterStrength: number; // 1..10 — coastline / river / lake presence
  relief: number; // 1..10 — terrain amplitude
  frame: boolean;
  label: boolean;
  compass: boolean;
};

export type LayerId =
  | "paper"
  | "water"
  | "contours"
  | "rivers"
  | "texture"
  | "roads"
  | "trees"
  | "meadows"
  | "annotation";

export const LAYERS: { id: LayerId; label: string }[] = [
  { id: "paper", label: "Paper" },
  { id: "water", label: "Water bodies" },
  { id: "contours", label: "Contours" },
  { id: "rivers", label: "Rivers" },
  { id: "texture", label: "Biotope texture" },
  { id: "roads", label: "Roads" },
  { id: "trees", label: "Trees" },
  { id: "meadows", label: "Meadows" },
  { id: "annotation", label: "Frame & caption" },
];

export type El = (
  | {
      t: "path";
      d: string;
      s?: string;
      f?: string;
      w?: number;
      o?: number;
      dash?: string;
      transform?: string;
    }
  | { t: "rect"; x: number; y: number; w: number; h: number; f?: string; s?: string; sw?: number }
  | {
      t: "text";
      x: number;
      y: number;
      str: string;
      size: number;
      f: string;
      ls?: number;
      anchor?: "start" | "middle" | "end";
    }
) & { layer?: LayerId };

export type Scene = {
  width: number;
  height: number;
  elements: El[];
};


export type MapTheme = {
  paper: string;
  paperWarm: string;
  sea: string;
  seaDeep: string;
  water: string;
  waterLine: string;
  contourMinor: string;
  contourMajor: string;
  ink: string;
  inkSoft: string;
  field: string;
  forest: string;
  areaFill: string;
  areaStroke: string;
};

/**
 * Generated scenes refer to CSS variables and therefore inherit the host app's
 * light/dark palette. Every variable has a standalone fallback for exported SVGs.
 */
export const PALETTE: MapTheme = {
  paper: "var(--biotope-map-paper, var(--surface, var(--color-card, #f7f4ec)))",
  paperWarm: "var(--biotope-map-paper-warm, var(--surface-raised, var(--color-background, #faf8f1)))",
  sea: "var(--biotope-map-sea, var(--secondary-wash, var(--color-muted, #d5e0e4)))",
  seaDeep: "var(--biotope-map-sea-deep, var(--surface-2, var(--color-secondary, #c6d5db)))",
  water: "var(--biotope-map-water, var(--secondary-wash, var(--color-muted, #dbe7ec)))",
  waterLine: "var(--biotope-map-water-line, var(--secondary, var(--color-muted-foreground, #7f9aa6)))",
  contourMinor: "var(--biotope-map-contour-minor, var(--border, var(--color-border, #b9b9a8)))",
  contourMajor: "var(--biotope-map-contour-major, var(--accent, var(--color-accent, #bc7050)))",
  ink: "var(--biotope-map-ink, var(--text, currentColor))",
  inkSoft: "var(--biotope-map-ink-soft, var(--text-muted, var(--color-muted-foreground, #9aa08f)))",
  field: "var(--biotope-map-field, var(--surface-2, var(--color-muted, #f1efe4)))",
  forest: "var(--biotope-map-forest, var(--secondary-wash, var(--color-secondary, #e3ead8)))",
  areaFill: "var(--biotope-map-area-fill, var(--accent, var(--color-accent, #bc7050)))",
  areaStroke: "var(--biotope-map-area-stroke, var(--accent-hover, var(--color-accent, #8f4932)))",
};

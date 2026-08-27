"use client";

import { useRef, useState } from "react";
import { Card } from "@/app/components/ui/Card";

export type Variant = "parcels" | "pasture" | "open";

export type ForestVariant = "slope" | "hollow" | "old-growth";

export type WetlandVariant = "fen" | "bog-islands" | "marsh-corridor";

export type MountainVariant = "slope" | "saddle" | "massif";

export type FreshwaterVariant = "lake-basin" | "river-valley" | "shoreline";

export type CoastalVariant = "rocky-shore" | "sheltered-bay" | "low-coast";

export type FogVariant = "bands" | "shore-bank" | "patches";

export type ForestFeatureVariant = "scattered" | "stands" | "contour-bands";

type Hill = {
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
  lines: number;
  stepX: number;
  stepY: number;
  wobble: number;
};

export type TunerConfig = {
  hillX: number;
  hillY: number;
  hillWidth: number;
  hillHeight: number;
  contourCount: number;
  spacingX: number;
  spacingY: number;
  propertyAngle: number;
  propertyCurve: number;
};

const defaultTunerConfig: TunerConfig = {
  hillX: 638,
  hillY: 136,
  hillWidth: 100,
  hillHeight: 38,
  contourCount: 8,
  spacingX: 47,
  spacingY: 23,
  propertyAngle: 5,
  propertyCurve: 45,
};

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZip(files: Array<{ name: string; data: Uint8Array }>) {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const write32 = (view: DataView, position: number, value: number) => view.setUint32(position, value, true);
  files.forEach(({ name, data }) => {
    const filename = encoder.encode(name);
    const local = new Uint8Array(30 + filename.length + data.length);
    const view = new DataView(local.buffer);
    write32(view, 0, 0x04034b50);
    view.setUint16(4, 20, true);
    view.setUint16(8, 0, true);
    view.setUint32(14, crc32(data), true);
    view.setUint32(18, data.length, true);
    view.setUint32(22, data.length, true);
    view.setUint16(26, filename.length, true);
    local.set(filename, 30);
    local.set(data, 30 + filename.length);
    chunks.push(local);
    const entry = new Uint8Array(46 + filename.length);
    const entryView = new DataView(entry.buffer);
    write32(entryView, 0, 0x02014b50);
    entryView.setUint16(4, 20, true);
    entryView.setUint16(6, 20, true);
    entryView.setUint32(16, crc32(data), true);
    entryView.setUint32(20, data.length, true);
    entryView.setUint32(24, data.length, true);
    entryView.setUint16(28, filename.length, true);
    entryView.setUint32(42, offset, true);
    entry.set(filename, 46);
    central.push(entry);
    offset += local.length;
  });
  const centralBytes = central.reduce((total, chunk) => total + chunk.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  write32(endView, 0, 0x06054b50);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralBytes, true);
  endView.setUint32(16, offset, true);
  const output = new Uint8Array(offset + centralBytes + end.length);
  let cursor = 0;
  [...chunks, ...central, end].forEach((chunk) => {
    output.set(chunk, cursor);
    cursor += chunk.length;
  });
  return new Blob([output.buffer as ArrayBuffer], { type: "application/zip" });
}

const tunerControls: Array<{
  key: keyof TunerConfig;
  label: string;
  min: number;
  max: number;
  step: number;
  suffix?: string;
}> = [
  { key: "hillX", label: "Höjdpunkt X", min: 420, max: 900, step: 2 },
  { key: "hillY", label: "Höjdpunkt Y", min: -40, max: 340, step: 2 },
  { key: "hillWidth", label: "Startbredd", min: 20, max: 180, step: 2 },
  { key: "hillHeight", label: "Starthöjd", min: 10, max: 90, step: 2 },
  { key: "contourCount", label: "Antal höjdkurvor", min: 3, max: 14, step: 1 },
  { key: "spacingX", label: "Horisontellt intervall", min: 15, max: 80, step: 1 },
  { key: "spacingY", label: "Vertikalt intervall", min: 8, max: 40, step: 1 },
  { key: "propertyAngle", label: "Ägogränsernas lutning", min: -18, max: 18, step: 1, suffix: "°" },
  { key: "propertyCurve", label: "Ägogränsernas kurvatur", min: -45, max: 45, step: 1 },
];

const candidates: Array<{
  id: Variant;
  number: string;
  title: string;
  description: string;
}> = [
  {
    id: "parcels",
    number: "A",
    title: "Skifteslandskap",
    description: "Mjuka höjdskillnader med tydliga, oregelbundna ägogränser.",
  },
  {
    id: "pasture",
    number: "B",
    title: "Betesmarksmosaik",
    description: "Flera låga terrängformer med ett lösare nät av markindelningar.",
  },
  {
    id: "open",
    number: "C",
    title: "Öppet odlingslandskap",
    description: "En stor, långsam sluttning med få visuella avbrott.",
  },
];

const hills: Record<Variant, Hill[]> = {
  parcels: [
    { centerX: 585, centerY: 95, radiusX: 44, radiusY: 24, lines: 7, stepX: 30, stepY: 15, wobble: 0.8 },
    { centerX: 76, centerY: 286, radiusX: 34, radiusY: 20, lines: 5, stepX: 34, stepY: 17, wobble: 2.4 },
  ],
  pasture: [
    { centerX: 565, centerY: 245, radiusX: 38, radiusY: 22, lines: 7, stepX: 25, stepY: 13, wobble: 1.6 },
    { centerX: 155, centerY: 48, radiusX: 36, radiusY: 19, lines: 6, stepX: 27, stepY: 14, wobble: 3.1 },
  ],
  open: [
    { centerX: 638, centerY: 136, radiusX: 100, radiusY: 38, lines: 8, stepX: 47, stepY: 23, wobble: 2.1 },
  ],
};

const forestCandidates: Array<{
  id: ForestVariant;
  number: string;
  title: string;
  description: string;
}> = [
  {
    id: "slope",
    number: "A",
    title: "Skogssluttning",
    description: "En sammanhängande sluttning med lugn höjdriktning och jämn skogstäckning.",
  },
  {
    id: "hollow",
    number: "B",
    title: "Skogssänka",
    description: "Två höjdpartier formar ett skyddat, lägre stråk genom skogen.",
  },
  {
    id: "old-growth",
    number: "C",
    title: "Gammelskogsterräng",
    description: "Tätare, oregelbunden terräng med mer varierad skogskänsla.",
  },
];

const forestHills: Record<ForestVariant, Hill[]> = {
  slope: [
    { centerX: 790, centerY: 128, radiusX: 120, radiusY: 52, lines: 9, stepX: 48, stepY: 24, wobble: 1.2 },
  ],
  hollow: [
    { centerX: 92, centerY: 28, radiusX: 58, radiusY: 35, lines: 7, stepX: 34, stepY: 19, wobble: 2.4 },
    { centerX: 665, centerY: 270, radiusX: 70, radiusY: 38, lines: 8, stepX: 36, stepY: 18, wobble: 4.1 },
  ],
  "old-growth": [
    { centerX: 575, centerY: 116, radiusX: 42, radiusY: 27, lines: 8, stepX: 29, stepY: 17, wobble: 3.2 },
    { centerX: 92, centerY: 282, radiusX: 34, radiusY: 22, lines: 6, stepX: 31, stepY: 16, wobble: 0.7 },
  ],
};

const wetlandCandidates: Array<{
  id: WetlandVariant;
  number: string;
  title: string;
  description: string;
}> = [
  {
    id: "fen",
    number: "A",
    title: "Öppen myr",
    description: "Mycket flack terräng med långa nivålinjer och ett luftigt våtmarksrastrum.",
  },
  {
    id: "bog-islands",
    number: "B",
    title: "Mosse med fastmarksholmar",
    description: "Låg våtmark bruten av några små, tydligt avläsbara höjdpartier.",
  },
  {
    id: "marsh-corridor",
    number: "C",
    title: "Kärrstråk",
    description: "Ett sammanhängande låglänt stråk mellan två mjuka terrängsidor.",
  },
];

const wetlandHills: Record<WetlandVariant, Hill[]> = {
  fen: [
    { centerX: 810, centerY: -75, radiusX: 210, radiusY: 58, lines: 5, stepX: 75, stepY: 34, wobble: 1.4 },
    { centerX: -90, centerY: 360, radiusX: 190, radiusY: 52, lines: 4, stepX: 82, stepY: 35, wobble: 3.5 },
  ],
  "bog-islands": [
    { centerX: 188, centerY: 112, radiusX: 30, radiusY: 18, lines: 5, stepX: 23, stepY: 13, wobble: 2.2 },
    { centerX: 544, centerY: 208, radiusX: 38, radiusY: 21, lines: 6, stepX: 25, stepY: 14, wobble: 4.3 },
  ],
  "marsh-corridor": [
    { centerX: -48, centerY: 132, radiusX: 92, radiusY: 48, lines: 7, stepX: 37, stepY: 21, wobble: 0.9 },
    { centerX: 772, centerY: 166, radiusX: 102, radiusY: 51, lines: 7, stepX: 38, stepY: 22, wobble: 3.7 },
  ],
};

const mountainCandidates: Array<{
  id: MountainVariant;
  number: string;
  title: string;
  description: string;
}> = [
  {
    id: "slope",
    number: "A",
    title: "Fjällsluttning",
    description: "En tydlig, lång sluttning med täta höjdkurvor och obruten riktning.",
  },
  {
    id: "saddle",
    number: "B",
    title: "Fjällpass",
    description: "Två höjdpartier formar ett öppet pass genom den brantare terrängen.",
  },
  {
    id: "massif",
    number: "C",
    title: "Högfjällsmassiv",
    description: "Ett koncentrerat massiv med dramatisk stigning och oregelbundna bergsytor.",
  },
];

const mountainHills: Record<MountainVariant, Hill[]> = {
  slope: [
    { centerX: 785, centerY: 122, radiusX: 82, radiusY: 42, lines: 12, stepX: 31, stepY: 17, wobble: 1.1 },
  ],
  saddle: [
    { centerX: 76, centerY: 66, radiusX: 42, radiusY: 29, lines: 10, stepX: 27, stepY: 16, wobble: 2.5 },
    { centerX: 650, centerY: 232, radiusX: 48, radiusY: 31, lines: 10, stepX: 28, stepY: 16, wobble: 4.2 },
  ],
  massif: [
    { centerX: 498, centerY: 138, radiusX: 34, radiusY: 25, lines: 13, stepX: 25, stepY: 15, wobble: 3.3 },
    { centerX: 72, centerY: 302, radiusX: 28, radiusY: 18, lines: 6, stepX: 29, stepY: 16, wobble: 0.6 },
  ],
};

const mountainHachures = [
  [54, 52], [132, 82], [213, 48], [292, 94], [374, 57], [454, 91], [538, 50], [621, 88], [686, 54],
  [91, 157], [171, 130], [252, 171], [334, 140], [416, 168], [498, 132], [580, 173], [661, 139],
  [52, 251], [135, 218], [216, 259], [299, 226], [381, 255], [463, 220], [546, 260], [628, 224], [694, 254],
];

const freshwaterCandidates: Array<{
  id: FreshwaterVariant;
  number: string;
  title: string;
  description: string;
}> = [
  {
    id: "lake-basin",
    number: "A",
    title: "Insjöbassäng",
    description: "En sluten sjöform med mjuka strandlinjer och omgivande låg terräng.",
  },
  {
    id: "river-valley",
    number: "B",
    title: "Ådal",
    description: "Ett sammanhängande vattendrag genom en tydligt formad dalgång.",
  },
  {
    id: "shoreline",
    number: "C",
    title: "Öppen sjöstrand",
    description: "En avlägsen vattenyta lämnar ett brett strandnära område för artfeatures.",
  },
];

const freshwaterHills: Record<FreshwaterVariant, Hill[]> = {
  "lake-basin": [
    { centerX: 370, centerY: 150, radiusX: 122, radiusY: 65, lines: 5, stepX: 42, stepY: 24, wobble: 2.2 },
  ],
  "river-valley": [
    { centerX: 14, centerY: 154, radiusX: 70, radiusY: 48, lines: 7, stepX: 36, stepY: 22, wobble: 0.8 },
    { centerX: 706, centerY: 145, radiusX: 74, radiusY: 46, lines: 7, stepX: 37, stepY: 22, wobble: 3.8 },
  ],
  shoreline: [
    { centerX: 150, centerY: 148, radiusX: 68, radiusY: 42, lines: 8, stepX: 37, stepY: 21, wobble: 1.5 },
  ],
};

const coastalCandidates: Array<{
  id: CoastalVariant;
  number: string;
  title: string;
  description: string;
}> = [
  {
    id: "rocky-shore",
    number: "A",
    title: "Klippkust",
    description: "En exponerad, ojämn strand där fastare terräng faller tydligt mot vattnet.",
  },
  {
    id: "sheltered-bay",
    number: "B",
    title: "Skyddad havsvik",
    description: "En grund vik som skär in mellan två mjuka, kustnära höjdpartier.",
  },
  {
    id: "low-coast",
    number: "C",
    title: "Flack kustremsa",
    description: "En lång, låg strandzon med lugn topografi och gott om plats för features.",
  },
];

const coastalHills: Record<CoastalVariant, Hill[]> = {
  "rocky-shore": [
    { centerX: 278, centerY: 142, radiusX: 52, radiusY: 34, lines: 9, stepX: 34, stepY: 20, wobble: 2.6 },
  ],
  "sheltered-bay": [
    { centerX: 214, centerY: 24, radiusX: 54, radiusY: 31, lines: 7, stepX: 35, stepY: 19, wobble: 0.8 },
    { centerX: 190, centerY: 284, radiusX: 62, radiusY: 34, lines: 7, stepX: 36, stepY: 20, wobble: 3.9 },
  ],
  "low-coast": [
    { centerX: 36, centerY: 146, radiusX: 88, radiusY: 42, lines: 7, stepX: 49, stepY: 24, wobble: 1.4 },
  ],
};

const fogCandidates: Array<{
  id: FogVariant;
  number: string;
  title: string;
  description: string;
}> = [
  {
    id: "bands",
    number: "A",
    title: "Långa dimbankar",
    description: "Mjuka, utdragna stråk som driver över både terräng och strand.",
  },
  {
    id: "shore-bank",
    number: "B",
    title: "Stranddimma",
    description: "Ett sammanhängande dis som ligger tätast längs den skyddade viken.",
  },
  {
    id: "patches",
    number: "C",
    title: "Spridda dimflak",
    description: "Flera luftiga fält som lämnar större delar av topografin fri.",
  },
];

const forestFeatureCandidates: Array<{
  id: ForestFeatureVariant;
  number: string;
  title: string;
  description: string;
}> = [
  {
    id: "scattered",
    number: "A",
    title: "Spridda barrträd",
    description: "Enstaka, glest placerade tecken ger skogskänsla utan att bilda ett mönsterfält.",
  },
  {
    id: "stands",
    number: "B",
    title: "Små bestånd",
    description: "Träden samlas i tydliga grupper och lämnar öppna partier mellan bestånden.",
  },
  {
    id: "contour-bands",
    number: "C",
    title: "Terrängföljande skog",
    description: "Små trädtecken följer höjdkurvornas riktning i två luftiga band.",
  },
];

function contourPath(
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  wobble: number,
) {
  const points = Array.from({ length: 20 }, (_, index) => {
    const angle = (index / 20) * Math.PI * 2;
    const xWarp = 1 + Math.sin(angle * 3 + wobble) * 0.075 + Math.cos(angle * 2.1 - wobble) * 0.035;
    const yWarp = 1 + Math.cos(angle * 2.4 + wobble) * 0.065 + Math.sin(angle * 4.2) * 0.025;

    return [
      centerX + Math.cos(angle) * radiusX * xWarp,
      centerY + Math.sin(angle) * radiusY * yWarp,
    ];
  });
  const midpoint = (first: number[], second: number[]) => [
    (first[0] + second[0]) / 2,
    (first[1] + second[1]) / 2,
  ];
  const start = midpoint(points.at(-1)!, points[0]);

  return `M ${start[0].toFixed(1)} ${start[1].toFixed(1)} ${points
    .map((point, index) => {
      const end = midpoint(point, points[(index + 1) % points.length]);
      return `Q ${point[0].toFixed(1)} ${point[1].toFixed(1)} ${end[0].toFixed(1)} ${end[1].toFixed(1)}`;
    })
    .join(" ")} Z`;
}

function ParcelLines({ variant, config }: { variant: Variant; config?: TunerConfig }) {
  if (variant === "parcels") {
    return (
      <g>
        <path d="M -12 78 C 105 68, 171 92, 282 74 S 501 61, 732 88" />
        <path d="M 108 -10 C 119 72, 101 154, 124 310" />
        <path d="M 278 -10 C 268 76, 301 147, 286 310" />
        <path d="M 472 -10 C 450 87, 489 177, 462 310" />
        <path d="M -10 206 C 119 184, 219 218, 342 198 S 579 183, 730 214" />
      </g>
    );
  }

  if (variant === "pasture") {
    return (
      <g>
        <path d="M -10 108 C 78 84, 151 121, 232 95 C 322 66, 395 123, 492 93 C 578 66, 648 98, 730 82" />
        <path d="M 66 -10 C 50 61, 94 121, 76 185 C 62 235, 86 269, 104 310" />
        <path d="M 360 -10 C 375 58, 332 112, 354 174 C 377 238, 345 276, 330 310" />
        <path d="M 616 -10 C 592 65, 629 123, 610 181 C 594 231, 628 270, 646 310" />
        <path d="M -10 228 C 89 201, 180 242, 274 216 C 371 188, 445 242, 548 216 C 623 197, 672 211, 730 226" />
      </g>
    );
  }

  const angle = ((config?.propertyAngle ?? defaultTunerConfig.propertyAngle) * Math.PI) / 180;
  const rise = Math.tan(angle) * 720;
  const curve = config?.propertyCurve ?? defaultTunerConfig.propertyCurve;
  const upperStart = 126;
  const lowerStart = 255;
  const parcelLine = (startY: number) => {
    const endY = startY - rise;

    if (curve === 0) {
      return `M -10 ${startY} L 738 ${endY}`;
    }

    return `M -10 ${startY} C 170 ${startY - rise * 0.24 + curve}, 510 ${startY - rise * 0.72 - curve}, 738 ${endY}`;
  };

  return (
    <g>
      <path d={parcelLine(upperStart)} />
      <path d={parcelLine(lowerStart)} />
      <path d="M 250 310 L 250 -10" />
    </g>
  );
}

export function AgriculturalMap({
  variant,
  showGrid,
  config,
}: {
  variant: Variant;
  showGrid: boolean;
  config?: TunerConfig;
}) {
  const mapHills =
    variant === "open" && config
      ? [
          {
            centerX: config.hillX,
            centerY: config.hillY,
            radiusX: config.hillWidth,
            radiusY: config.hillHeight,
            lines: config.contourCount,
            stepX: config.spacingX,
            stepY: config.spacingY,
            wobble: 2.1,
          },
        ]
      : hills[variant];

  return (
    <svg
      aria-label={`Odlingslandskap, variant ${variant}`}
      className="h-full w-full"
      preserveAspectRatio="none"
      role="img"
      viewBox="0 0 720 300"
    >
      <defs>
        <radialGradient id={`paper-${variant}`} cx="68%" cy="38%" r="82%">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.045" />
          <stop offset="0.62" stopColor="var(--accent)" stopOpacity="0.014" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
        <pattern id={`grid-${variant}`} width="36" height="36" patternUnits="userSpaceOnUse">
          <path d="M 36 0 H 0 V 36" fill="none" stroke="var(--text)" strokeOpacity="0.08" strokeWidth="0.55" />
        </pattern>
      </defs>

      <rect width="720" height="300" fill={`url(#paper-${variant})`} />
      {showGrid && <rect width="720" height="300" fill={`url(#grid-${variant})`} />}

      <g fill="none" stroke="var(--accent)" strokeLinecap="round" strokeLinejoin="round">
        {mapHills.flatMap((hill, hillIndex) =>
          Array.from({ length: hill.lines }, (_, index) => (
            <path
              key={`${hillIndex}-${index}`}
              d={contourPath(
                hill.centerX + index * 0.7,
                hill.centerY + Math.sin(index * 0.75) * 2,
                hill.radiusX + index * hill.stepX,
                hill.radiusY + index * hill.stepY,
                hill.wobble + index * 0.38,
              )}
              strokeOpacity={index % 4 === 0 ? 0.26 : 0.15}
              strokeWidth={index % 4 === 0 ? 1.05 : 0.72}
            />
          )),
        )}
      </g>

      <g
        fill="none"
        stroke="var(--secondary)"
        strokeDasharray="7 3 18 2"
        strokeLinecap="round"
        strokeOpacity="0.3"
        strokeWidth="1"
      >
        <ParcelLines variant={variant} config={config} />
      </g>
    </svg>
  );
}

export function ForestMap({ variant, showGrid }: { variant: ForestVariant; showGrid: boolean }) {
  return (
    <svg
      aria-label={`Skogslandskap, variant ${variant}`}
      className="h-full w-full"
      preserveAspectRatio="none"
      role="img"
      viewBox="0 0 720 300"
    >
      <defs>
        <radialGradient id={`forest-paper-${variant}`} cx="58%" cy="44%" r="85%">
          <stop offset="0" stopColor="var(--secondary)" stopOpacity="0.08" />
          <stop offset="0.65" stopColor="var(--secondary)" stopOpacity="0.03" />
          <stop offset="1" stopColor="var(--secondary)" stopOpacity="0.015" />
        </radialGradient>
        <pattern id={`forest-grid-${variant}`} width="36" height="36" patternUnits="userSpaceOnUse">
          <path d="M 36 0 H 0 V 36" fill="none" stroke="var(--text)" strokeOpacity="0.08" strokeWidth="0.55" />
        </pattern>
      </defs>

      <rect width="720" height="300" fill="var(--secondary)" fillOpacity="0.1" />
      <rect width="720" height="300" fill={`url(#forest-paper-${variant})`} />
      {showGrid && <rect width="720" height="300" fill={`url(#forest-grid-${variant})`} />}

      <g fill="none" stroke="var(--accent)" strokeLinecap="round" strokeLinejoin="round">
        {forestHills[variant].flatMap((hill, hillIndex) =>
          Array.from({ length: hill.lines }, (_, index) => (
            <path
              key={`${hillIndex}-${index}`}
              d={contourPath(
                hill.centerX + Math.sin(index * 0.6) * 2,
                hill.centerY + Math.cos(index * 0.7) * 1.5,
                hill.radiusX + index * hill.stepX,
                hill.radiusY + index * hill.stepY,
                hill.wobble + index * 0.42,
              )}
              strokeOpacity={index % 4 === 0 ? 0.5 : 0.3}
              strokeWidth={index % 4 === 0 ? 1.1 : 0.75}
            />
          )),
        )}
      </g>

    </svg>
  );
}

function MarshStripe({ variant, y }: { variant: WetlandVariant; y: number }) {
  if (variant === "fen") {
    return <line x1="0" x2="720" y1={y} y2={y} />;
  }

  if (variant === "marsh-corridor") {
    const position = y / 300;
    const center = 365 + Math.sin(position * Math.PI * 2 - 0.7) * 12;
    const outerHalfWidth = 126 - Math.sin(position * Math.PI) * 41;
    const dashedLength = 30;
    const outerLeft = center - outerHalfWidth;
    const outerRight = center + outerHalfWidth;
    const innerLeft = outerLeft + dashedLength;
    const innerRight = outerRight - dashedLength;

    return (
      <g>
        <line strokeDasharray="6 3" x1={outerLeft} x2={innerLeft} y1={y} y2={y} />
        <line x1={innerLeft} x2={innerRight} y1={y} y2={y} />
        <line strokeDasharray="6 3" x1={innerRight} x2={outerRight} y1={y} y2={y} />
      </g>
    );
  }

  const islands = [
    { centerX: 188, centerY: 112, radiusX: 92, radiusY: 58 },
    { centerX: 544, centerY: 208, radiusX: 102, radiusY: 62 },
  ];
  const gaps = islands
    .flatMap((island) => {
      const verticalDistance = Math.abs(y - island.centerY);

      if (verticalDistance >= island.radiusY) return [];

      const halfWidth =
        island.radiusX * Math.sqrt(1 - (verticalDistance * verticalDistance) / (island.radiusY * island.radiusY));

      return [{ start: island.centerX - halfWidth, end: island.centerX + halfWidth }];
    })
    .sort((first, second) => first.start - second.start);

  if (gaps.length === 0) {
    return <line x1="0" x2="720" y1={y} y2={y} />;
  }

  const pieces: Array<{ x1: number; x2: number; dashed: boolean }> = [];
  let cursor = 0;

  gaps.forEach((gap) => {
    const leftDashStart = Math.max(cursor, gap.start - 42);

    if (leftDashStart > cursor) pieces.push({ x1: cursor, x2: leftDashStart, dashed: false });
    if (gap.start > leftDashStart) pieces.push({ x1: leftDashStart, x2: gap.start, dashed: true });

    const rightDashEnd = Math.min(720, gap.end + 42);
    if (rightDashEnd > gap.end) pieces.push({ x1: gap.end, x2: rightDashEnd, dashed: true });
    cursor = rightDashEnd;
  });

  if (cursor < 720) pieces.push({ x1: cursor, x2: 720, dashed: false });

  return (
    <g>
      {pieces.map((piece, index) => (
        <line
          key={index}
          strokeDasharray={piece.dashed ? "6 3" : undefined}
          x1={piece.x1}
          x2={piece.x2}
          y1={y}
          y2={y}
        />
      ))}
    </g>
  );
}

export function WetlandMap({ variant, showGrid }: { variant: WetlandVariant; showGrid: boolean }) {
  return (
    <svg
      aria-label={`Våtmarkslandskap, variant ${variant}`}
      className="h-full w-full"
      preserveAspectRatio="none"
      role="img"
      viewBox="0 0 720 300"
    >
      <defs>
        <linearGradient id={`wetland-paper-${variant}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="var(--secondary)" stopOpacity="0.025" />
          <stop offset="0.52" stopColor="var(--accent)" stopOpacity="0.055" />
          <stop offset="1" stopColor="var(--secondary)" stopOpacity="0.018" />
        </linearGradient>
        <pattern id={`wetland-grid-${variant}`} width="36" height="36" patternUnits="userSpaceOnUse">
          <path d="M 36 0 H 0 V 36" fill="none" stroke="var(--text)" strokeOpacity="0.08" strokeWidth="0.55" />
        </pattern>
      </defs>

      <rect width="720" height="300" fill={`url(#wetland-paper-${variant})`} />

      <g
        fill="none"
        stroke="var(--secondary)"
        strokeLinecap="round"
        strokeOpacity="0.25"
        strokeWidth="0.75"
      >
        {Array.from({ length: 34 }, (_, index) => (
          <MarshStripe key={index} variant={variant} y={index * 9 + 4.5} />
        ))}
      </g>

      {showGrid && <rect width="720" height="300" fill={`url(#wetland-grid-${variant})`} />}

      <g fill="none" stroke="var(--accent)" strokeLinecap="round" strokeLinejoin="round">
        {wetlandHills[variant].flatMap((hill, hillIndex) =>
          Array.from({ length: hill.lines }, (_, index) => (
            <path
              key={`${hillIndex}-${index}`}
              d={contourPath(
                hill.centerX + Math.sin(index * 0.8) * 1.5,
                hill.centerY + Math.cos(index * 0.55) * 1.5,
                hill.radiusX + index * hill.stepX,
                hill.radiusY + index * hill.stepY,
                hill.wobble + index * 0.36,
              )}
              strokeOpacity={index % 4 === 0 ? 0.25 : 0.14}
              strokeWidth={index % 4 === 0 ? 1 : 0.7}
            />
          )),
        )}
      </g>

    </svg>
  );
}

export function MountainMap({ variant, showGrid }: { variant: MountainVariant; showGrid: boolean }) {
  return (
    <svg
      aria-label={`Fjällandskap, variant ${variant}`}
      className="h-full w-full"
      preserveAspectRatio="none"
      role="img"
      viewBox="0 0 720 300"
    >
      <defs>
        <radialGradient id={`mountain-paper-${variant}`} cx="62%" cy="38%" r="84%">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.055" />
          <stop offset="0.66" stopColor="var(--secondary)" stopOpacity="0.025" />
          <stop offset="1" stopColor="var(--secondary)" stopOpacity="0" />
        </radialGradient>
        <pattern id={`mountain-grid-${variant}`} width="36" height="36" patternUnits="userSpaceOnUse">
          <path d="M 36 0 H 0 V 36" fill="none" stroke="var(--text)" strokeOpacity="0.08" strokeWidth="0.55" />
        </pattern>
      </defs>

      <rect width="720" height="300" fill={`url(#mountain-paper-${variant})`} />
      {showGrid && <rect width="720" height="300" fill={`url(#mountain-grid-${variant})`} />}

      <g fill="none" stroke="var(--accent)" strokeLinecap="round" strokeLinejoin="round">
        {mountainHills[variant].flatMap((hill, hillIndex) =>
          Array.from({ length: hill.lines }, (_, index) => (
            <path
              key={`${hillIndex}-${index}`}
              d={contourPath(
                hill.centerX + Math.sin(index * 0.72) * 2,
                hill.centerY + Math.cos(index * 0.6) * 2,
                hill.radiusX + index * hill.stepX,
                hill.radiusY + index * hill.stepY,
                hill.wobble + index * 0.46,
              )}
              strokeOpacity={index % 5 === 0 ? 0.42 : 0.22}
              strokeWidth={index % 5 === 0 ? 1.15 : 0.72}
            />
          )),
        )}
      </g>

      <g fill="none" stroke="var(--secondary)" strokeLinecap="round" strokeLinejoin="round">
        {mountainHachures.map(([x, y], index) => {
          const inPass = x > 265 && x < 455;
          const visible = variant !== "saddle" || !inPass || index % 5 === 0;

          if (!visible) return null;

          return (
            <g key={index} opacity={index % 4 === 0 ? 0.34 : 0.23} transform={`translate(${x} ${y}) rotate(${index % 2 === 0 ? -12 : 9})`}>
              <path d="M -6 5 L -1 -5 M 0 6 L 5 -3 M 5 5 L 8 0" strokeWidth="0.8" />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export function FreshwaterMap({ variant, showGrid }: { variant: FreshwaterVariant; showGrid: boolean }) {
  const waterShape =
    variant === "lake-basin"
      ? contourPath(370, 150, 148, 78, 1.7)
      : variant === "river-valley"
        ? "M 312 -20 C 272 38, 348 88, 312 145 C 279 199, 344 252, 306 320 L 414 320 C 450 252, 386 201, 420 146 C 455 89, 382 38, 420 -20 Z"
        : "M 558 -20 C 532 42, 571 89, 548 141 C 522 198, 562 250, 542 320 L 740 320 L 740 -20 Z";

  return (
    <svg
      aria-label={`Sjö- och vattendragslandskap, variant ${variant}`}
      className="h-full w-full"
      preserveAspectRatio="none"
      role="img"
      viewBox="0 0 720 300"
    >
      <defs>
        <radialGradient id={`freshwater-paper-${variant}`} cx="58%" cy="42%" r="86%">
          <stop offset="0" stopColor="var(--secondary)" stopOpacity="0.055" />
          <stop offset="0.7" stopColor="var(--accent)" stopOpacity="0.018" />
          <stop offset="1" stopColor="var(--secondary)" stopOpacity="0" />
        </radialGradient>
        <pattern id={`freshwater-grid-${variant}`} width="36" height="36" patternUnits="userSpaceOnUse">
          <path d="M 36 0 H 0 V 36" fill="none" stroke="var(--text)" strokeOpacity="0.08" strokeWidth="0.55" />
        </pattern>
      </defs>

      <rect width="720" height="300" fill={`url(#freshwater-paper-${variant})`} />
      {showGrid && <rect width="720" height="300" fill={`url(#freshwater-grid-${variant})`} />}

      <g fill="none" stroke="var(--accent)" strokeLinecap="round" strokeLinejoin="round">
        {freshwaterHills[variant].flatMap((hill, hillIndex) =>
          Array.from({ length: hill.lines }, (_, index) => (
            <path
              key={`${hillIndex}-${index}`}
              d={contourPath(
                hill.centerX + Math.sin(index * 0.7) * 1.5,
                hill.centerY + Math.cos(index * 0.62) * 1.5,
                hill.radiusX + index * hill.stepX,
                hill.radiusY + index * hill.stepY,
                hill.wobble + index * 0.4,
              )}
              strokeOpacity={index % 4 === 0 ? 0.31 : 0.17}
              strokeWidth={index % 4 === 0 ? 1.05 : 0.72}
            />
          )),
        )}
      </g>

      <path
        d={waterShape}
        fill="var(--secondary)"
        fillOpacity="0.11"
        stroke="var(--secondary)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.52"
        strokeWidth="1.25"
      />
    </svg>
  );
}

export function CoastalMap({ variant, showGrid }: { variant: CoastalVariant; showGrid: boolean }) {
  const waterShape =
    variant === "rocky-shore"
      ? "M 532 -20 C 510 26, 546 56, 516 89 C 489 119, 536 145, 506 178 C 479 210, 527 244, 496 320 L 740 320 L 740 -20 Z"
      : variant === "sheltered-bay"
        ? "M 602 -20 C 591 47, 548 78, 464 91 C 366 106, 330 140, 406 165 C 497 195, 554 229, 570 320 L 740 320 L 740 -20 Z"
        : "M 592 -20 C 584 54, 596 121, 582 189 C 574 235, 588 277, 578 320 L 740 320 L 740 -20 Z";

  return (
    <svg
      aria-label={`Marint kustlandskap, variant ${variant}`}
      className="h-full w-full"
      preserveAspectRatio="none"
      role="img"
      viewBox="0 0 720 300"
    >
      <defs>
        <radialGradient id={`coastal-paper-${variant}`} cx="72%" cy="46%" r="92%">
          <stop offset="0" stopColor="var(--secondary)" stopOpacity="0.065" />
          <stop offset="0.72" stopColor="var(--accent)" stopOpacity="0.018" />
          <stop offset="1" stopColor="var(--secondary)" stopOpacity="0" />
        </radialGradient>
        <pattern id={`coastal-grid-${variant}`} width="36" height="36" patternUnits="userSpaceOnUse">
          <path d="M 36 0 H 0 V 36" fill="none" stroke="var(--text)" strokeOpacity="0.08" strokeWidth="0.55" />
        </pattern>
      </defs>

      <rect width="720" height="300" fill={`url(#coastal-paper-${variant})`} />
      {showGrid && <rect width="720" height="300" fill={`url(#coastal-grid-${variant})`} />}

      <g fill="none" stroke="var(--accent)" strokeLinecap="round" strokeLinejoin="round">
        {coastalHills[variant].flatMap((hill, hillIndex) =>
          Array.from({ length: hill.lines }, (_, index) => (
            <path
              key={`${hillIndex}-${index}`}
              d={contourPath(
                hill.centerX + Math.sin(index * 0.72) * 1.8,
                hill.centerY + Math.cos(index * 0.58) * 1.5,
                hill.radiusX + index * hill.stepX,
                hill.radiusY + index * hill.stepY,
                hill.wobble + index * 0.43,
              )}
              strokeOpacity={index % 4 === 0 ? 0.34 : 0.18}
              strokeWidth={index % 4 === 0 ? 1.05 : 0.72}
            />
          )),
        )}
      </g>

      <path
        d={waterShape}
        fill="var(--secondary)"
        fillOpacity="0.13"
        stroke="var(--secondary)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.58"
        strokeWidth="1.3"
      />
    </svg>
  );
}

export function FogFeaturePreview({ variant, showGrid }: { variant: FogVariant; showGrid: boolean }) {
  return (
    <div className="relative h-full w-full">
      <CoastalMap variant="sheltered-bay" showGrid={showGrid} />
      <svg
        aria-label={`Dimfeature, variant ${variant}`}
        className="pointer-events-none absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        role="img"
        viewBox="0 0 720 300"
      >
        <defs>
          <filter id={`fog-soft-${variant}`} x="-20%" y="-35%" width="140%" height="170%">
            <feGaussianBlur stdDeviation={variant === "bands" ? 10 : 14} />
          </filter>
          <linearGradient id={`fog-fade-${variant}`} x1="0" x2="1">
            <stop offset="0" stopColor="var(--text)" stopOpacity="0" />
            <stop offset="0.2" stopColor="var(--text)" stopOpacity="0.11" />
            <stop offset="0.72" stopColor="var(--text)" stopOpacity="0.14" />
            <stop offset="1" stopColor="var(--text)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {variant === "bands" && (
          <g
            fill="none"
            filter={`url(#fog-soft-${variant})`}
            stroke={`url(#fog-fade-${variant})`}
            strokeLinecap="round"
          >
            <path d="M 34 94 C 178 61, 308 116, 446 89 C 545 70, 626 75, 706 105" strokeWidth="34" />
            <path d="M -18 215 C 129 176, 271 232, 415 205 C 532 183, 617 190, 746 222" strokeWidth="28" />
          </g>
        )}

        {variant === "shore-bank" && (
          <g fill="var(--text)" filter={`url(#fog-soft-${variant})`}>
            <ellipse cx="438" cy="145" rx="168" ry="47" opacity="0.1" />
            <ellipse cx="520" cy="104" rx="142" ry="38" opacity="0.085" />
            <ellipse cx="524" cy="207" rx="176" ry="42" opacity="0.09" />
          </g>
        )}

        {variant === "patches" && (
          <g fill="var(--text)" filter={`url(#fog-soft-${variant})`}>
            <ellipse cx="171" cy="90" rx="112" ry="34" opacity="0.075" />
            <ellipse cx="375" cy="194" rx="134" ry="39" opacity="0.095" />
            <ellipse cx="559" cy="73" rx="105" ry="31" opacity="0.08" />
            <ellipse cx="627" cy="249" rx="125" ry="35" opacity="0.065" />
          </g>
        )}
      </svg>
    </div>
  );
}

export function ForestFeaturePreview({
  variant,
  showGrid,
}: {
  variant: ForestFeatureVariant;
  showGrid: boolean;
}) {
  const scattered = [
    [70, 58], [164, 92], [270, 52], [380, 110], [502, 61], [632, 98],
    [112, 190], [225, 236], [337, 174], [462, 230], [575, 177], [670, 247],
  ];
  const stands = [
    [105, 78], [253, 208], [386, 102], [536, 218], [642, 79],
  ];
  const contourBands = [
    [56, 104], [112, 87], [174, 78], [240, 84], [305, 107], [366, 137], [423, 162],
    [128, 239], [198, 219], [273, 207], [350, 211], [428, 227], [502, 251], [578, 265],
  ];

  function TreeMark({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
    return (
      <g transform={`translate(${x} ${y}) scale(${scale})`}>
        <path d="M 0 -8 L -5 -2 H -2.5 L -6 4 H -1 V 9 M 0 -8 L 5 -2 H 2.5 L 6 4 H 1 V 9" />
      </g>
    );
  }

  return (
    <div className="relative h-full w-full">
      <ForestMap variant="old-growth" showGrid={showGrid} />
      <svg
        aria-label={`Barrskogsfeature, variant ${variant}`}
        className="pointer-events-none absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        role="img"
        viewBox="0 0 720 300"
      >
        <g
          fill="none"
          stroke="var(--secondary)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.48"
          strokeWidth="1"
        >
          {variant === "scattered" &&
            scattered.map(([x, y], index) => (
              <TreeMark key={index} x={x} y={y} scale={index % 3 === 0 ? 1.08 : 0.9} />
            ))}

          {variant === "stands" &&
            stands.map(([x, y], index) => (
              <g key={index} transform={`translate(${x} ${y})`}>
                <TreeMark x={-11} y={3} scale={0.8} />
                <TreeMark x={1} y={-5} scale={1.05} />
                <TreeMark x={13} y={4} scale={0.86} />
              </g>
            ))}

          {variant === "contour-bands" &&
            contourBands.map(([x, y], index) => (
              <TreeMark key={index} x={x} y={y} scale={index % 4 === 0 ? 1 : 0.78} />
            ))}
        </g>
      </svg>
    </div>
  );
}

export default function MapsPage() {
  const [showGrid, setShowGrid] = useState(false);
  const [config, setConfig] = useState<TunerConfig>(defaultTunerConfig);
  const [copyStatus, setCopyStatus] = useState("Kopiera konfiguration");
  const previewRef = useRef<HTMLDivElement>(null);

  function updateConfig(key: keyof TunerConfig, value: number) {
    setConfig((current) => ({ ...current, [key]: value }));
    setCopyStatus("Kopiera konfiguration");
  }

  async function copyConfig() {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify({ baseline: "agricultural", variant: "open", ...config }, null, 2),
      );
      setCopyStatus("Kopierad");
    } catch {
      setCopyStatus("Kunde inte kopiera");
    }
  }

  function exportPreview() {
    const svg = previewRef.current?.querySelector("svg");
    if (!svg) return;
    const source = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "odlingslandskap-kandidat-c.svg";
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportAllMaps() {
    const maps = Array.from(document.querySelectorAll("main svg"));
    const encoder = new TextEncoder();
    const files = maps.map((svg, index) => ({
      name: `tempus-map-${String(index + 1).padStart(2, "0")}.svg`,
      data: encoder.encode(new XMLSerializer().serializeToString(svg)),
    }));
    const url = URL.createObjectURL(createZip(files));
    const link = document.createElement("a");
    link.href = url;
    link.download = "tempus-maps.zip";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto w-full max-w-[1480px] px-4 py-8 sm:px-8">
      <header className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.14em] text-accent">
            Kartlaboratorium · Baslinje 01
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            Odlingslandskap
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
            Tre förslag på kartans grundstruktur. Inga artfeatures eller atmosfäriska effekter är aktiva.
          </p>
        </div>

        <label className="flex w-fit cursor-pointer items-center gap-3 rounded border border-border bg-surface px-3 py-2 font-mono text-xs">
          <input
            checked={showGrid}
            className="accent-accent"
            onChange={(event) => setShowGrid(event.target.checked)}
            type="checkbox"
          />
          Visa rutnät
        </label>
        <button
          className="w-fit rounded border border-accent px-3 py-2 font-mono text-xs text-accent hover:bg-accent hover:text-bg"
          onClick={exportAllMaps}
          type="button"
        >
          Exportera alla SVG
        </button>
      </header>

      <section className="mt-6 grid gap-5 xl:grid-cols-3">
        {candidates.map((candidate) => (
          <article key={candidate.id}>
            <Card className="overflow-hidden p-0 shadow-sm">
              <div className="aspect-[12/7] bg-surface">
                <AgriculturalMap
                  variant={candidate.id}
                  showGrid={showGrid}
                  config={candidate.id === "open" ? config : undefined}
                />
              </div>
              <div className="flex gap-4 border-t border-border p-4">
                <span className="font-display text-2xl text-accent">{candidate.number}</span>
                <div>
                  <h2 className="font-display text-lg font-semibold">{candidate.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-text-muted">{candidate.description}</p>
                </div>
              </div>
            </Card>
          </article>
        ))}
      </section>

      <section className="mt-8 border-t border-border pt-7">
        <div className="mb-4">
          <p className="font-mono text-[10px] uppercase tracking-[.14em] text-accent">
            Finjustering · Kandidat C
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold">Kartjusterare</h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="overflow-hidden p-0 shadow-sm">
            <div ref={previewRef} className="aspect-[12/5] min-h-72 bg-surface">
              <AgriculturalMap variant="open" showGrid={showGrid} config={config} />
            </div>
          </Card>

          <Card className="p-4 shadow-sm">
            <div className="grid gap-4">
              {tunerControls.map((control) => (
                <label key={control.key} className="grid gap-1.5">
                  <span className="flex items-baseline justify-between gap-3 font-mono text-[10px] uppercase tracking-wide text-text-muted">
                    {control.label}
                    <output className="text-text">
                      {config[control.key]}
                      {control.suffix}
                    </output>
                  </span>
                  <input
                    aria-label={control.label}
                    className="w-full accent-accent"
                    max={control.max}
                    min={control.min}
                    onChange={(event) => updateConfig(control.key, Number(event.target.value))}
                    step={control.step}
                    type="range"
                    value={config[control.key]}
                  />
                </label>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 border-t border-border pt-4">
              <button
                className="col-span-2 rounded border border-accent px-3 py-2 font-mono text-xs text-accent hover:bg-accent hover:text-bg"
                onClick={exportPreview}
                type="button"
              >
                Exportera SVG
              </button>
              <button
                className="col-span-2 rounded border border-border px-3 py-2 font-mono text-xs hover:border-border-strong"
                onClick={() => {
                  setConfig((current) => ({
                    ...current,
                    propertyAngle: 0,
                    propertyCurve: 0,
                  }));
                  setCopyStatus("Kopiera konfiguration");
                }}
                type="button"
              >
                Räta ut ägogränser
              </button>
              <button
                className="rounded border border-border px-3 py-2 font-mono text-xs hover:border-border-strong"
                onClick={() => {
                  setConfig(defaultTunerConfig);
                  setCopyStatus("Kopiera konfiguration");
                }}
                type="button"
              >
                Återställ
              </button>
              <button
                className="rounded border border-accent bg-accent px-3 py-2 font-mono text-xs text-bg hover:opacity-90"
                onClick={copyConfig}
                type="button"
              >
                {copyStatus}
              </button>
            </div>
          </Card>
        </div>
      </section>

      <section className="mt-12 border-t border-border pt-8">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.14em] text-accent">
            Kartlaboratorium · Baslinje 02
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">Skog</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
            Tre grundstrukturer för skogsbiotopen. Den tonade marktäckningen är inspirerad av
            Lantmäteriets teckenförklaring men följer vår egen palett.
          </p>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-3">
          {forestCandidates.map((candidate) => (
            <article key={candidate.id}>
              <Card className="overflow-hidden p-0 shadow-sm">
                <div className="aspect-[12/7] bg-surface">
                  <ForestMap variant={candidate.id} showGrid={showGrid} />
                </div>
                <div className="flex gap-4 border-t border-border p-4">
                  <span className="font-display text-2xl text-accent">{candidate.number}</span>
                  <div>
                    <h3 className="font-display text-lg font-semibold">{candidate.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-text-muted">{candidate.description}</p>
                  </div>
                </div>
              </Card>
            </article>
          ))}
        </div>

        <div className="mt-5 flex justify-end font-mono text-[10px] uppercase tracking-wide text-text-faint">
          <a
            className="border-b border-current text-text-muted hover:text-text"
            href="https://www.slu.se/artdatabanken/arter-och-natur/naturtyper/skog/"
            rel="noreferrer"
            target="_blank"
          >
            Referens: SLU Artdatabanken
          </a>
        </div>
      </section>

      <section className="mt-12 border-t border-border pt-8">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.14em] text-accent">
            Kartlaboratorium · Baslinje 03
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">Våtmarker</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
            Tre flacka våtmarksstrukturer med skarpa, horisontella sankmarksränder. Dimma kommer
            i stället att använda stora, mjuka och transparenta fält.
          </p>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-3">
          {wetlandCandidates.map((candidate) => (
            <article key={candidate.id}>
              <Card className="overflow-hidden p-0 shadow-sm">
                <div className="aspect-[12/7] bg-surface">
                  <WetlandMap variant={candidate.id} showGrid={showGrid} />
                </div>
                <div className="flex gap-4 border-t border-border p-4">
                  <span className="font-display text-2xl text-accent">{candidate.number}</span>
                  <div>
                    <h3 className="font-display text-lg font-semibold">{candidate.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-text-muted">{candidate.description}</p>
                  </div>
                </div>
              </Card>
            </article>
          ))}
        </div>

        <div className="mt-5 flex justify-end font-mono text-[10px] uppercase tracking-wide text-text-faint">
          <a
            className="border-b border-current text-text-muted hover:text-text"
            href="https://www.slu.se/artdatabanken/arter-och-natur/naturtyper/vatmarker/"
            rel="noreferrer"
            target="_blank"
          >
            Referens: SLU Artdatabanken
          </a>
        </div>
      </section>

      <section className="mt-12 border-t border-border pt-8">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.14em] text-accent">
            Kartlaboratorium · Baslinje 04
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">Fjäll</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
            Tre högreliefstrukturer med tätare höjdkurvor och ett återhållet retro manér för
            exponerad berggrund. Snöfält, vatten och artspecifika detaljer läggs till senare.
          </p>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-3">
          {mountainCandidates.map((candidate) => (
            <article key={candidate.id}>
              <Card className="overflow-hidden p-0 shadow-sm">
                <div className="aspect-[12/7] bg-surface">
                  <MountainMap variant={candidate.id} showGrid={showGrid} />
                </div>
                <div className="flex gap-4 border-t border-border p-4">
                  <span className="font-display text-2xl text-accent">{candidate.number}</span>
                  <div>
                    <h3 className="font-display text-lg font-semibold">{candidate.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-text-muted">{candidate.description}</p>
                  </div>
                </div>
              </Card>
            </article>
          ))}
        </div>

        <div className="mt-5 flex justify-end font-mono text-[10px] uppercase tracking-wide text-text-faint">
          <a
            className="border-b border-current text-text-muted hover:text-text"
            href="https://www.slu.se/artdatabanken/arter-och-natur/naturtyper/fjall2/"
            rel="noreferrer"
            target="_blank"
          >
            Referens: SLU Artdatabanken
          </a>
        </div>
      </section>

      <section className="mt-12 border-t border-border pt-8">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.14em] text-accent">
            Kartlaboratorium · Baslinje 05
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">Sjöar och vattendrag</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
            Tre sötvattensstrukturer med sammanhängande tonade vattenytor och tydliga strandlinjer.
            Sankmarksrastrering, dimma och artspecifika detaljer är avstängda.
          </p>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-3">
          {freshwaterCandidates.map((candidate) => (
            <article key={candidate.id}>
              <Card className="overflow-hidden p-0 shadow-sm">
                <div className="aspect-[12/7] bg-surface">
                  <FreshwaterMap variant={candidate.id} showGrid={showGrid} />
                </div>
                <div className="flex gap-4 border-t border-border p-4">
                  <span className="font-display text-2xl text-accent">{candidate.number}</span>
                  <div>
                    <h3 className="font-display text-lg font-semibold">{candidate.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-text-muted">{candidate.description}</p>
                  </div>
                </div>
              </Card>
            </article>
          ))}
        </div>

        <div className="mt-5 flex justify-end font-mono text-[10px] uppercase tracking-wide text-text-faint">
          <a
            className="border-b border-current text-text-muted hover:text-text"
            href="https://www.slu.se/artdatabanken/arter-och-natur/naturtyper/sjoar-och-vattendrag2/"
            rel="noreferrer"
            target="_blank"
          >
            Referens: SLU Artdatabanken
          </a>
        </div>
      </section>

      <section className="mt-12 border-t border-border pt-8">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.14em] text-accent">
            Kartlaboratorium · Baslinje 06
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">Marina kustmiljöer</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
            Tre kuststrukturer där vattenytan är sammanhängande och terrängen formar strandlinjen.
            Tång, strandvegetation och andra artspecifika features läggs till senare.
          </p>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-3">
          {coastalCandidates.map((candidate) => (
            <article key={candidate.id}>
              <Card className="overflow-hidden p-0 shadow-sm">
                <div className="aspect-[12/7] bg-surface">
                  <CoastalMap variant={candidate.id} showGrid={showGrid} />
                </div>
                <div className="flex gap-4 border-t border-border p-4">
                  <span className="font-display text-2xl text-accent">{candidate.number}</span>
                  <div>
                    <h3 className="font-display text-lg font-semibold">{candidate.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-text-muted">{candidate.description}</p>
                  </div>
                </div>
              </Card>
            </article>
          ))}
        </div>

        <div className="mt-5 flex justify-end font-mono text-[10px] uppercase tracking-wide text-text-faint">
          <a
            className="border-b border-current text-text-muted hover:text-text"
            href="https://www.slu.se/artdatabanken/arter-och-natur/naturtyper/marina-kustmiljoer2/"
            rel="noreferrer"
            target="_blank"
          >
            Referens: SLU Artdatabanken
          </a>
        </div>
      </section>

      <section className="mt-12 border-t border-border pt-8">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.14em] text-accent">
            Kartlaboratorium · Featurelager 01
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">Fukt → dimma</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
            Tre atmosfäriska behandlingar ovanpå den valda havsviken. Dimman är mjuk och tonad,
            så den kan skiljas tydligt från våtmarkernas skarpa horisontella rastrering.
          </p>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-3">
          {fogCandidates.map((candidate) => (
            <article key={candidate.id}>
              <Card className="overflow-hidden p-0 shadow-sm">
                <div className="aspect-[12/7] bg-surface">
                  <FogFeaturePreview variant={candidate.id} showGrid={showGrid} />
                </div>
                <div className="flex gap-4 border-t border-border p-4">
                  <span className="font-display text-2xl text-accent">{candidate.number}</span>
                  <div>
                    <h3 className="font-display text-lg font-semibold">{candidate.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-text-muted">{candidate.description}</p>
                  </div>
                </div>
              </Card>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12 border-t border-border pt-8">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.14em] text-accent">
            Kartlaboratorium · Featurelager 02
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            Barrskog → trädsymboler
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
            Tre egna, retrokartografiska barrskogsmarkeringar ovanpå den valda skogsterrängen.
            De är features och ingår inte i själva biotopbaslinjen.
          </p>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-3">
          {forestFeatureCandidates.map((candidate) => (
            <article key={candidate.id}>
              <Card className="overflow-hidden p-0 shadow-sm">
                <div className="aspect-[12/7] bg-surface">
                  <ForestFeaturePreview variant={candidate.id} showGrid={showGrid} />
                </div>
                <div className="flex gap-4 border-t border-border p-4">
                  <span className="font-display text-2xl text-accent">{candidate.number}</span>
                  <div>
                    <h3 className="font-display text-lg font-semibold">{candidate.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-text-muted">{candidate.description}</p>
                  </div>
                </div>
              </Card>
            </article>
          ))}
        </div>
      </section>

      <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-wide text-text-faint">
        <span>Välj struktur · justera vald kandidat · lås baslinje</span>
        <a
          className="border-b border-current text-text-muted hover:text-text"
          href="https://www.slu.se/artdatabanken/arter-och-natur/naturtyper/odlingslandskap/"
          rel="noreferrer"
          target="_blank"
        >
          Referens: SLU Artdatabanken
        </a>
      </footer>
    </main>
  );
}

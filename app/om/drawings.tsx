import type { ReactNode } from "react";

const MONO = "var(--font-geist-mono), ui-monospace, monospace";

function Drawing({ children }: { children: ReactNode }) {
  return (
    <div className="relative aspect-[4/3] w-full border border-[#1B252B] bg-[#F4F2EC]">
      <svg
        viewBox="0 0 560 420"
        className="size-full"
        aria-hidden="true"
        fill="none"
        stroke="#1B252B"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round">
        {children}
      </svg>
    </div>
  );
}

function Label({
  x,
  y,
  children,
  anchor,
  ink = "#58636A",
  size = 12,
}: {
  x: number;
  y: number;
  children: ReactNode;
  anchor?: "start" | "middle" | "end";
  ink?: string;
  size?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fill={ink}
      stroke="none"
      fontFamily={MONO}
      fontSize={size}>
      {children}
    </text>
  );
}

export function VersoDrawing() {
  return (
    <Drawing>
      <rect x="70" y="60" width="400" height="260" strokeWidth={4} />
      <path d="M280 60 V220" />
      <path d="M70 220 H190 M230 220 H470" />
      <path d="M190 220 V180 A40 40 0 0 1 230 220" />
      <path d="M70 354 H470 M70 346 V362 M470 346 V362" />
      <path d="M496 60 V320 M488 60 H504 M488 320 H504" />
      <Label x={270} y={378} anchor="middle">
        7,2 m
      </Label>
      <Label x={508} y={196}>
        4,8 m
      </Label>
    </Drawing>
  );
}

export function FluxDrawing() {
  return (
    <Drawing>
      <rect x="50" y="50" width="170" height="100" />
      <rect x="340" y="50" width="170" height="100" />
      <rect x="195" y="250" width="170" height="100" />
      <path d="M50 82 H220 M340 82 H510 M195 282 H365" />
      <path d="M66 106 H150 M66 126 H120 M356 106 H440 M356 126 H410 M211 306 H295 M211 326 H265" />
      <path d="M220 116 H340" />
      <path d="M135 150 V300 H195" />
      <path d="M425 150 V300 H365" />
      {[
        [220, 116],
        [340, 116],
        [135, 150],
        [195, 300],
        [425, 150],
        [365, 300],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={4} fill="#1B252B" />
      ))}
      <Label x={66} y={72} ink="#1B252B">
        Projekt
      </Label>
      <Label x={356} y={72} ink="#1B252B">
        Uppgift
      </Label>
      <Label x={211} y={272} ink="#1B252B">
        Milstolpe
      </Label>
    </Drawing>
  );
}

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

export function TempusDrawing() {
  const step = 460 / 12;
  return (
    <Drawing>
      <path d="M60 340 H520" />
      {Array.from({ length: 13 }).map((_, i) => (
        <path key={i} d={`M${(60 + i * step).toFixed(1)} 340 v7`} />
      ))}
      <path
        d="M60 90 H520 M60 150 H520 M60 210 H520 M60 270 H520"
        strokeOpacity={0.18}
      />
      <path d="M137 90 H271 M213 150 H405 M328 210 H482 M79 270 H175" strokeWidth={10} />
      <path d="M420 50 V340" strokeDasharray="4 5" />
      <Label x={426} y={62}>
        idag
      </Label>
      {MONTHS.map((month, i) => (
        <Label
          key={i}
          x={60 + (i + 0.5) * step}
          y={366}
          anchor="middle"
          size={11}>
          {month}
        </Label>
      ))}
    </Drawing>
  );
}

export function OpusDrawing() {
  return (
    <Drawing>
      <path d="M70 56 h90 M320 56 h100" strokeWidth={4} />
      <path d="M70 90 h170 M70 126 h150 M70 162 h170 M70 198 h120 M70 234 h170 M70 270 h160 M70 306 h140 M70 342 h90" />
      <path d="M320 90 h160 M320 126 h170 M320 162 h130 M320 198 h170 M320 234 h150 M320 270 h170 M320 306 h110 M320 342 h100" />
      <path d="M220 126 H320 M190 198 H320 M230 270 H320" strokeDasharray="2 5" />
      {[
        [220, 126],
        [320, 126],
        [190, 198],
        [320, 198],
        [230, 270],
        [320, 270],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={3.5} fill="#1B252B" />
      ))}
    </Drawing>
  );
}

export function ApsisDrawing() {
  return (
    <Drawing>
      <path d="M110 380 V200 A170 170 0 0 1 450 200 V380" strokeWidth={3} />
      <path d="M134 380 V200 A146 146 0 0 1 426 200 V380" />
      <rect x="250" y="112" width="60" height="24" />
      <path d="M280 200 L400 80" strokeDasharray="4 5" />
      <circle cx="280" cy="200" r={3.5} fill="#1B252B" />
      <Label x={350} y={146}>
        r
      </Label>
      <Label x={280} y={164} anchor="middle" size={11}>
        altare
      </Label>
    </Drawing>
  );
}

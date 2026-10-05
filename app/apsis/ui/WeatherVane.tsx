"use client";

import { useEffect, useRef } from "react";

const SWING = [
  { transform: "scaleX(1)" },
  { transform: "scaleX(-1)" },
  { transform: "scaleX(1)" },
  { transform: "scaleX(-.35)" },
  { transform: "scaleX(1)" },
];

/**
 * The vane on the church spire, drawn like the sign's other figures. It swings
 * for as long as `turning` is set, the way a vane does while the wind shifts,
 * and comes to rest at the end of the swing it is in when `turning` is cleared.
 */
export function WeatherVane({ turning, className = "" }: { turning: boolean; className?: string }) {
  const vane = useRef<SVGGElement>(null);
  const swing = useRef<Animation | null>(null);
  // Not drawn in like the church drawing: the vane's own motion is the swing.
  const ink = { fill: "none", stroke: "currentColor", strokeWidth: 2.6, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  const letter = { fill: "currentColor", stroke: "none", fontSize: 16, textAnchor: "middle" as const };
  const colour = "var(--secondary)";

  useEffect(() => {
    if (turning) {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      swing.current?.cancel();
      swing.current = vane.current?.animate(SWING, { duration: 1100, easing: "cubic-bezier(.35,0,.25,1)", iterations: Infinity }) ?? null;
      return;
    }
    // Let the swing under way run to its end instead of snapping back.
    const effect = swing.current?.effect;
    if (effect) effect.updateTiming({ iterations: (effect.getComputedTiming().currentIteration ?? 0) + 1 });
  }, [turning]);

  return (
    <svg
      viewBox="120 8 220 304"
      role="img"
      aria-label="Ritning av en vindflöjel på en kyrkspira."
      className={`font-body text-text ${className}`}
      // Small enough to stand beside the title on a phone, and growing with
      // the width up to the size it has beside the title on a wide screen.
      style={{ height: "clamp(6rem, 17vw, 12rem)" }}
    >
      <defs>
        <pattern id="apsis-vane-tiles" width="7" height="7" patternUnits="userSpaceOnUse">
          <path d="M0 0v7" stroke="currentColor" strokeWidth="1.1" />
        </pattern>
        <pattern id="apsis-vane-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0v6" stroke={colour} strokeWidth="1.4" />
        </pattern>
      </defs>

      {/* The slender top of the spire, with its bands. */}
      <path d="M208 312l22-116 22 116" {...ink} fill="url(#apsis-vane-tiles)" />
      <path d="M222.400 236h15.200M216.700 266h26.600" {...ink} />
      {/* The pole with its two balls and the cross on top. */}
      <path d="M230 196V44" {...ink} />
      <circle cx="230" cy="186" r="11" {...ink} fill="var(--bg)" />
      <circle cx="230" cy="152" r="5" {...ink} fill="var(--bg)" />
      <path d="M230 44V16M221 25h18" {...ink} />
      {/* The fixed arms that name the directions, on wrought scrolls. */}
      <path d="M196 124h68" {...ink} />
      <path d="M230 148c-16-1-24-10-20-20M230 148c16-1 24-10 20-20" {...ink} strokeWidth={1.2} />
      <text x="185" y="130" {...letter}>V</text>
      <text x="276" y="130" {...letter}>Ö</text>

      {/* The vane itself turns about the pole. */}
      <g ref={vane} style={{ transformBox: "view-box", transformOrigin: "230px 82px" }}>
        <path d="M156 82h162" {...ink} />
        <path d="M138 82l22-10-5 10 5 10z" {...ink} fill="currentColor" />
        <path d="M244 64h76l-13 18 13 18h-76z" {...ink} stroke={colour} fill="url(#apsis-vane-hatch)" />
        <circle cx="230" cy="82" r="4" {...ink} fill="var(--bg)" />
      </g>
    </svg>
  );
}

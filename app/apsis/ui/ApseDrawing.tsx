/**
 * The drawing an old sign outside a church always has: a Romanesque church
 * seen from the south and, under it, its plan, with the parts named and the
 * apse picked out in colour. West is to the left, as on a map. Without an
 * apse the choir ends in a straight wall and only a dashed outline shows where
 * the apse would have stood.
 */
export function ApseDrawing({ withApse = true, className = "" }: { withApse?: boolean; className?: string }) {
  const line = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  // Solid lines are drawn in when the sign appears (see apsis-ink in
  // globals.css); the dashed ones keep their own dashes and are left as they are.
  const ink = { ...line, pathLength: 1, className: "apsis-ink" };
  const thin = { ...line, strokeWidth: 1 };
  const wall = { ...ink, strokeWidth: 7, strokeLinejoin: "miter" as const, strokeLinecap: "butt" as const };
  const label = { fill: "currentColor", stroke: "none", fontSize: 15, fontStyle: "italic" as const, textAnchor: "middle" as const };
  const apse = "var(--secondary)";
  const missing = { ...thin, stroke: apse, strokeWidth: 1.5, strokeDasharray: "4 4" };

  return (
    <svg
      viewBox="0 0 460 400"
      role="img"
      aria-label={withApse
        ? "Ritning av en romansk kyrka från söder och i plan: torn i väster, sedan långhus, kor och absid i öster."
        : "Ritning av en kyrka från söder och i plan: torn i väster, sedan långhus och kor. Koret slutar i en rak vägg, och absiden saknas."}
      className={`font-body text-text ${className}`}
    >
      <defs>
        <pattern id="apsis-tiles" width="7" height="7" patternUnits="userSpaceOnUse">
          <path d="M0 0v7" stroke="currentColor" strokeWidth="1.1" />
        </pattern>
        <pattern id="apsis-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0v6" stroke={apse} strokeWidth="1.4" />
        </pattern>
      </defs>

      {/* From the south. */}
      <path d="M12 212h436" {...ink} />
      {/* Tower */}
      <path d="M40 212V70h70v142" {...ink} />
      <path d="M34 70l41-46 41 46z" {...ink} fill="url(#apsis-tiles)" />
      <path d="M75 24V8M69 14h12" {...ink} />
      <path d="M66 112V96a9 9 0 0 1 18 0v16z" {...ink} />
      <path d="M75 96v16" {...thin} />
      <path d="M70 160v-12a5 5 0 0 1 10 0v12z" {...thin} />
      {/* Nave */}
      <path d="M110 212v-76h180v76" {...ink} />
      <path d="M106 136l5-42h178l5 42z" {...ink} fill="url(#apsis-tiles)" />
      <path d="M140 178v-18a7 7 0 0 1 14 0v18z" {...ink} />
      <path d="M246 178v-18a7 7 0 0 1 14 0v18z" {...ink} />
      <path d="M186 212v-34a14 14 0 0 1 28 0v34" {...ink} />
      <path d="M192 212v-33a8 8 0 0 1 16 0v33" {...thin} />
      {/* Choir */}
      <path d="M290 156h70v56" {...ink} />
      <path d="M290 156l3-32h64l5 32" {...ink} fill="url(#apsis-tiles)" />
      <path d="M318 190v-14a6 6 0 0 1 12 0v14z" {...ink} />
      {/* Apse, or the outline of the one that is not there. */}
      {withApse ? (
        <>
          <path d="M360 176h40v36h-40z" {...ink} stroke={apse} fill="url(#apsis-hatch)" />
          <path d="M360 146q30 8 44 30h-44z" {...ink} stroke={apse} />
          <path d="M376 200v-10a4 4 0 0 1 8 0v10z" {...ink} stroke={apse} fill="var(--bg)" />
        </>
      ) : (
        <path d="M360 176h40v36M360 146q30 8 44 30" {...missing} />
      )}

      <text x="16" y="232" {...label} fontStyle="normal">V</text>
      <text x="444" y="232" {...label} fontStyle="normal">Ö</text>

      {/* In plan. */}
      <path d="M110 300H43.500v70H110" {...wall} />
      <path d="M110 300v-14h180v14M110 370v14h180v-14" {...wall} />
      <path d="M290 300h70M290 370h70" {...wall} />
      <path d="M110 318v34M290 318v34" {...thin} strokeDasharray="3 4" />
      {withApse ? (
        <>
          <path d="M360 304a31 31 0 0 1 0 62" {...wall} stroke={apse} />
          <path d="M360 318v34" {...thin} strokeDasharray="3 4" />
        </>
      ) : (
        <>
          <path d="M360 296.5v77" {...wall} />
          <path d="M366 304a31 31 0 0 1 0 62" {...missing} />
        </>
      )}
      {/* The altar, before the apse. */}
      <path d="M340 326h10v18h-10z" {...ink} />

      <text x="75" y="340" {...label}>Torn</text>
      <text x="200" y="340" {...label}>Långhus</text>
      <text x="318" y="296" {...label} dy="-12">Kor</text>
      <text x="422" y="340" {...label} fill={apse} fontWeight="700">{withApse ? "Absid" : "Saknas"}</text>
    </svg>
  );
}

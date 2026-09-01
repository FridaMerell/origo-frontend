import type { CSSProperties, ReactElement } from "react"

export type SplashTenant = "verso" | "flux" | "apsis" | "tempus"

type TenantConfig = {
  wordmark: string
  caption: string
  sizeClass: string
  weightClass: string
  trackingClass: string
  captionClass: string
  uppercase?: boolean
  wordmarkAnimation?: string
}

const EASE = "var(--ease-standard, cubic-bezier(.4,0,.2,1))"
// WebKit can hold back streamed loading UI until it has received 1 KB of HTML.
// Keep the fallback large enough to be painted immediately on mobile Safari.
const STREAM_BUFFER = "\u00a0".repeat(1024)

const CONFIG: Record<SplashTenant, TenantConfig> = {
  verso: {
    wordmark: "Verso",
    caption: "Läser in planeringen …",
    sizeClass: "text-[2.5rem]",
    weightClass: "font-semibold",
    trackingClass: "tracking-tight",
    captionClass: "text-text-faint",
    wordmarkAnimation: `splash-wordmark-pulse 2.2s ${EASE} infinite`,
  },
  flux: {
    wordmark: "Flux",
    caption: "Loading workspace",
    sizeClass: "text-[2.25rem]",
    weightClass: "font-bold",
    trackingClass: "tracking-wide",
    captionClass: "text-text-faint",
    uppercase: true,
    wordmarkAnimation: `splash-wordmark-bob 1.1s ${EASE} infinite`,
  },
  apsis: {
    wordmark: "Apsis",
    caption: "Loading records …",
    sizeClass: "text-[2.25rem]",
    weightClass: "font-semibold",
    trackingClass: "tracking-normal",
    captionClass: "text-text-faint",
  },
  tempus: {
    wordmark: "Tempus",
    caption: "Charting the route …",
    sizeClass: "text-[2.5rem]",
    weightClass: "font-medium",
    trackingClass: "tracking-normal",
    captionClass: "text-text-muted",
  },
}

function VersoSpinner() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      aria-hidden
      style={{ animation: "splash-spin 1.6s cubic-bezier(.4,0,.2,1) infinite" }}
    >
      <circle cx="32" cy="32" r="26" fill="none" stroke="var(--accent-wash)" strokeWidth="5" />
      <circle
        cx="32"
        cy="32"
        r="26"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="18 82"
        pathLength={100}
        style={{
          transformOrigin: "32px 32px",
          animation: "splash-verso-breathe 1.6s cubic-bezier(.4,0,.2,1) infinite",
        }}
      />
    </svg>
  )
}

function FluxSpinner() {
  const dots = 8
  return (
    <div aria-hidden className="relative size-16">
      {Array.from({ length: dots }).map((_, index) => (
        <span
          key={index}
          className="absolute left-1/2 top-1/2"
          style={{
            marginLeft: -4,
            marginTop: -4,
            transformOrigin: "4px 4px",
            transform: `rotate(${(360 / dots) * index}deg) translate(28px)`,
          }}
        >
          <span
            className="block size-2 rounded-sm bg-accent"
            style={{
              animation: "splash-flux-dot .9s linear infinite",
              animationDelay: `${(index * (0.9 / dots)).toFixed(3)}s`,
            }}
          />
        </span>
      ))}
    </div>
  )
}

function ApsisSpinner() {
  const ticks = 12
  return (
    <div aria-hidden className="relative size-16">
      {Array.from({ length: ticks }).map((_, index) => (
        <span
          key={index}
          className="absolute left-1/2 top-1/2 bg-accent"
          style={{
            width: 3,
            height: 12,
            marginLeft: -1.5,
            borderRadius: "var(--radius-sm)",
            transformOrigin: "1.5px 32px",
            transform: `rotate(${30 * index}deg) translateY(-32px)`,
            animation: "splash-apsis-tick 1.2s steps(1) infinite",
            animationDelay: `${(index * (1.2 / ticks)).toFixed(3)}s`,
          }}
        />
      ))}
    </div>
  )
}

function TempusSpinner() {
  return (
    <div
      aria-hidden
      className="relative flex size-16 items-center justify-center rounded-full"
      style={{ border: "2px dashed var(--contour, var(--border-strong))" }}
    >
      <div
        style={{
          width: 3,
          height: 26,
          background: "var(--accent)",
          borderRadius: 2,
          transformOrigin: "bottom center",
          position: "absolute",
          bottom: 32,
          animation: "splash-tempus-needle 2.4s cubic-bezier(.3,.6,.3,1) infinite",
        }}
      />
      <div className="size-1.5 rounded-full bg-accent" />
    </div>
  )
}

const SPINNERS: Record<SplashTenant, () => ReactElement> = {
  verso: VersoSpinner,
  flux: FluxSpinner,
  apsis: ApsisSpinner,
  tempus: TempusSpinner,
}

export function Splash({ tenant }: { tenant: SplashTenant }) {
  const config = CONFIG[tenant]
  const Spinner = SPINNERS[tenant]

  const wordmarkStyle: CSSProperties = {
    fontFamily: "var(--font-display)",
    ...(config.wordmarkAnimation ? { animation: config.wordmarkAnimation } : {}),
  }

  return (
    <div
      data-splash
      role="status"
      aria-live="polite"
      className="relative flex min-h-screen min-h-dvh w-full flex-col items-center justify-center gap-6 bg-bg font-body"
    >
      <div
        className={`text-text ${config.sizeClass} ${config.weightClass} ${config.trackingClass} ${
          config.uppercase ? "uppercase" : ""
        }`}
        style={wordmarkStyle}
      >
        {config.wordmark}
      </div>
      <Spinner />
      <span hidden aria-hidden>{STREAM_BUFFER}</span>
      <p className={`absolute inset-x-0 bottom-14 text-center text-sm ${config.captionClass}`}>
        {config.caption}
      </p>
    </div>
  )
}

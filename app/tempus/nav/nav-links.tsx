export const primaryLinks = [
  { href: "/", label: "Översikt", icon: "home" },
  { href: "/rutt", label: "Rutt", icon: "route" },
  { href: "/checklistor", label: "Checklistor", icon: "list-checks" },
  { href: "/observationer", label: "Observationer", icon: "binoculars" },
  { href: "/birdnet", label: "Birdnet", icon: "bird" },
  { href: "/taxa", label: "Taxonomier", icon: "leaf" },
] as const

export const mainLinks = primaryLinks.filter((link) =>
  link.href === "/checklistor" || link.href === "/observationer" || link.href === "/birdnet",
)

export const moreLinks = primaryLinks.filter((link) =>
  link.href === "/rutt" || link.href === "/taxa",
)

export const isActiveLink = (pathname: string, href: string) =>
  href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)

type FieldIconName = (typeof primaryLinks)[number]["icon"] | "folio"

export function FieldIcon({ name, className = "" }: { name: FieldIconName; className?: string }) {
  const line = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "square" as const,
    strokeLinejoin: "miter" as const,
    strokeWidth: 1.25,
  }

  return (
    <svg aria-hidden="true" className={`size-6 [shape-rendering:geometricPrecision] ${className}`} viewBox="0 0 24 24">
      {name === "home" ? (
        <>
          <path {...line} d="m4.3 5.7 5.9-1.8 5.6 1.9 4.1-1.4v14.1l-4.1 1.4-5.6-1.9-5.9 1.8Z" />
          <path {...line} d="m10.2 3.9.1 14.1m5.5-12.2.1 14.2M6 8.9c1.2-.7 2.1-.8 3.1-.6m-3.2 3.1c1.3-.7 2.2-.8 3.2-.6m3.1-2.1c1.2-.4 2.1-.2 2.9.3m2.6-1.1 1.1-.4m-1.1 3.1 1.1-.4" />
        </>
      ) : name === "route" ? (
        <>
          <path {...line} strokeDasharray="2 1.45" d="M4.7 18.4c2.4-5.9 4.4-10.7 7.5-10.7 2.6 0 2.6 3.6 6 3.6" />
          <circle {...line} cx="4.7" cy="18.4" r="1.6" />
          <path {...line} d="M17 9.1h2.5v2.5H17zM12 3.2l.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7Z" />
        </>
      ) : name === "list-checks" ? (
        <>
          <path {...line} d="M4.5 4.3h15v15.4h-15Z" />
          <path {...line} d="M8.5 8h7.8M8.5 12h7.8M8.5 16h5.1M6.1 7.1v1.8M6.1 11.1v1.8M6.1 15.1v1.8" />
          <path fill="currentColor" d="M5.55 6.55h1.1v.9h-1.1zm0 4h1.1v.9h-1.1zm0 4h1.1v.9h-1.1z" />
        </>
      ) : name === "binoculars" ? (
        <>
          <path {...line} d="M5.1 6.2h5.2l1.7 3 1.7-3h5.2l1.2 10.3H3.9Z" />
          <circle {...line} cx="7.1" cy="15.5" r="3.2" />
          <circle {...line} cx="16.9" cy="15.5" r="3.2" />
          <path {...line} d="M10.3 8.6h3.4m-2.5 3.7h1.6" />
        </>
      ) : name === "bird" ? (
        <>
          <path {...line} d="M5.1 14.7c1.2-3.2 3.6-5.1 7-5.4 1.6-.1 3 .3 4.2 1.1l1.6-1 .8 1.3-1.2.7c.2.5.3 1.1.3 1.7 0 2.7-2.2 4.9-5 4.9-1.7 0-3.1-.7-4.1-1.9l-2.3 1.2-1-1.8 1.7-1c-.2-.6-.2-1.2 0-1.8Z" />
          <circle {...line} cx="14.7" cy="11" r=".55" />
          <path {...line} d="M10.7 15.6h-2m6.9 1.7 1.3 1.4" />
        </>
      ) : name === "folio" ? (
        <>
          <path {...line} d="M4.2 5.5c2.8-.7 5.3-.2 7.8 1.4 2.5-1.6 5-2.1 7.8-1.4v13c-2.8-.7-5.3-.2-7.8 1.4-2.5-1.6-5-2.1-7.8-1.4Z" />
          <path {...line} d="M12 6.9v13m-5-10.5h2.5M7 12h2.5m5 0H17m-2.5 2.6H17m-9.5 2.6h2.5" />
        </>
      ) : (
        <>
          <path {...line} d="M12 20.5V5.4M12 12.4C9.7 8.4 7.4 7.1 5.1 6.5c.1 3.4 1.4 5.8 4.3 7.1M12 15.4c2.6-4.1 4.8-5.3 6.9-5.6-.4 3-1.8 5-4.6 6.2" />
          <path {...line} d="m6.6 17.9 2.2-1.5m8.6.6-2.1-1.6M8 9.2l1.7 1M16.3 12l-1.8 1.1" />
        </>
      )}
    </svg>
  )
}

import Link from "next/link"

const items = [
  { href: "/docs/tempus", label: "Observationer" },
  { href: "/docs/tempus/arter", label: "Arter" },
  { href: "/docs/tempus/checklistor", label: "Checklistor" },
]

export function TempusDocsNav({ current }: { current: string }) {
  return (
    <nav aria-label="Tempus API-avsnitt" className="mb-10 flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.href === current ? "page" : undefined}
          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
            item.href === current
              ? "border-[#1B252B] bg-[#1B252B] text-white"
              : "border-[#1B252B]/30 hover:border-[#1B252B]"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}

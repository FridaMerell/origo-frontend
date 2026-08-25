const PALETTE = ["#C9702F", "#0E7C86", "#D9A404", "#2F9E56", "#D6483F", "#5C7E8C"];

function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function Avatar({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <span
      title={name}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-body font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(9, size * 0.4),
        background: colorFor(name),
      }}
    >
      {initials(name)}
    </span>
  );
}

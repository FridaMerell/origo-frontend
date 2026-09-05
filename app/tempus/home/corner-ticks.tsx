export function CornerTicks() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 text-text-faint">
      <span className="absolute -left-px -top-px size-2 border-l border-t border-current" />
      <span className="absolute -right-px -top-px size-2 border-r border-t border-current" />
      <span className="absolute -bottom-px -left-px size-2 border-b border-l border-current" />
      <span className="absolute -bottom-px -right-px size-2 border-b border-r border-current" />
    </span>
  )
}

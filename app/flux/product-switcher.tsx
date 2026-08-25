"use client";

import { useState } from "react";
import { Icon } from "@/app/components/ui/Icon";

const PRODUCTS = [
  { id: "flux", name: "Flux" },
  { id: "verso", name: "Verso" },
] as const;

function otherTenantHref(tenantId: string) {
  if (typeof window === "undefined") return "#";
  const { hostname, protocol, port } = window.location;
  const parts = hostname.split(".");
  parts[0] = tenantId;
  return `${protocol}//${parts.join(".")}${port ? `:${port}` : ""}/`;
}

export function ProductSwitcher() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed right-4 top-4 z-40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text shadow-md"
      >
        <span className="size-2 rounded-sm bg-accent" />
        Flux
        <Icon name="chevron-down" size={14} className="text-text-faint" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-10 mt-1.5 w-36 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg">
            {PRODUCTS.map((product) => (
              <a
                key={product.id}
                href={otherTenantHref(product.id)}
                className={`flex items-center gap-2 px-3 py-2 text-sm no-underline ${
                  product.id === "flux" ? "bg-surface-2 text-text" : "text-text-muted hover:bg-surface-2"
                }`}
              >
                <span className="size-1.5 rounded-full bg-accent" />
                {product.name}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

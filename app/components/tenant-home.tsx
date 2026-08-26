"use client";

import { logout } from "@/app/actions/auth";
import { useUser } from "@/app/lib/user-context";

export function TenantHome({ tenantName }: { tenantName: string }) {
  const user = useUser();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-16 py-32">
      <h1 className="tenant-heading font-display text-3xl font-semibold text-text">
        {tenantName}
      </h1>
      {user && (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-text-muted">
            Signed in as {String(user.username ?? user.email ?? "user")}
          </span>
          <button
            type="button"
            onClick={async () => {
              await logout();
              window.location.href = "/login";
            }}
            className="text-text underline"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

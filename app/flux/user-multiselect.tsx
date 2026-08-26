"use client";

import { Avatar } from "@/app/components/ui/Avatar";
import { formatUserName } from "@/app/lib/user-context";
import type { FluxUser } from "@/app/lib/dal";

export function UserMultiSelect({
  name,
  users,
  defaultSelected,
}: {
  name: string;
  users: FluxUser[];
  defaultSelected: number[];
}) {
  return (
    <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded border border-border bg-bg p-2">
      <input type="hidden" name={`${name}_field`} value="1" />
      {users.length === 0 && <span className="px-1 py-1 text-sm text-text-faint">Inga användare hittades.</span>}
      {users.map((user) => (
        <label
          key={user.id}
          className="flex items-center gap-2 rounded px-1 py-1 text-sm text-text hover:bg-surface-2"
        >
          <input
            type="checkbox"
            name={name}
            value={user.id}
            defaultChecked={defaultSelected.includes(user.id)}
            className="accent-accent"
          />
          <Avatar name={formatUserName(user)} size={20} />
          {formatUserName(user)}
        </label>
      ))}
    </div>
  );
}

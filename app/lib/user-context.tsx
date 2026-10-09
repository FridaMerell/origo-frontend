"use client";

import { createContext, useContext } from "react";
import type { FluxUser, User } from "@/app/lib/dal";
import { formatUserName } from "@/app/lib/format-user-name";

type UserContextValue = {
  user: User | null;
  users: FluxUser[];
};

const UserContext = createContext<UserContextValue>({ user: null, users: [] });

export function UserProvider({ user, users, children }: { user: User | null; users: FluxUser[]; children: React.ReactNode }) {
  return <UserContext.Provider value={{ user, users }}>{children}</UserContext.Provider>;
}

export function useUser() { return useContext(UserContext).user; }

export function useUsers() {
  const { user, users } = useContext(UserContext);
  if (!user || users.some((candidate) => candidate.id === user.id)) return users;
  return [user, ...users];
}

export { formatUserName };

export function getUserLabel(users: FluxUser[], id: string | number | null | undefined): string {
  if (id === null || id === undefined) return "Okänd";
  const user = users.find((u) => String(u.id) === String(id));
  if (!user) return "Okänd";
  return formatUserName(user);
}

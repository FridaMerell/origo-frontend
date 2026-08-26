"use client";

import { createContext, useContext } from "react";
import type { FluxUser, User } from "@/app/lib/dal";

type UserContextValue = {
  user: User | null;
  users: FluxUser[];
};

const UserContext = createContext<UserContextValue>({ user: null, users: [] });

export function UserProvider({
  user,
  users,
  children,
}: {
  user: User | null;
  users: FluxUser[];
  children: React.ReactNode;
}) {
  return <UserContext.Provider value={{ user, users }}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext).user;
}

export function useUsers() {
  return useContext(UserContext).users;
}

export function formatUserName(user: { first_name?: string; last_name?: string; username: string }): string {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return fullName || user.username;
}

export function getUserLabel(users: FluxUser[], id: string | number | null | undefined): string {
  if (id === null || id === undefined) return "Okänd";
  const user = users.find((u) => String(u.id) === String(id));
  if (!user) return "Okänd";
  return formatUserName(user);
}

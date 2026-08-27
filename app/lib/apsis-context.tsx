"use client";

import { createContext, useContext } from "react";
import type { ApsisPost, FluxUser } from "@/app/lib/dal";
import { formatUserName } from "@/app/lib/user-context";

type ApsisDataContextValue = {
  posts: ApsisPost[];
  usersById: Map<number, FluxUser>;
};

const ApsisDataContext = createContext<ApsisDataContextValue>({
  posts: [],
  usersById: new Map(),
});

export function ApsisDataProvider({
  posts,
  users,
  children,
}: {
  posts: ApsisPost[];
  users: FluxUser[];
  children: React.ReactNode;
}) {
  const usersById = new Map(users.map((user) => [user.id, user]));

  return (
    <ApsisDataContext.Provider value={{ posts, usersById }}>
      {children}
    </ApsisDataContext.Provider>
  );
}

export function useApsisPosts() {
  return useContext(ApsisDataContext).posts;
}

export function useApsisUsers() {
  return useContext(ApsisDataContext).usersById;
}

export function apsisAuthorName(users: Map<number, FluxUser>, id: number | null): string | null {
  if (id === null) return null;
  const user = users.get(id);
  return user ? formatUserName(user) : null;
}

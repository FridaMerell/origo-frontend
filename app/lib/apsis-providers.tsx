import type { ReactNode } from "react";
import { getApsisPosts, getFluxUsers } from "@/app/lib/dal";
import { ApsisDataProvider } from "@/app/lib/apsis-context";

export async function ApsisProviders({ children }: { children: ReactNode }) {
  const posts = [...(await getApsisPosts())].sort(
    (a, b) => b.created_at.localeCompare(a.created_at),
  );

  const authorIds = [...new Set(posts.map((post) => post.author).filter((id): id is number => id !== null))];
  const users = await getFluxUsers(authorIds);

  return (
    <ApsisDataProvider posts={posts} users={users}>
      {children}
    </ApsisDataProvider>
  );
}

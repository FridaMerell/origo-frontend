import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getApsisPlace } from "@/app/actions/apsis";
import { getApsisPost } from "@/app/lib/dal";
import PostView from "./post-view";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const post = await getApsisPost(id);
  return {
    title: `${post?.name || "Okänd kyrka"} | Apsis`,
    description: "En kyrkoabsid ur samlingen.",
  };
}

export default async function ApsisPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getApsisPost(id);
  if (!post) notFound();
  const place = post.svenska_kyrkan_place_id ? await getApsisPlace(post.svenska_kyrkan_place_id) : null;
  return <PostView post={post} place={place} />;
}

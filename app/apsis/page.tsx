import type { Metadata } from "next";
import { getApsisPlaceSummaries } from "@/app/actions/apsis";
import { getApsisPosts } from "@/app/lib/dal";
import HomeView from "./home-view";

export const metadata: Metadata = {
  title: "Absider | Apsis",
  description: "En bildsamling av kyrkoabsider.",
};

export default async function ApsisPage() {
  const posts = await getApsisPosts();
  // What Svenska kyrkan says about each connected church, keyed by place ID.
  const places = await getApsisPlaceSummaries(posts.map((post) => post.svenska_kyrkan_place_id));
  return <HomeView places={places} />;
}

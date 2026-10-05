import type { Metadata } from "next";
import { getApsisPlaceSummaries } from "@/app/actions/apsis";
import { getApsisPosts } from "@/app/lib/dal";
import SlumpaView from "./slumpa-view";

export const metadata: Metadata = {
  title: "Slumpa | Apsis",
  description: "Slumpa fram en kyrkoabsid ur samlingen.",
};

export default async function SlumpaPage() {
  const posts = await getApsisPosts();
  // What Svenska kyrkan says about each connected church, keyed by place ID.
  const places = await getApsisPlaceSummaries(posts.map((post) => post.svenska_kyrkan_place_id));
  return <SlumpaView places={places} />;
}

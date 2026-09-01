import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { FACILITY_COOKIE } from "@/app/lib/config";
import { getFacilities } from "@/app/lib/dal";
import BesokView from "./besok-view";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}): Promise<Metadata> {
  const facilities = await getFacilities();
  const cookieStore = await cookies();
  const selectedId = cookieStore.get(FACILITY_COOKIE)?.value;
  const selectedFacility =
    facilities.find((facility) => String(facility.id) === selectedId) ?? facilities[0] ?? null;

  const today = new Date();
  const params = await searchParams;
  const year = params.y ? Number(params.y) : today.getFullYear();
  const month = params.m ? Number(params.m) - 1 : today.getMonth();
  const monthLabel = new Date(year, month, 1).toLocaleDateString("sv-SE", {
    month: "long",
    year: "numeric",
  });

  return {
    title: selectedFacility ? `Besök – ${monthLabel} – ${selectedFacility.name} | Verso` : "Besök | Verso",
    description: selectedFacility
      ? `Bokningar för ${selectedFacility.name}, ${monthLabel}`
      : "Bokningar och besök",
  };
}

export default function BesokPage() {
  return (
    <Suspense>
      <BesokView />
    </Suspense>
  );
}

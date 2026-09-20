import type { Metadata } from "next";
import { Suspense } from "react";
import { getSelectedFacility } from "@/app/lib/selected-facility";
import { formatMonthYear } from "@/app/lib/formatters";
import BesokView from "./besok-view";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}): Promise<Metadata> {
  const [selectedFacility, params] = await Promise.all([getSelectedFacility(), searchParams]);

  const today = new Date();
  const year = params.y ? Number(params.y) : today.getFullYear();
  const month = params.m ? Number(params.m) - 1 : today.getMonth();
  const monthLabel = formatMonthYear(new Date(year, month, 1));

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

import type { Metadata } from "next";
import { Suspense } from "react";
import { getSelectedFacility } from "@/app/lib/selected-facility";
import { formatMonthYear } from "@/app/lib/formatters";
import { getBookings } from "@/app/lib/dal/verso";
import { buildMonthCells } from "./calendar";
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

export default async function BesokPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const [selectedFacility, params] = await Promise.all([getSelectedFacility(), searchParams]);

  const today = new Date();
  const year = params.y ? Number(params.y) : today.getFullYear();
  const month = params.m ? Number(params.m) - 1 : today.getMonth();

  // The grid also shows days from the neighbouring months, so fetch what it covers.
  const cells = buildMonthCells(year, month);
  const from = cells[0].date.toLocaleDateString("sv-SE");
  const to = cells[cells.length - 1].date.toLocaleDateString("sv-SE");
  const bookings = selectedFacility ? await getBookings(selectedFacility.id, from, to) : [];

  return (
    <Suspense>
      <BesokView bookings={bookings} />
    </Suspense>
  );
}

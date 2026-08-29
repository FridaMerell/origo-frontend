"use client";

import Image from "next/image";
import { logout } from "@/app/actions/auth";
import { useUser } from "@/app/lib/user-context";

export default function RootHome() {
  const user = useUser();

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <h1 className="text-3xl font-display">Origo</h1>
    </div>
  );
}

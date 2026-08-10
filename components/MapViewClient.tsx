"use client";

import dynamic from "next/dynamic";
import type { Stop } from "@/lib/types";

const MapView = dynamic(
  () => import("./MapView").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-moss-100 bg-moss-50 h-[320px] flex items-center justify-center text-ink/40 text-sm">
        Loading map…
      </div>
    ),
  }
);

export function MapViewClient(props: { stops: Stop[] }) {
  return <MapView {...props} />;
}

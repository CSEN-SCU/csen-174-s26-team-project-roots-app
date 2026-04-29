"use client";

import { useRoots } from "@/lib/store";
import type { ReactNode } from "react";

interface Props {
  schedule: ReactNode;
  calendar: ReactNode;
}

export function ActiveTabRouter({ schedule, calendar }: Props) {
  const { activeTab } = useRoots();
  return (
    <>
      {activeTab === "schedule" && schedule}
      {activeTab === "calendar" && calendar}
    </>
  );
}

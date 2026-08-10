"use client";

import { useRoots } from "@/lib/store";
import type { ReactNode } from "react";

interface Props {
  today: ReactNode;
  calendar: ReactNode;
  group: ReactNode;
  roadmaps: ReactNode;
}

export function ActiveTabRouter({ today, calendar, group, roadmaps }: Props) {
  const { activeTab } = useRoots();
  return (
    <>
      {activeTab === "today" && today}
      {activeTab === "calendar" && calendar}
      {activeTab === "group" && group}
      {activeTab === "roadmaps" && roadmaps}
    </>
  );
}

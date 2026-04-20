"use client";

import { Logo } from "./Logo";
import { useRoots, type TabName } from "@/lib/store";

const TAB_OPTIONS: { label: string; id: TabName }[] = [
  { label: "Today", id: "today" },
  { label: "Roadmaps", id: "roadmaps" },
  { label: "Group", id: "group" },
  { label: "Calendar", id: "calendar" },
];

export function TopBar() {
  const { members, activeUserId, activeTab, setActiveTab } = useRoots();
  const me = members.find((m) => m.id === activeUserId);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-clay-50/70 border-b border-moss-100/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <Logo />
        <nav className="hidden md:flex items-center gap-1 text-sm text-ink/65">
          {TAB_OPTIONS.map((n) => (
            <button
              key={n.id}
              onClick={() => setActiveTab(n.id)}
              className={`px-3 py-1.5 rounded-full transition ${
                activeTab === n.id
                  ? "bg-moss-100 text-moss-700 font-medium"
                  : "hover:text-ink"
              }`}
            >
              {n.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <button className="text-xs text-ink/55 hidden sm:inline-flex items-center gap-1 rounded-full border border-moss-100 bg-white/80 px-3 py-1.5 hover:bg-white">
            ⌘K · Quick capture
          </button>
          <div
            className={`w-9 h-9 rounded-full ${me?.color ?? "bg-ink"} text-white text-xs font-semibold flex items-center justify-center border-2 border-white shadow-soft`}
            title={me?.name}
          >
            {me?.initials}
          </div>
        </div>
      </div>
    </header>
  );
}

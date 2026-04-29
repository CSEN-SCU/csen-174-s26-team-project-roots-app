"use client";

import { Logo } from "./Logo";
import { useRoots, type TabName } from "@/lib/store";

const TABS: { label: string; id: TabName }[] = [
  { label: "Schedule", id: "schedule" },
  { label: "Calendar", id: "calendar" },
];

export function TopBar() {
  const { activeTab, setActiveTab } = useRoots();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-clay-50/70 border-b border-moss-100/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-1 text-sm text-ink/65">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-1.5 rounded-full transition ${
                activeTab === t.id
                  ? "bg-moss-100 text-moss-700 font-medium"
                  : "hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="w-9 h-9 rounded-full bg-moss-500 text-white text-xs font-semibold flex items-center justify-center border-2 border-white shadow-soft">
          R
        </div>
      </div>
    </header>
  );
}

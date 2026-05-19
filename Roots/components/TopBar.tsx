"use client";

import { Logo } from "./Logo";
import { useRoots, type TabName } from "@/lib/store";

const TABS: { label: string; id: TabName }[] = [
  { label: "Schedule", id: "schedule" },
  { label: "Calendar", id: "calendar" },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function TopBar({ onLogout }: { onLogout: () => void }) {
  const { activeTab, setActiveTab, userName } = useRoots();
  const initials = getInitials(userName || "?");

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
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-full bg-moss-500 text-white text-xs font-semibold flex items-center justify-center border-2 border-white shadow-soft"
            title={userName}
          >
            {initials}
          </div>
          <button
            onClick={onLogout}
            className="text-xs text-ink/45 hover:text-ink transition px-2 py-1 rounded-lg hover:bg-moss-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

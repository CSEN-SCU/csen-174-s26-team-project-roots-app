"use client";

import { useRoots } from "@/lib/store";
import { InspirationInput } from "./InspirationInput";
import { RoadmapView } from "./RoadmapView";

const PLATFORM_ICON: Record<string, string> = {
  instagram: "IG",
  tiktok: "TT",
  youtube: "YT",
  upload: "UP",
};

const THUMBNAIL_BG: Record<string, string> = {
  "moss-400": "linear-gradient(135deg,#5E9A55,#234820)",
  "clay-300": "linear-gradient(135deg,#D9B47E,#7E5424)",
};
function thumbBg(hue: string) {
  return THUMBNAIL_BG[hue] ?? "linear-gradient(135deg,#C28F4E,#3D7A36)";
}

export function ScheduleView() {
  const { reels, selectedReelId, selectReel } = useRoots();

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <InspirationInput />

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {reels.map((reel) => {
          const selected = reel.id === selectedReelId;
          return (
            <button
              key={reel.id}
              onClick={() => selectReel(reel.id)}
              className={`shrink-0 w-44 rounded-2xl p-3 text-left transition border-2 ${
                selected
                  ? "border-moss-500 bg-moss-50 shadow-soft"
                  : "border-transparent bg-white/70 hover:bg-white hover:border-moss-200"
              }`}
            >
              <div
                className="w-full h-14 rounded-xl mb-2.5 flex items-start p-2"
                style={{ background: thumbBg(reel.thumbnailHue) }}
              >
                <span className="text-[10px] text-white/70 uppercase tracking-wide font-semibold">
                  {PLATFORM_ICON[reel.platform] ?? "—"}
                </span>
              </div>
              <div className="text-xs font-semibold text-ink line-clamp-2 leading-snug">
                {reel.roadmap.title}
              </div>
              <div className="text-[10px] text-ink/45 mt-0.5 truncate">{reel.creator}</div>
            </button>
          );
        })}
      </div>

      <RoadmapView />
    </main>
  );
}

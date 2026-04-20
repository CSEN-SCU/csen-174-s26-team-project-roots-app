"use client";

import { InspirationInput } from "./InspirationInput";
import { RoadmapView } from "./RoadmapView";
import { GerardbotChat } from "./GerardbotChat";
import { CalendarPeek } from "./CalendarPeek";

export function TodayView() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <section className="grid lg:grid-cols-[1fr_auto] items-end gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-moss-600 font-semibold">
            Sunday, April 19
          </p>
          <h1 className="font-display text-4xl sm:text-5xl text-ink leading-[1.05] mt-1">
            Good morning, Roland.{" "}
            <span className="italic text-moss-600">
              3 reels are ready to become plans.
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-ink/50">
          <span className="rounded-full bg-moss-50 border border-moss-100 px-2.5 py-1 text-moss-700">
            ⛅ 64°F · partly cloudy
          </span>
          <span className="rounded-full bg-clay-50 border border-clay-100 px-2.5 py-1 text-clay-600">
            🌱 Streak: 4 plans → done
          </span>
        </div>
      </section>

      <InspirationInput />
      <RoadmapView />

      <section className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <GerardbotChat />
        <CalendarPeek />
      </section>

      <footer className="text-center text-[11px] text-ink/35 py-6">
        Roots prototype · v0.1 · turning doom-saved reels into rooted plans
      </footer>
    </main>
  );
}

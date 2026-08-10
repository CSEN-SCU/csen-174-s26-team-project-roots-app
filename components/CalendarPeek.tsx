"use client";

import { useRoots } from "@/lib/store";

function fmt(iso: string) {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
    date: d.getDate(),
    time: d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

export function CalendarPeek() {
  const { calendar } = useRoots();
  const sorted = [...calendar].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  );

  return (
    <section className="glass rounded-3xl p-5 shadow-soft">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss-600">
            Your Calendar
          </p>
          <h3 className="font-display text-xl text-ink leading-tight mt-0.5">
            Reels turned into reality
          </h3>
        </div>
        <span className="text-[11px] text-ink/45">{sorted.length} scheduled</span>
      </div>

      {sorted.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-moss-200 bg-moss-50/40 p-6 text-center text-sm text-ink/55">
          Nothing scheduled yet. Tap{" "}
          <span className="text-moss-700 font-medium">Add to calendar</span> on
          any roadmap, or let the group's 50% Filter do it for you.
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {sorted.map((e) => {
            const f = fmt(e.startsAt);
            return (
              <li
                key={e.id}
                className="flex gap-3 items-center rounded-2xl border border-moss-100 bg-white/80 p-3 animate-slideUp"
              >
                <div className="text-center bg-moss-50 rounded-xl px-3 py-1.5 w-14">
                  <div className="text-[10px] font-semibold text-moss-700">
                    {f.day}
                  </div>
                  <div className="font-display text-xl leading-none text-ink">
                    {f.date}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink truncate">
                    {e.title}
                  </div>
                  <div className="text-[11px] text-ink/55">
                    {f.time} ·{" "}
                    <span
                      className={
                        e.source === "group"
                          ? "text-clay-600"
                          : "text-moss-600"
                      }
                    >
                      {e.source === "group" ? "Group plan" : "Solo plan"}
                    </span>
                  </div>
                  {e.flags && e.flags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {e.flags.map((flag, i) => (
                        <span
                          key={i}
                          className="text-[10px] bg-clay-50 border border-clay-200 text-clay-600 rounded-full px-2 py-0.5"
                        >
                          ⚠️ {flag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className={e.flags && e.flags.length > 0 ? "text-clay-400 text-lg" : "text-moss-500 text-lg"}>
                  {e.flags && e.flags.length > 0 ? "⚠️" : "✓"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

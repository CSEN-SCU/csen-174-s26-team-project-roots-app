"use client";

import { useState } from "react";
import { useRoots } from "@/lib/store";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CalendarView() {
  const { calendar } = useRoots();
  const today = new Date("2026-04-20");
  const [viewDate, setViewDate] = useState(new Date("2026-04-01"));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Build grid cells
  const cells: Array<{ date: Date; isCurrentMonth: boolean }> = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: new Date(year, month + 1, cells.length - daysInMonth - firstDay + 1), isCurrentMonth: false });
  }

  function dateKey(d: Date) {
    return d.toISOString().slice(0, 10);
  }

  const eventsByDate = calendar.reduce<Record<string, typeof calendar>>((acc, evt) => {
    const k = new Date(evt.startsAt).toISOString().slice(0, 10);
    if (!acc[k]) acc[k] = [];
    acc[k].push(evt);
    return acc;
  }, {});

  const todayKey = dateKey(today);
  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : [];

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-3xl text-ink">
          {MONTHS[month]} {year}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="rounded-xl border border-moss-100 bg-white px-3 py-1.5 text-sm hover:bg-moss-50"
          >
            ‹ Prev
          </button>
          <button
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="rounded-xl border border-moss-100 bg-white px-3 py-1.5 text-sm hover:bg-moss-50"
          >
            Next ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-5 items-start">
        {/* Calendar grid */}
        <div className="glass rounded-3xl overflow-hidden shadow-soft">
          <div className="grid grid-cols-7 border-b border-moss-100">
            {DAYS.map((d) => (
              <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-ink/45">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((cell, idx) => {
              const key = dateKey(cell.date);
              const events = eventsByDate[key] ?? [];
              const isToday = key === todayKey;
              const isSelected = key === selectedDate;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(key === selectedDate ? null : key)}
                  className={`min-h-[80px] p-2 text-left border-b border-r border-moss-50 transition-colors relative
                    ${!cell.isCurrentMonth ? "bg-moss-50/30 text-ink/25" : "hover:bg-moss-50/60"}
                    ${isSelected ? "bg-moss-100/60" : ""}
                  `}
                >
                  <span
                    className={`text-sm font-medium inline-flex w-6 h-6 items-center justify-center rounded-full
                      ${isToday ? "bg-moss-500 text-white" : ""}
                    `}
                  >
                    {cell.date.getDate()}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {events.slice(0, 2).map((e) => (
                      <div
                        key={e.id}
                        className={`text-[10px] rounded px-1 py-0.5 truncate font-medium leading-tight
                          ${e.flags && e.flags.length > 0
                            ? "bg-clay-100 text-clay-700"
                            : e.source === "group" ? "bg-clay-100 text-clay-700" : "bg-moss-100 text-moss-700"}
                        `}
                      >
                        {e.flags && e.flags.length > 0 ? "⚠️ " : ""}{e.title}
                      </div>
                    ))}
                    {events.length > 2 && (
                      <div className="text-[10px] text-ink/40">+{events.length - 2} more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Day detail panel */}
        <div className="glass rounded-3xl p-5 shadow-soft">
          {selectedDate ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss-600">
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              {selectedEvents.length === 0 ? (
                <p className="text-sm text-ink/45 mt-4">Nothing scheduled.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {selectedEvents.map((e) => (
                    <li key={e.id} className={`rounded-2xl border p-3 ${e.flags && e.flags.length > 0 ? "border-clay-200 bg-clay-50/60" : "border-moss-100 bg-white/80"}`}>
                      <div className="text-sm font-semibold text-ink">{e.title}</div>
                      <div className="text-[11px] text-ink/55 mt-0.5">
                        {formatTime(e.startsAt)} ·{" "}
                        <span className={e.source === "group" ? "text-clay-600" : "text-moss-600"}>
                          {e.source === "group" ? "Group plan" : "Solo plan"}
                        </span>
                      </div>
                      {e.flags && e.flags.length > 0 && (
                        <div className="mt-2 flex flex-col gap-1">
                          {e.flags.map((flag, i) => (
                            <span key={i} className="text-[11px] text-clay-600 bg-clay-100 border border-clay-200 rounded-lg px-2 py-1">
                              ⚠️ {flag}
                            </span>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss-600">
                Upcoming
              </p>
              {calendar.length === 0 ? (
                <p className="text-sm text-ink/45 mt-4">
                  No events yet. Add plans from the Today tab.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {[...calendar]
                    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
                    .map((e) => {
                      const d = new Date(e.startsAt);
                      return (
                        <li key={e.id} className={`rounded-2xl border p-3 ${e.flags && e.flags.length > 0 ? "border-clay-200 bg-clay-50/60" : "border-moss-100 bg-white/80"}`}>
                          <div className="text-sm font-semibold text-ink">{e.title}</div>
                          <div className="text-[11px] text-ink/55 mt-0.5">
                            {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · {formatTime(e.startsAt)}
                          </div>
                          <div className={`text-[10px] mt-1 font-medium ${e.source === "group" ? "text-clay-600" : "text-moss-600"}`}>
                            {e.source === "group" ? "Group plan" : "Solo plan"}
                          </div>
                          {e.flags && e.flags.length > 0 && (
                            <div className="mt-1.5 flex flex-col gap-1">
                              {e.flags.map((flag, i) => (
                                <span key={i} className="text-[10px] text-clay-600">⚠️ {flag}</span>
                              ))}
                            </div>
                          )}
                        </li>
                      );
                    })}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

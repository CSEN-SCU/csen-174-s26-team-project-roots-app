"use client";

import { useEffect, useRef, useState } from "react";
import { useRoots } from "@/lib/store";

type ViewMode = "day" | "week" | "month";

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7 AM – 9 PM
const HOUR_H = 56; // px per hour row
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getWeekStart(d: Date): Date {
  const c = new Date(d);
  c.setDate(c.getDate() - c.getDay());
  c.setHours(0, 0, 0, 0);
  return c;
}

function localDateKey(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function isoDateKey(iso: string): string {
  return localDateKey(new Date(iso));
}

function isoHour(iso: string): number {
  return new Date(iso).getHours();
}

function makeISO(key: string, hour: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, hour, 0, 0).toISOString();
}

function fmtHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function CalendarView() {
  const { calendar, pendingSchedule, scheduleReel, setPendingSchedule } = useRoots();
  const today = new Date();
  const todayKey = localDateKey(today);

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today));
  const [dayDate, setDayDate] = useState(today);
  const [monthDate, setMonthDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [hoverSlot, setHoverSlot] = useState<{ key: string; hour: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to 8 AM on first render
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: HOUR_H, behavior: "instant" as ScrollBehavior });
  }, []);

  // When placement starts: jump to the suggested date and switch to week view
  useEffect(() => {
    if (!pendingSchedule) return;
    const d = new Date(pendingSchedule.suggestedDate);
    setWeekStart(getWeekStart(d));
    setDayDate(d);
    setMonthDate(new Date(d.getFullYear(), d.getMonth(), 1));
    if (viewMode === "month") setViewMode("week");
    const sugH = isoHour(pendingSchedule.suggestedDate);
    const scrollTop = Math.max(0, (sugH - 7 - 1)) * HOUR_H;
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollTop, behavior: "smooth" }), 80);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSchedule]);

  const placing = !!pendingSchedule;
  const sugKey = pendingSchedule ? isoDateKey(pendingSchedule.suggestedDate) : null;
  const sugHour = pendingSchedule ? isoHour(pendingSchedule.suggestedDate) : null;

  const eventsByDate = calendar.reduce<Record<string, typeof calendar>>((acc, evt) => {
    const k = isoDateKey(evt.startsAt);
    (acc[k] ??= []).push(evt);
    return acc;
  }, {});

  function handlePlaceSlot(key: string, hour: number) {
    if (!pendingSchedule) return;
    scheduleReel(pendingSchedule.reelId, makeISO(key, hour));
    setPendingSchedule(null);
    setSelectedDate(key);
  }

  // ── Navigation label & prev/next handlers ──────────────────────────────
  let navLabel = "";
  let handlePrev: () => void;
  let handleNext: () => void;

  if (viewMode === "week") {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    navLabel =
      weekStart.getMonth() === weekEnd.getMonth()
        ? `${MONTHS_SHORT[weekStart.getMonth()]} ${weekStart.getDate()}–${weekEnd.getDate()}, ${weekStart.getFullYear()}`
        : `${MONTHS_SHORT[weekStart.getMonth()]} ${weekStart.getDate()} – ${MONTHS_SHORT[weekEnd.getMonth()]} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
    handlePrev = () => setWeekStart((s) => { const c = new Date(s); c.setDate(c.getDate() - 7); return c; });
    handleNext = () => setWeekStart((s) => { const c = new Date(s); c.setDate(c.getDate() + 7); return c; });
  } else if (viewMode === "day") {
    navLabel = dayDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    handlePrev = () => setDayDate((d) => { const c = new Date(d); c.setDate(c.getDate() - 1); return c; });
    handleNext = () => setDayDate((d) => { const c = new Date(d); c.setDate(c.getDate() + 1); return c; });
  } else {
    navLabel = `${MONTHS_LONG[monthDate.getMonth()]} ${monthDate.getFullYear()}`;
    handlePrev = () => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    handleNext = () => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  // ── Time grid renderer (shared by week + day) ───────────────────────────
  const renderTimeGrid = (dayKeys: string[]) => (
    <div className="glass rounded-3xl overflow-hidden shadow-soft">
      {/* Sticky day-header row */}
      <div className="flex border-b border-moss-100 bg-white/90 backdrop-blur-md sticky top-0 z-10">
        <div className="w-16 shrink-0 py-2 px-2" />
        {dayKeys.map((key) => {
          const d = new Date(key + "T12:00:00");
          const isToday = key === todayKey;
          return (
            <div key={key} className={`flex-1 py-2 text-center border-l border-moss-100 ${isToday ? "bg-moss-50" : ""}`}>
              <div className={`text-[11px] font-semibold uppercase tracking-wider ${isToday ? "text-moss-600" : "text-ink/40"}`}>
                {DAY_NAMES[d.getDay()]}
              </div>
              <div className={`text-lg font-display leading-none mt-0.5 ${isToday ? "text-moss-600" : "text-ink"}`}>
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable body */}
      <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: 540 }}>
        <div className="flex" style={{ height: HOURS.length * HOUR_H }}>
          {/* Time labels */}
          <div className="w-16 shrink-0 relative">
            {HOURS.map((h, i) => (
              <div
                key={h}
                className="absolute right-2 text-[10px] text-ink/35 flex items-start justify-end pt-1"
                style={{ top: i * HOUR_H, height: HOUR_H, width: 56 }}
              >
                {fmtHour(h)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {dayKeys.map((key) => {
            const dayEvts = eventsByDate[key] ?? [];
            const isSugDay = sugKey === key;

            return (
              <div key={key} className="flex-1 relative border-l border-moss-100" style={{ height: HOURS.length * HOUR_H }}>
                {/* Hour-slot click targets + horizontal lines */}
                {HOURS.map((h, i) => {
                  const isHover = hoverSlot?.key === key && hoverSlot.hour === h;
                  return (
                    <div
                      key={h}
                      className={[
                        "absolute w-full border-b border-moss-50 transition-colors",
                        placing ? "cursor-pointer" : "",
                        isHover ? "bg-moss-100/50" : (placing ? "hover:bg-moss-50/60" : ""),
                      ].join(" ")}
                      style={{ top: i * HOUR_H, height: HOUR_H }}
                      onClick={() => placing && handlePlaceSlot(key, h)}
                      onMouseEnter={() => placing && setHoverSlot({ key, hour: h })}
                      onMouseLeave={() => placing && setHoverSlot(null)}
                    />
                  );
                })}

                {/* Suggested placement ghost */}
                {placing && isSugDay && sugHour !== null && HOURS.includes(sugHour) && (
                  <div
                    className="absolute left-0.5 right-0.5 rounded-lg border-2 border-dashed border-moss-500 bg-moss-100 px-2 py-1 pointer-events-none z-20"
                    style={{ top: (sugHour - 7) * HOUR_H + 2, height: HOUR_H - 4 }}
                  >
                    <div className="text-[10px] font-semibold text-moss-700 truncate">★ {pendingSchedule!.title}</div>
                    <div className="text-[9px] text-moss-600 mt-0.5">{fmtHour(sugHour)} · suggested</div>
                  </div>
                )}

                {/* Hover ghost (different from suggested) */}
                {placing && hoverSlot?.key === key && hoverSlot.hour !== sugHour && HOURS.includes(hoverSlot.hour) && (
                  <div
                    className="absolute left-0.5 right-0.5 rounded-lg border border-moss-400 bg-moss-200/70 px-2 py-1 pointer-events-none z-20"
                    style={{ top: (hoverSlot.hour - 7) * HOUR_H + 2, height: HOUR_H - 4 }}
                  >
                    <div className="text-[10px] font-semibold text-moss-800 truncate">+ {pendingSchedule!.title}</div>
                    <div className="text-[9px] text-moss-700 mt-0.5">{fmtHour(hoverSlot.hour)}</div>
                  </div>
                )}

                {/* Real events */}
                {dayEvts.map((evt) => {
                  const h = isoHour(evt.startsAt);
                  if (!HOURS.includes(h)) return null;
                  return (
                    <div
                      key={evt.id}
                      className="absolute left-0.5 right-0.5 rounded-lg bg-moss-500 px-2 py-1 z-10"
                      style={{ top: (h - 7) * HOUR_H + 2, height: HOUR_H - 4 }}
                    >
                      <div className="text-[10px] font-semibold text-white truncate">{evt.title}</div>
                      <div className="text-[9px] text-white/70 mt-0.5">{fmtTime(evt.startsAt)}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ── Month view ──────────────────────────────────────────────────────────
  const renderMonthView = () => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: Array<{ date: Date; isCurrentMonth: boolean }> = [];
    for (let i = firstDay - 1; i >= 0; i--)
      cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), isCurrentMonth: false });
    for (let d = 1; d <= daysInMonth; d++)
      cells.push({ date: new Date(year, month, d), isCurrentMonth: true });
    while (cells.length % 7 !== 0)
      cells.push({ date: new Date(year, month + 1, cells.length - daysInMonth - firstDay + 1), isCurrentMonth: false });

    return (
      <div className="grid grid-cols-[1fr_280px] gap-5 items-start">
        <div className="glass rounded-3xl overflow-hidden shadow-soft">
          <div className="grid grid-cols-7 border-b border-moss-100">
            {DAY_NAMES.map((d) => (
              <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-ink/45">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((cell, idx) => {
              const key = localDateKey(cell.date);
              const events = eventsByDate[key] ?? [];
              const isToday = key === todayKey;
              const isSelected = key === selectedDate;
              const isSug = placing && key === sugKey;
              const isHovered = placing && key === hoverSlot?.key && cell.isCurrentMonth;
              return (
                <button
                  key={idx}
                  disabled={!cell.isCurrentMonth}
                  onClick={() => {
                    if (!cell.isCurrentMonth) return;
                    if (placing) handlePlaceSlot(key, 12);
                    else setSelectedDate(key === selectedDate ? null : key);
                  }}
                  onMouseEnter={() => placing && cell.isCurrentMonth && setHoverSlot({ key, hour: 12 })}
                  onMouseLeave={() => placing && setHoverSlot(null)}
                  className={[
                    "min-h-[80px] p-2 text-left border-b border-r border-moss-50 transition-colors",
                    !cell.isCurrentMonth ? "bg-moss-50/30 text-ink/25 cursor-default" : "cursor-pointer",
                    isSelected && !placing ? "bg-moss-100/60" : "",
                    isSug ? "ring-2 ring-inset ring-dashed ring-moss-400 bg-moss-100/60" : "",
                    isHovered && !isSug ? "bg-moss-50" : "",
                    placing && cell.isCurrentMonth && !isSug ? "hover:bg-moss-50/50" : "",
                    !placing && cell.isCurrentMonth ? "hover:bg-moss-50/60" : "",
                  ].join(" ")}
                >
                  <span className={`text-sm font-medium inline-flex w-6 h-6 items-center justify-center rounded-full ${isToday ? "bg-moss-500 text-white" : ""}`}>
                    {cell.date.getDate()}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {isSug && (
                      <div className="text-[10px] rounded px-1 py-0.5 truncate font-medium bg-moss-200 text-moss-700 border border-dashed border-moss-400">
                        ★ {pendingSchedule!.title}
                      </div>
                    )}
                    {isHovered && !isSug && (
                      <div className="text-[10px] rounded px-1 py-0.5 truncate font-medium bg-moss-200 text-moss-800 border border-dashed border-moss-400">
                        + {pendingSchedule!.title}
                      </div>
                    )}
                    {events.slice(0, 2).map((e) => (
                      <div key={e.id} className="text-[10px] rounded px-1 py-0.5 truncate font-medium bg-moss-100 text-moss-700">{e.title}</div>
                    ))}
                    {events.length > 2 && <div className="text-[10px] text-ink/40">+{events.length - 2} more</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="glass rounded-3xl p-5 shadow-soft">
          {placing ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss-600">Placing</p>
              <p className="font-display text-xl text-ink mt-1 leading-snug">{pendingSchedule.title}</p>
              <p className="text-sm text-ink/55 mt-3">
                Suggested: <span className="text-moss-700 font-medium">
                  {new Date(pendingSchedule.suggestedDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </span>
              </p>
              <p className="text-xs text-ink/45 mt-2">Click any day to confirm placement.</p>
            </>
          ) : selectedDate ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss-600">
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>
              {(eventsByDate[selectedDate] ?? []).length === 0 ? (
                <p className="text-sm text-ink/45 mt-4">Nothing scheduled.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {(eventsByDate[selectedDate] ?? []).map((e) => (
                    <li key={e.id} className="rounded-2xl border border-moss-100 bg-white/80 p-3">
                      <div className="text-sm font-semibold text-ink">{e.title}</div>
                      <div className="text-[11px] text-ink/55 mt-0.5">{fmtTime(e.startsAt)} · <span className="text-moss-600">Solo</span></div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss-600">Upcoming</p>
              {calendar.length === 0 ? (
                <p className="text-sm text-ink/45 mt-4">No events yet. Add plans from the Schedule tab.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {[...calendar].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()).map((e) => (
                    <li key={e.id} className="rounded-2xl border border-moss-100 bg-white/80 p-3">
                      <div className="text-sm font-semibold text-ink">{e.title}</div>
                      <div className="text-[11px] text-ink/55 mt-0.5">
                        {new Date(e.startsAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · {fmtTime(e.startsAt)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  // Build keys for the current week
  const weekDayKeys = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return localDateKey(d);
  });

  const currentDayKey = localDateKey(dayDate);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      {/* Placement banner */}
      {placing && (
        <div className="rounded-2xl bg-moss-500 text-white px-5 py-3 flex items-center justify-between gap-4 animate-slideUp">
          <div className="flex items-center gap-3">
            <span className="text-lg">📅</span>
            <div>
              <div className="font-medium text-sm">Placing &ldquo;{pendingSchedule.title}&rdquo;</div>
              <div className="text-xs text-white/70 mt-0.5">
                {viewMode === "month"
                  ? "Click a day to schedule. Suggested day is highlighted."
                  : "Click a time slot to place it. Scroll to move across the day."}
              </div>
            </div>
          </div>
          <button onClick={() => setPendingSchedule(null)} className="text-white/70 hover:text-white text-xs border border-white/30 rounded-full px-3 py-1">
            Cancel
          </button>
        </div>
      )}

      {/* Navigation row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button onClick={handlePrev} className="rounded-xl border border-moss-100 bg-white w-8 h-8 flex items-center justify-center text-sm hover:bg-moss-50">‹</button>
          <span className="font-display text-xl text-ink min-w-[200px] text-center">{navLabel}</span>
          <button onClick={handleNext} className="rounded-xl border border-moss-100 bg-white w-8 h-8 flex items-center justify-center text-sm hover:bg-moss-50">›</button>
        </div>

        {/* View toggle */}
        <div className="flex rounded-xl border border-moss-100 overflow-hidden bg-white text-sm">
          {(["day", "week", "month"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              className={`px-4 py-1.5 capitalize transition ${viewMode === v ? "bg-moss-100 text-moss-700 font-medium" : "text-ink/55 hover:bg-moss-50"}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* View content */}
      {viewMode === "week" && renderTimeGrid(weekDayKeys)}
      {viewMode === "day" && renderTimeGrid([currentDayKey])}
      {viewMode === "month" && renderMonthView()}
    </main>
  );
}

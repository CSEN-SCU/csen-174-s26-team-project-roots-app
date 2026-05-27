"use client";

import { useEffect, useRef, useState } from "react";
import { useRoots } from "@/lib/store";
import type { CalendarEvent } from "@/lib/store";
import type { Reel } from "@/lib/types";
import { InlinePlanEditor } from "./PlanEditorParts";

type ViewMode = "day" | "week" | "month";

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 12 AM – 11 PM
const HOUR_H = 56; // px per hour row
const PX_PER_MIN = HOUR_H / 60;
const DEFAULT_STOP_MIN = 30; // assumed dwell time per route stop when not specified
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ── Segment types ───────────────────────────────────────────────────────────
type Segment = { label: string; durationMin: number; isTravel: boolean };

function getEventSegments(reelId: string | undefined, reels: Reel[], fallbackTitle: string): Segment[] {
  const reel = reelId ? reels.find((r) => r.id === reelId) : undefined;
  if (!reel) return [{ label: fallbackTitle, durationMin: 60, isTravel: false }];

  const { roadmap } = reel;

  if (roadmap.kind === "project" && roadmap.steps?.length) {
    return roadmap.steps.map((step) => ({
      label: step.title,
      durationMin: step.durationMin,
      isTravel: false,
    }));
  }

  if (roadmap.kind === "route" && roadmap.stops?.length) {
    const segs: Segment[] = [];
    for (const stop of roadmap.stops) {
      if ((stop.travelMinutesFromPrev ?? 0) > 0) {
        segs.push({
          label: `Travel → ${stop.name}`,
          durationMin: stop.travelMinutesFromPrev!,
          isTravel: true,
        });
      }
      segs.push({ label: stop.name, durationMin: DEFAULT_STOP_MIN, isTravel: false });
    }
    return segs;
  }

  return [{ label: roadmap.title, durationMin: 60, isTravel: false }];
}

function segmentsTotalMin(segs: Segment[]): number {
  return segs.reduce((sum, s) => sum + s.durationMin, 0);
}

function reelDurationMin(reelId: string | undefined, reels: Reel[]): number {
  return segmentsTotalMin(getEventSegments(reelId, reels, ""));
}

// ── Date / time helpers ─────────────────────────────────────────────────────
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

/** Returns total minutes from midnight for an ISO timestamp. */
function isoMinutesFromMidnight(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
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
  const { calendar, pendingSchedule, scheduleReel, setPendingSchedule, reels,
          updateCalendarEvent, deleteCalendarEvent } = useRoots();
  const today = new Date();
  const todayKey = localDateKey(today);

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today));
  const [dayDate, setDayDate] = useState(today);
  const [monthDate, setMonthDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [hoverSlot, setHoverSlot] = useState<{ key: string; hour: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Event editing modal ──────────────────────────────────────────────────
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");

  useEffect(() => {
    if (!editingEvent) return;
    const d = new Date(editingEvent.startsAt);
    setEditTitle(editingEvent.title);
    setEditDate(localDateKey(d));
    setEditTime(
      `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
    );
  }, [editingEvent]);

  function handleSaveEvent() {
    if (!editingEvent) return;
    const [h, m] = editTime.split(":").map(Number);
    const [y, mo, day] = editDate.split("-").map(Number);
    const newDate = new Date(y, mo - 1, day, h, m, 0);
    updateCalendarEvent(editingEvent.id, {
      title: editTitle,
      startsAt: newDate.toISOString(),
    });
    setEditingEvent(null);
  }

  function handleDeleteEvent() {
    if (!editingEvent) return;
    deleteCalendarEvent(editingEvent.id);
    setEditingEvent(null);
  }

  // Scroll to 8 AM on first render
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 8 * HOUR_H, behavior: "instant" as ScrollBehavior });
  }, []);

  // When placement starts: jump to the suggested date and switch to week view
  useEffect(() => {
    if (!pendingSchedule) return;
    const d = new Date(pendingSchedule.suggestedDate);
    setWeekStart(getWeekStart(d));
    setDayDate(d);
    setMonthDate(new Date(d.getFullYear(), d.getMonth(), 1));
    if (viewMode === "month") setViewMode("week");
    const sugH = new Date(pendingSchedule.suggestedDate).getHours();
    const scrollTop = Math.max(0, sugH - 1) * HOUR_H;
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollTop, behavior: "smooth" }), 80);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSchedule]);

  const placing = !!pendingSchedule;
  const sugKey = pendingSchedule ? isoDateKey(pendingSchedule.suggestedDate) : null;
  const sugHour = pendingSchedule ? new Date(pendingSchedule.suggestedDate).getHours() : null;

  // Precompute pending event duration for ghost blocks
  const pendingDurationMin = pendingSchedule
    ? reelDurationMin(pendingSchedule.reelId, reels)
    : 60;
  const pendingHeightPx = pendingDurationMin * PX_PER_MIN;

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
                {placing && isSugDay && sugHour !== null && (
                  <div
                    className="absolute left-0.5 right-0.5 rounded-lg border-2 border-dashed border-moss-500 bg-moss-100 px-2 py-1 pointer-events-none z-20 overflow-hidden"
                    style={{ top: sugHour * HOUR_H + 2, height: Math.max(pendingHeightPx - 4, 20) }}
                  >
                    <div className="text-[10px] font-semibold text-moss-700 truncate">★ {pendingSchedule!.title}</div>
                    <div className="text-[9px] text-moss-600 mt-0.5">{fmtHour(sugHour)} · suggested</div>
                  </div>
                )}

                {/* Hover ghost (different from suggested) */}
                {placing && hoverSlot?.key === key && hoverSlot.hour !== sugHour && (
                  <div
                    className="absolute left-0.5 right-0.5 rounded-lg border border-moss-400 bg-moss-200/70 px-2 py-1 pointer-events-none z-20 overflow-hidden"
                    style={{ top: hoverSlot.hour * HOUR_H + 2, height: Math.max(pendingHeightPx - 4, 20) }}
                  >
                    <div className="text-[10px] font-semibold text-moss-800 truncate">+ {pendingSchedule!.title}</div>
                    <div className="text-[9px] text-moss-700 mt-0.5">{fmtHour(hoverSlot.hour)}</div>
                  </div>
                )}

                {/* Real events — rendered as stacked segments */}
                {dayEvts.map((evt) => {
                  const startMin = isoMinutesFromMidnight(evt.startsAt);
                  const segments = getEventSegments(evt.reelId, reels, evt.title);
                  const totalMin = segmentsTotalMin(segments);
                  const topPx = startMin * PX_PER_MIN;
                  const totalHeightPx = totalMin * PX_PER_MIN;

                  return (
                    <div
                      key={evt.id}
                      className="absolute left-0.5 right-0.5 rounded-lg overflow-hidden z-10 cursor-pointer ring-0 hover:ring-2 hover:ring-white/80 transition-shadow"
                      style={{ top: topPx + 2, height: Math.max(totalHeightPx - 4, 16) }}
                      onClick={(e) => { e.stopPropagation(); setEditingEvent(evt); }}
                    >
                      {segments.map((seg, idx) => {
                        const segH = Math.max(seg.durationMin * PX_PER_MIN, 0);
                        return (
                          <div
                            key={idx}
                            className={[
                              "px-2 py-0.5 flex flex-col justify-start",
                              seg.isTravel
                                ? "bg-amber-400 border-b border-amber-300"
                                : idx % 2 === 0
                                  ? "bg-moss-500 border-b border-moss-400"
                                  : "bg-moss-600 border-b border-moss-500",
                            ].join(" ")}
                            style={{ height: segH, minHeight: 0, overflow: "hidden" }}
                          >
                            <div className="text-[10px] font-semibold text-white truncate leading-tight">{seg.label}</div>
                            {segH >= 20 && (
                              <div className="text-[9px] text-white/70 truncate leading-tight">
                                {seg.isTravel ? `${seg.durationMin} min` : `${seg.durationMin} min`}
                              </div>
                            )}
                          </div>
                        );
                      })}
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

      {/* ── Event edit modal ──────────────────────────────────────────── */}
      {editingEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm p-4"
          onClick={() => setEditingEvent(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden"
            style={{ maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-moss-500 px-5 py-4 flex items-center gap-3 shrink-0">
              <input
                className="flex-1 bg-transparent text-white placeholder-white/60 font-display text-xl outline-none border-b border-white/30 pb-0.5"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Event title"
              />
              <button onClick={() => setEditingEvent(null)} className="text-white/70 hover:text-white text-lg leading-none">
                ✕
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1">
              {/* When section */}
              <div className="px-5 py-5 space-y-4 border-b border-moss-50">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-ink/45 font-semibold block mb-1.5">Date</label>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-moss-100 bg-moss-50/40 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-moss-300"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-ink/45 font-semibold block mb-1.5">Start time</label>
                    <input
                      type="time"
                      className="w-full rounded-xl border border-moss-100 bg-moss-50/40 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-moss-300"
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Plan section — only for reel-backed events */}
              {editingEvent.reelId && (
                <div className="px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-moss-600 mb-3">
                    Edit plan
                  </p>
                  <InlinePlanEditor reelId={editingEvent.reelId} />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-moss-50 flex items-center justify-between shrink-0">
              <button onClick={handleDeleteEvent} className="text-sm text-red-500 hover:text-red-600 font-medium">
                Remove event
              </button>
              <div className="flex gap-2">
                <button onClick={() => setEditingEvent(null)} className="rounded-xl px-4 py-2 text-sm border border-moss-100 text-ink/60 hover:bg-moss-50">
                  Cancel
                </button>
                <button onClick={handleSaveEvent} className="rounded-xl px-4 py-2 text-sm font-medium bg-moss-500 text-white hover:bg-moss-600">
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

"use client";

import { useRef, useState } from "react";
import { useRoots } from "@/lib/store";
import { MapViewClient } from "./MapViewClient";
import { StopEditor, StepEditor } from "./PlanEditorParts";
import type { Reel, Stop, ProjectStep, Roadmap } from "@/lib/types";

const TRAVEL_ICON: Record<string, string> = {
  walk: "🚶",
  drive: "🚗",
  transit: "🚌",
  bike: "🚲",
};

function formatDate(iso?: string) {
  if (!iso) return "Unscheduled";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function RoadmapView() {
  const { reels, selectedReelId, setPendingSchedule, setActiveTab, calendar } = useRoots();
  const reel = reels.find((r) => r.id === selectedReelId);
  if (!reel) return null;

  function openCalendarPlacement() {
    if (!reel) return;
    setPendingSchedule({
      reelId: reel.id,
      title: reel.roadmap.title,
      suggestedDate: reel.roadmap.scheduledFor ?? new Date().toISOString(),
    });
    setActiveTab("calendar");
  }

  return (
    <section className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
      <RoadmapCard reel={reel} onSchedule={openCalendarPlacement} />
      <ExtractionCard reel={reel} scheduledIds={calendar.map((c) => c.reelId)} />
    </section>
  );
}

function RoadmapCard({ reel, onSchedule }: { reel: Reel; onSchedule: () => void }) {
  const { calendar, updateReel } = useRoots();
  const isScheduled = calendar.some((c) => c.reelId === reel.id);

  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [stopDragIdx, setStopDragIdx] = useState<number | null>(null);
  const [stopOverIdx, setStopOverIdx] = useState<number | null>(null);
  const [stepDragIdx, setStepDragIdx] = useState<number | null>(null);
  const [stepOverIdx, setStepOverIdx] = useState<number | null>(null);
  const canDragRef = useRef(false);

  function updateRoadmap(patch: Partial<Roadmap>) {
    updateReel(reel.id, { ...reel, roadmap: { ...reel.roadmap, ...patch } });
  }

  function saveStop(updated: Stop) {
    updateRoadmap({ stops: reel.roadmap.stops!.map((s) => (s.id === updated.id ? updated : s)) });
    setEditingStopId(null);
  }

  function saveStep(updated: ProjectStep) {
    updateRoadmap({ steps: reel.roadmap.steps!.map((s) => (s.id === updated.id ? updated : s)) });
    setEditingStepId(null);
  }

  function reorderStops(from: number, to: number) {
    if (from === to) return;
    const arr = [...(reel.roadmap.stops ?? [])];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    updateRoadmap({ stops: arr });
  }

  function reorderSteps(from: number, to: number) {
    if (from === to) return;
    const arr = [...(reel.roadmap.steps ?? [])];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    updateRoadmap({ steps: arr });
  }

  function addStop() {
    const newStop: Stop = {
      id: `s${Date.now()}`,
      name: "New stop",
      category: "",
      address: "",
      lat: 0,
      lng: 0,
      hours: "Hours vary",
      dwellMinutes: 30,
    };
    updateRoadmap({ stops: [...(reel.roadmap.stops ?? []), newStop] });
    setEditingStopId(newStop.id);
  }

  return (
    <div className="glass rounded-3xl p-6 shadow-soft animate-slideUp">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-moss-600">
            <span>{reel.roadmap.kind === "route" ? "Solo Route" : "Project Steps"}</span>
            <span className="text-ink/30">·</span>
            <span className="text-ink/50">{reel.roadmap.durationLabel}</span>
          </div>
          <h2 className="font-display text-3xl text-ink leading-tight mt-1">{reel.roadmap.title}</h2>
          <p className="text-sm text-ink/65 mt-1.5 max-w-xl">{reel.roadmap.summary}</p>
        </div>

        {reel.roadmap.weather && (
          <div className="rounded-2xl border border-moss-100 bg-white/80 px-3 py-2 text-right shrink-0">
            <div className="text-2xl leading-none">{reel.roadmap.weather.emoji}</div>
            <div className="text-xs text-ink/60 mt-1">
              {reel.roadmap.weather.tempF}°F · {reel.roadmap.weather.condition}
            </div>
            <div className="text-[10px] text-ink/40">{reel.roadmap.weather.precipChance}% precip</div>
          </div>
        )}
      </div>

      {/* Route stops */}
      {reel.roadmap.kind === "route" && reel.roadmap.stops && (
        <>
          <div className="mt-4">
            <MapViewClient stops={reel.roadmap.stops} />
          </div>
          <ol className="mt-5 space-y-2">
            {reel.roadmap.stops.map((s, i) => (
              <li key={s.id}>
                <div
                  draggable
                  onDragStart={(e) => {
                    if (!canDragRef.current) { e.preventDefault(); return; }
                    setStopDragIdx(i);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => { e.preventDefault(); setStopOverIdx(i); }}
                  onDragLeave={() => setStopOverIdx(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (stopDragIdx !== null) reorderStops(stopDragIdx, i);
                    setStopDragIdx(null); setStopOverIdx(null); canDragRef.current = false;
                  }}
                  onDragEnd={() => { setStopDragIdx(null); setStopOverIdx(null); canDragRef.current = false; }}
                  onClick={() => setEditingStopId(editingStopId === s.id ? null : s.id)}
                  className={[
                    "flex gap-3 items-start group cursor-pointer rounded-2xl px-2 py-1.5 -mx-2 hover:bg-moss-50/60 transition-colors border-t-2",
                    stopDragIdx === i ? "opacity-40" : "",
                    stopOverIdx === i && stopDragIdx !== i ? "border-moss-500" : "border-transparent",
                  ].join(" ")}
                >
                  <div className="flex flex-col items-center pt-0.5 shrink-0">
                    <span
                      className="w-7 h-7 rounded-full bg-moss-500 text-white text-xs font-semibold flex items-center justify-center shadow-soft cursor-grab active:cursor-grabbing select-none"
                      onPointerDown={() => { canDragRef.current = true; }}
                      onPointerUp={() => { canDragRef.current = false; }}
                    >
                      {i + 1}
                    </span>
                    {i < reel.roadmap.stops!.length - 1 && (
                      <span className="w-px flex-1 bg-moss-200 mt-1" style={{ minHeight: 24 }} />
                    )}
                  </div>
                  <div className="flex-1 pb-2 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-semibold text-ink">{s.name}</span>
                      <span className="text-[10px] uppercase tracking-wider text-moss-600 bg-moss-50 px-1.5 py-0.5 rounded">
                        {s.category}
                      </span>
                    </div>
                    <div className="text-xs text-ink/60 mt-0.5">{s.address} · ⏰ {s.hours}</div>
                    {s.note && (
                      <div className="text-xs text-clay-600 mt-1 bg-clay-50 inline-block rounded-md px-2 py-0.5">
                        💡 {s.note}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3 mt-1.5">
                      {s.travelMinutesFromPrev && (
                        <span className="text-[11px] text-ink/45">
                          {TRAVEL_ICON[s.travelMode ?? "drive"]} {s.travelMinutesFromPrev} min travel
                        </span>
                      )}
                      {s.dwellMinutes && (
                        <span className="text-[11px] text-ink/45">⏱ {s.dwellMinutes} min at stop</span>
                      )}
                    </div>
                  </div>
                  <span className="text-ink/25 text-xs group-hover:text-moss-500 transition-colors pt-1 shrink-0">✏️</span>
                </div>
                {editingStopId === s.id && (
                  <StopEditor stop={s} onSave={saveStop} onCancel={() => setEditingStopId(null)} />
                )}
              </li>
            ))}
          </ol>
          <button
            onClick={addStop}
            className="mt-3 w-full rounded-2xl border border-dashed border-moss-200 text-moss-600 text-sm py-2.5 hover:bg-moss-50 transition-colors flex items-center justify-center gap-1.5"
          >
            <span className="text-base leading-none">+</span> Add stop
          </button>
        </>
      )}

      {/* Project steps */}
      {reel.roadmap.kind === "project" && reel.roadmap.steps && (
        <ol className="mt-5 space-y-2">
          {reel.roadmap.steps.map((s, i) => (
            <li key={s.id}>
              <div
                draggable
                onDragStart={(e) => {
                  if (!canDragRef.current) { e.preventDefault(); return; }
                  setStepDragIdx(i);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => { e.preventDefault(); setStepOverIdx(i); }}
                onDragLeave={() => setStepOverIdx(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  if (stepDragIdx !== null) reorderSteps(stepDragIdx, i);
                  setStepDragIdx(null); setStepOverIdx(null); canDragRef.current = false;
                }}
                onDragEnd={() => { setStepDragIdx(null); setStepOverIdx(null); canDragRef.current = false; }}
                onClick={() => setEditingStepId(editingStepId === s.id ? null : s.id)}
                className={[
                  "rounded-2xl border border-moss-100 bg-white/70 p-4 group cursor-pointer hover:border-moss-200 hover:bg-moss-50/40 transition-colors border-t-2",
                  stepDragIdx === i ? "opacity-40" : "",
                  stepOverIdx === i && stepDragIdx !== i ? "border-t-clay-500" : "",
                ].join(" ")}
              >
                <div className="flex items-baseline justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-7 h-7 rounded-full bg-clay-500 text-white text-xs font-semibold flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing select-none"
                      onPointerDown={(e) => { e.stopPropagation(); canDragRef.current = true; }}
                      onPointerUp={() => { canDragRef.current = false; }}
                    >
                      {i + 1}
                    </span>
                    <span className="font-semibold text-ink">{s.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ink/45">{s.durationMin} min</span>
                    <span className="text-ink/25 text-xs group-hover:text-clay-500 transition-colors">✏️</span>
                  </div>
                </div>
                <p className="text-sm text-ink/65 mt-2 ml-10">{s.detail}</p>
                {s.materials && (
                  <div className="mt-2 ml-10 flex flex-wrap gap-1.5">
                    {s.materials.map((m) => (
                      <span key={m} className="text-[11px] bg-clay-50 text-clay-600 rounded-full px-2 py-0.5 border border-clay-100">
                        {m}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {editingStepId === s.id && (
                <StepEditor step={s} onSave={saveStep} onCancel={() => setEditingStepId(null)} />
              )}
            </li>
          ))}
        </ol>
      )}

      <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-ink/50">📅 Suggested: {formatDate(reel.roadmap.scheduledFor)}</div>
        <div className="flex gap-2">
          <button
            onClick={onSchedule}
            className="rounded-xl px-4 py-2 text-sm font-medium transition flex items-center gap-2 bg-moss-500 text-white hover:bg-moss-600 shadow-soft"
          >
            {isScheduled ? <>📅 Move in calendar</> : <>📅 Add to calendar</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExtractionCard({ reel }: { reel: Reel; scheduledIds: (string | undefined)[] }) {
  return (
    <div className="glass rounded-3xl p-6 shadow-soft animate-slideUp">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay-600">
        Multimodal Extraction
      </p>
      <h3 className="font-display text-xl mt-1 text-ink">What Roots saw, heard, &amp; read</h3>

      <div
        className="mt-4 rounded-2xl p-3 text-white text-xs"
        style={{
          background:
            reel.thumbnailHue === "moss-400"
              ? "linear-gradient(135deg,#5E9A55,#234820)"
              : reel.thumbnailHue === "clay-300"
              ? "linear-gradient(135deg,#D9B47E,#7E5424)"
              : "linear-gradient(135deg,#C28F4E,#3D7A36)",
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider bg-white/15 rounded-full px-2 py-0.5">
            {reel.platform} · {reel.creator}
          </span>
          <a
            href={reel.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] opacity-70 hover:opacity-100 underline underline-offset-2"
            onClick={(e) => e.stopPropagation()}
          >
            ▶ Source reel
          </a>
        </div>
        <p className="mt-3 leading-snug">&ldquo;{reel.caption}&rdquo;</p>
      </div>

      <div className="mt-4 space-y-3">
        <ExtractRow icon="🎙" label="Transcript">
          <p className="line-clamp-3">{reel.extracted.transcript}</p>
        </ExtractRow>
        <ExtractRow icon="👁" label="Visual tags">
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {reel.extracted.visualTags.map((t) => (
              <span key={t} className="text-[11px] bg-moss-50 border border-moss-100 text-moss-700 rounded-full px-2 py-0.5">
                {t}
              </span>
            ))}
          </div>
        </ExtractRow>
        <ExtractRow icon="📍" label="Location">
          <p>{reel.extracted.locationGuess}</p>
        </ExtractRow>
        {reel.extracted.detectedHours && (
          <ExtractRow icon="⏰" label="Hours">
            <p>{reel.extracted.detectedHours}</p>
          </ExtractRow>
        )}
        {reel.extracted.instructions && (
          <ExtractRow icon="✅" label="Instructions">
            <ul className="space-y-0.5 mt-0.5">
              {reel.extracted.instructions.map((ins) => (
                <li key={ins} className="flex gap-1.5">
                  <span className="text-moss-500">·</span>
                  <span>{ins}</span>
                </li>
              ))}
            </ul>
          </ExtractRow>
        )}
      </div>
    </div>
  );
}

function ExtractRow({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-moss-100 bg-white/70 p-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-ink/50 font-semibold">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="text-sm text-ink/75 mt-1.5">{children}</div>
    </div>
  );
}

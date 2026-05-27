"use client";

import { useEffect, useRef, useState } from "react";
import { useRoots } from "@/lib/store";
import { MapViewClient } from "./MapViewClient";
import type { Reel, Stop, ProjectStep } from "@/lib/types";
import type { PlaceResult } from "@/app/api/places/route";

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

// ── Location search ─────────────────────────────────────────────────────────
function LocationSearch({ onSelect }: { onSelect: (r: PlaceResult) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.length < 2) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.places ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 450);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35 text-sm">🔍</span>
        <input
          className="w-full rounded-xl border border-moss-200 bg-white pl-8 pr-3 py-2 text-sm text-ink placeholder-ink/35 focus:outline-none focus:ring-2 focus:ring-moss-300"
          placeholder="Search for a place…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-ink/40 animate-pulse">
            searching…
          </span>
        )}
      </div>
      {results.length > 0 && (
        <div className="rounded-xl border border-moss-100 bg-white shadow-soft overflow-hidden">
          {results.map((r) => (
            <button
              key={r.placeId}
              type="button"
              onClick={() => { onSelect(r); setQuery(""); setResults([]); }}
              className="w-full text-left px-3 py-2.5 hover:bg-moss-50 border-b border-moss-50 last:border-0 transition-colors"
            >
              <div className="text-sm font-medium text-ink truncate">{r.name}</div>
              <div className="text-[11px] text-ink/50 truncate mt-0.5">{r.shortAddress}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Stop inline editor ───────────────────────────────────────────────────────
function StopEditor({
  stop,
  onSave,
  onCancel,
}: {
  stop: Stop;
  onSave: (updated: Stop) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Stop>({ ...stop });

  function field<K extends keyof Stop>(key: K, val: Stop[K]) {
    setDraft((prev) => ({ ...prev, [key]: val }));
  }

  function applyPlace(r: PlaceResult) {
    setDraft((prev) => ({
      ...prev,
      name: r.name,
      address: r.shortAddress || r.fullAddress,
      lat: r.lat,
      lng: r.lng,
    }));
  }

  return (
    <div className="mt-2 rounded-2xl border border-moss-200 bg-white/90 p-4 space-y-3 shadow-soft">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-moss-600">
        Find a different place
      </p>
      <LocationSearch onSelect={applyPlace} />

      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="col-span-2">
          <label className="field-label">Name</label>
          <input className="field-input" value={draft.name}
            onChange={(e) => field("name", e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="field-label">Address</label>
          <input className="field-input" value={draft.address}
            onChange={(e) => field("address", e.target.value)} />
        </div>
        <div>
          <label className="field-label">Category</label>
          <input className="field-input" value={draft.category}
            onChange={(e) => field("category", e.target.value)} />
        </div>
        <div>
          <label className="field-label">Hours</label>
          <input className="field-input" value={draft.hours}
            onChange={(e) => field("hours", e.target.value)} />
        </div>
        <div>
          <label className="field-label">Travel from prev (min)</label>
          <input className="field-input" type="number" min={0}
            value={draft.travelMinutesFromPrev ?? ""}
            onChange={(e) => field("travelMinutesFromPrev", e.target.value ? Number(e.target.value) : undefined)} />
        </div>
        <div>
          <label className="field-label">Travel mode</label>
          <select className="field-input" value={draft.travelMode ?? ""}
            onChange={(e) => field("travelMode", e.target.value as Stop["travelMode"] || undefined)}>
            <option value="">—</option>
            <option value="walk">Walk</option>
            <option value="drive">Drive</option>
            <option value="transit">Transit</option>
            <option value="bike">Bike</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="field-label">Note</label>
          <input className="field-input" value={draft.note ?? ""}
            onChange={(e) => field("note", e.target.value || undefined)} />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel}
          className="rounded-xl px-3 py-1.5 text-sm border border-moss-100 text-ink/55 hover:bg-moss-50">
          Cancel
        </button>
        <button onClick={() => onSave(draft)}
          className="rounded-xl px-3 py-1.5 text-sm font-medium bg-moss-500 text-white hover:bg-moss-600">
          Save stop
        </button>
      </div>
    </div>
  );
}

// ── Step inline editor ───────────────────────────────────────────────────────
function StepEditor({
  step,
  onSave,
  onCancel,
}: {
  step: ProjectStep;
  onSave: (updated: ProjectStep) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<ProjectStep>({ ...step });
  const [materialsText, setMaterialsText] = useState(
    step.materials?.join(", ") ?? ""
  );

  function handleSave() {
    const mats = materialsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    onSave({ ...draft, materials: mats.length ? mats : undefined });
  }

  return (
    <div className="mt-2 rounded-2xl border border-clay-200 bg-white/90 p-4 space-y-3 shadow-soft">
      <div className="space-y-2">
        <div>
          <label className="field-label">Title</label>
          <input className="field-input" value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
        </div>
        <div>
          <label className="field-label">Detail</label>
          <textarea
            className="field-input resize-none"
            rows={2}
            value={draft.detail}
            onChange={(e) => setDraft((d) => ({ ...d, detail: e.target.value }))}
          />
        </div>
        <div>
          <label className="field-label">Duration (minutes)</label>
          <input className="field-input" type="number" min={1} value={draft.durationMin}
            onChange={(e) => setDraft((d) => ({ ...d, durationMin: Number(e.target.value) }))} />
        </div>
        <div>
          <label className="field-label">Materials (comma-separated)</label>
          <input className="field-input" value={materialsText}
            onChange={(e) => setMaterialsText(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel}
          className="rounded-xl px-3 py-1.5 text-sm border border-moss-100 text-ink/55 hover:bg-moss-50">
          Cancel
        </button>
        <button onClick={handleSave}
          className="rounded-xl px-3 py-1.5 text-sm font-medium bg-clay-500 text-white hover:bg-clay-600">
          Save step
        </button>
      </div>
    </div>
  );
}

// ── Main view ────────────────────────────────────────────────────────────────
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

// ── RoadmapCard ──────────────────────────────────────────────────────────────
function RoadmapCard({ reel, onSchedule }: { reel: Reel; onSchedule: () => void }) {
  const { calendar, updateReel } = useRoots();
  const isScheduled = calendar.some((c) => c.reelId === reel.id);

  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);

  function saveStop(updated: Stop) {
    const stops = reel.roadmap.stops!.map((s) =>
      s.id === updated.id ? updated : s
    );
    updateReel(reel.id, {
      ...reel,
      roadmap: { ...reel.roadmap, stops },
    });
    setEditingStopId(null);
  }

  function saveStep(updated: ProjectStep) {
    const steps = reel.roadmap.steps!.map((s) =>
      s.id === updated.id ? updated : s
    );
    updateReel(reel.id, {
      ...reel,
      roadmap: { ...reel.roadmap, steps },
    });
    setEditingStepId(null);
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
          <h2 className="font-display text-3xl text-ink leading-tight mt-1">
            {reel.roadmap.title}
          </h2>
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

      {/* ── Route stops ──────────────────────────────────────────────── */}
      {reel.roadmap.kind === "route" && reel.roadmap.stops && (
        <>
          <div className="mt-4">
            <MapViewClient stops={reel.roadmap.stops} />
          </div>
          <ol className="mt-5 space-y-2">
            {reel.roadmap.stops.map((s, i) => (
              <li key={s.id}>
                <div
                  className="flex gap-3 items-start group cursor-pointer rounded-2xl px-2 py-1.5 -mx-2 hover:bg-moss-50/60 transition-colors"
                  onClick={() =>
                    setEditingStopId(editingStopId === s.id ? null : s.id)
                  }
                >
                  <div className="flex flex-col items-center pt-0.5 shrink-0">
                    <span className="w-7 h-7 rounded-full bg-moss-500 text-white text-xs font-semibold flex items-center justify-center shadow-soft">
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
                    {s.travelMinutesFromPrev && (
                      <div className="text-[11px] text-ink/45 mt-1.5">
                        {TRAVEL_ICON[s.travelMode ?? "drive"]}{" "}
                        {s.travelMinutesFromPrev} min from previous stop
                      </div>
                    )}
                  </div>
                  <span className="text-ink/25 text-xs group-hover:text-moss-500 transition-colors pt-1 shrink-0">
                    ✏️
                  </span>
                </div>

                {editingStopId === s.id && (
                  <StopEditor
                    stop={s}
                    onSave={saveStop}
                    onCancel={() => setEditingStopId(null)}
                  />
                )}
              </li>
            ))}
          </ol>
        </>
      )}

      {/* ── Project steps ─────────────────────────────────────────────── */}
      {reel.roadmap.kind === "project" && reel.roadmap.steps && (
        <ol className="mt-5 space-y-2">
          {reel.roadmap.steps.map((s, i) => (
            <li key={s.id}>
              <div
                className="rounded-2xl border border-moss-100 bg-white/70 p-4 group cursor-pointer hover:border-moss-200 hover:bg-moss-50/40 transition-colors"
                onClick={() =>
                  setEditingStepId(editingStepId === s.id ? null : s.id)
                }
              >
                <div className="flex items-baseline justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-clay-500 text-white text-xs font-semibold flex items-center justify-center shrink-0">
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
                      <span
                        key={m}
                        className="text-[11px] bg-clay-50 text-clay-600 rounded-full px-2 py-0.5 border border-clay-100"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {editingStepId === s.id && (
                <StepEditor
                  step={s}
                  onSave={saveStep}
                  onCancel={() => setEditingStepId(null)}
                />
              )}
            </li>
          ))}
        </ol>
      )}

      <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-ink/50">
          📅 Suggested: {formatDate(reel.roadmap.scheduledFor)}
        </div>
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

// ── ExtractionCard ───────────────────────────────────────────────────────────
function ExtractionCard({
  reel,
}: {
  reel: Reel;
  scheduledIds: (string | undefined)[];
}) {
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
          <span className="text-[10px] opacity-70">▶ Source reel</span>
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
              <span
                key={t}
                className="text-[11px] bg-moss-50 border border-moss-100 text-moss-700 rounded-full px-2 py-0.5"
              >
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

function ExtractRow({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}) {
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

"use client";

import { useEffect, useRef, useState } from "react";
import { useRoots } from "@/lib/store";
import type { Stop, ProjectStep } from "@/lib/types";
import type { PlaceResult } from "@/app/api/places/route";

const TRAVEL_ICON: Record<string, string> = {
  walk: "🚶",
  drive: "🚗",
  transit: "🚌",
  bike: "🚲",
};

// ── Location search ──────────────────────────────────────────────────────────
// Automatically uses the user's stored coords to bias results toward nearby
// places. Works like Apple/Google Maps: "coffee" → nearby cafés.
export function LocationSearch({ onSelect }: { onSelect: (r: PlaceResult) => void }) {
  const { userCoords } = useRoots();
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
        const params = new URLSearchParams({ q: query });
        if (userCoords) {
          params.set("lat", String(userCoords.lat));
          params.set("lng", String(userCoords.lng));
        }
        const res = await fetch(`/api/places?${params}`);
        const data = await res.json();
        setResults(data.places ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 450);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, userCoords]);

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35 text-sm pointer-events-none">
          🔍
        </span>
        <input
          className="w-full rounded-xl border border-moss-200 bg-white pl-8 pr-3 py-2 text-sm text-ink placeholder-ink/35 focus:outline-none focus:ring-2 focus:ring-moss-300"
          placeholder={userCoords ? "Search nearby (coffee, thrift, park…)" : "Search for a place…"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-ink/40 animate-pulse pointer-events-none">
            searching…
          </span>
        )}
      </div>
      {results.length > 0 && (
        <div className="rounded-xl border border-moss-100 bg-white shadow-soft overflow-hidden max-h-48 overflow-y-auto">
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
export function StopEditor({
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
            onChange={(e) => field("travelMode", (e.target.value as Stop["travelMode"]) || undefined)}>
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
export function StepEditor({
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
    const mats = materialsText.split(",").map((s) => s.trim()).filter(Boolean);
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
          <textarea className="field-input resize-none" rows={2} value={draft.detail}
            onChange={(e) => setDraft((d) => ({ ...d, detail: e.target.value }))} />
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

// ── Inline plan editor (stops or steps list) ─────────────────────────────────
// Reusable in both RoadmapView and the CalendarView modal.
export function InlinePlanEditor({
  reelId,
}: {
  reelId: string;
}) {
  const { reels, updateReel } = useRoots();
  const reel = reels.find((r) => r.id === reelId);
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);

  if (!reel) return null;

  function saveStop(updated: Stop) {
    if (!reel) return;
    const stops = reel.roadmap.stops!.map((s) => (s.id === updated.id ? updated : s));
    updateReel(reel.id, { ...reel, roadmap: { ...reel.roadmap, stops } });
    setEditingStopId(null);
  }

  function saveStep(updated: ProjectStep) {
    if (!reel) return;
    const steps = reel.roadmap.steps!.map((s) => (s.id === updated.id ? updated : s));
    updateReel(reel.id, { ...reel, roadmap: { ...reel.roadmap, steps } });
    setEditingStepId(null);
  }

  if (reel.roadmap.kind === "route" && reel.roadmap.stops) {
    return (
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/40 mb-2">
          Stops
        </p>
        {reel.roadmap.stops.map((s, i) => (
          <div key={s.id}>
            <div
              className="flex gap-2 items-center group cursor-pointer rounded-xl px-2 py-1.5 hover:bg-moss-50/60 transition-colors"
              onClick={() => setEditingStopId(editingStopId === s.id ? null : s.id)}
            >
              <span className="w-5 h-5 rounded-full bg-moss-500 text-white text-[10px] font-semibold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-ink truncate">{s.name}</div>
                {s.travelMinutesFromPrev && (
                  <div className="text-[10px] text-ink/40">
                    {TRAVEL_ICON[s.travelMode ?? "drive"]} {s.travelMinutesFromPrev} min
                  </div>
                )}
              </div>
              <span className="text-ink/20 text-xs group-hover:text-moss-500 transition-colors">✏️</span>
            </div>
            {editingStopId === s.id && (
              <StopEditor stop={s} onSave={saveStop} onCancel={() => setEditingStopId(null)} />
            )}
          </div>
        ))}
      </div>
    );
  }

  if (reel.roadmap.kind === "project" && reel.roadmap.steps) {
    return (
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/40 mb-2">
          Steps
        </p>
        {reel.roadmap.steps.map((s, i) => (
          <div key={s.id}>
            <div
              className="flex gap-2 items-center group cursor-pointer rounded-xl px-2 py-1.5 hover:bg-clay-50/60 transition-colors"
              onClick={() => setEditingStepId(editingStepId === s.id ? null : s.id)}
            >
              <span className="w-5 h-5 rounded-full bg-clay-500 text-white text-[10px] font-semibold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-ink truncate">{s.title}</div>
                <div className="text-[10px] text-ink/40">{s.durationMin} min</div>
              </div>
              <span className="text-ink/20 text-xs group-hover:text-clay-500 transition-colors">✏️</span>
            </div>
            {editingStepId === s.id && (
              <StepEditor step={s} onSave={saveStep} onCancel={() => setEditingStepId(null)} />
            )}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

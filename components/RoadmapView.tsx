"use client";

import { useState } from "react";
import { useRoots } from "@/lib/store";
import { MapViewClient } from "./MapViewClient";
import type { Reel } from "@/lib/types";

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
  const { reels, selectedReelId, scheduleReel, calendar } = useRoots();
  const reel = reels.find((r) => r.id === selectedReelId);
  if (!reel) return null;

  return (
    <section className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
      <RoadmapCard reel={reel} onSchedule={() => scheduleReel(reel.id, "solo")} />
      <ExtractionCard reel={reel} scheduledIds={calendar.map((c) => c.reelId)} />
    </section>
  );
}

function RoadmapCard({
  reel,
  onSchedule,
}: {
  reel: Reel;
  onSchedule: () => void;
}) {
  const { calendar } = useRoots();
  const isScheduled = calendar.some((c) => c.reelId === reel.id);
  const [justScheduled, setJustScheduled] = useState(false);

  function handleSchedule() {
    onSchedule();
    setJustScheduled(true);
    setTimeout(() => setJustScheduled(false), 2200);
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
          <p className="text-sm text-ink/65 mt-1.5 max-w-xl">
            {reel.roadmap.summary}
          </p>
        </div>

        {reel.roadmap.weather && (
          <div className="rounded-2xl border border-moss-100 bg-white/80 px-3 py-2 text-right shrink-0">
            <div className="text-2xl leading-none">
              {reel.roadmap.weather.emoji}
            </div>
            <div className="text-xs text-ink/60 mt-1">
              {reel.roadmap.weather.tempF}°F · {reel.roadmap.weather.condition}
            </div>
            <div className="text-[10px] text-ink/40">
              {reel.roadmap.weather.precipChance}% precip
            </div>
          </div>
        )}
      </div>

      {reel.roadmap.kind === "route" && reel.roadmap.stops && (
        <>
          <div className="mt-4">
            <MapViewClient stops={reel.roadmap.stops} />
          </div>
          <ol className="mt-5 space-y-3">
            {reel.roadmap.stops.map((s, i) => (
              <li key={s.id} className="flex gap-3 items-start">
                <div className="flex flex-col items-center pt-0.5">
                  <span className="w-7 h-7 rounded-full bg-moss-500 text-white text-xs font-semibold flex items-center justify-center shadow-soft">
                    {i + 1}
                  </span>
                  {i < reel.roadmap.stops!.length - 1 && (
                    <span className="w-px flex-1 bg-moss-200 mt-1" style={{ minHeight: 24 }} />
                  )}
                </div>
                <div className="flex-1 pb-2">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-semibold text-ink">{s.name}</span>
                    <span className="text-[10px] uppercase tracking-wider text-moss-600 bg-moss-50 px-1.5 py-0.5 rounded">
                      {s.category}
                    </span>
                  </div>
                  <div className="text-xs text-ink/60 mt-0.5">
                    {s.address} · ⏰ {s.hours}
                  </div>
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
              </li>
            ))}
          </ol>
        </>
      )}

      {reel.roadmap.kind === "project" && reel.roadmap.steps && (
        <ol className="mt-5 space-y-3">
          {reel.roadmap.steps.map((s, i) => (
            <li
              key={s.id}
              className="rounded-2xl border border-moss-100 bg-white/70 p-4"
            >
              <div className="flex items-baseline justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-clay-500 text-white text-xs font-semibold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="font-semibold text-ink">{s.title}</span>
                </div>
                <span className="text-xs text-ink/45">{s.durationMin} min</span>
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
            </li>
          ))}
        </ol>
      )}

      <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-ink/50">
          📅 Suggested: {formatDate(reel.roadmap.scheduledFor)}
        </div>
        <div className="flex gap-2">
          <button className="rounded-xl border border-moss-200 bg-white px-3 py-2 text-xs text-ink/70 hover:bg-moss-50">
            Adjust
          </button>
          <button
            onClick={handleSchedule}
            disabled={isScheduled}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition flex items-center gap-2 ${
              isScheduled
                ? "bg-moss-100 text-moss-700"
                : "bg-moss-500 text-white hover:bg-moss-600 shadow-soft"
            }`}
          >
            {isScheduled ? (
              <>✓ On your calendar</>
            ) : (
              <>📅 Add to calendar</>
            )}
          </button>
        </div>
      </div>

      {justScheduled && (
        <div className="mt-3 rounded-xl bg-moss-500 text-white text-sm px-4 py-2.5 flex items-center gap-2 animate-slideUp">
          <span>🌱</span>
          <span>
            Saved to your calendar — Roots will remind you the night before.
          </span>
        </div>
      )}
    </div>
  );
}

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
      <h3 className="font-display text-xl mt-1 text-ink">
        What Roots saw, heard, & read
      </h3>

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
        <p className="mt-3 leading-snug">"{reel.caption}"</p>
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

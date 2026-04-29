"use client";

import { useState } from "react";
import { useRoots } from "@/lib/store";
import type { ExtractionStage } from "@/lib/types";

const STAGES: { key: ExtractionStage; label: string; emoji: string }[] = [
  { key: "fetching", label: "Fetching media", emoji: "🔗" },
  { key: "transcribing", label: "Transcribing audio", emoji: "🎙" },
  { key: "vision", label: "Analyzing visuals", emoji: "👁" },
  { key: "geocoding", label: "Geocoding locations", emoji: "📍" },
  { key: "weather", label: "Checking weather", emoji: "🌤" },
];

export function InspirationInput() {
  const { reels, addReel, selectReel, selectedReelId } = useRoots();
  const [url, setUrl] = useState("");
  const [stage, setStage] = useState<ExtractionStage>("idle");
  const [activeStageIdx, setActiveStageIdx] = useState(-1);
  const [extractError, setExtractError] = useState<string | null>(null);

  async function handleExtract() {
    const extractUrl = url.trim() || "https://instagram.com/reel/demo-extraction";
    if (!url.trim()) setUrl(extractUrl);
    setExtractError(null);
    setStage("fetching");
    setActiveStageIdx(0);

    // Auto-advance visual stages every 2.5s while real API call is in-flight
    let stageIdx = 0;
    const timer = setInterval(() => {
      stageIdx = Math.min(stageIdx + 1, STAGES.length - 1);
      setActiveStageIdx(stageIdx);
      setStage(STAGES[stageIdx].key);
    }, 2500);

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: extractUrl }),
      });

      clearInterval(timer);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Server error ${res.status}`);
      }

      const { reel } = await res.json();
      setStage("done");
      setActiveStageIdx(STAGES.length);
      addReel(reel);

      setTimeout(() => {
        setStage("idle");
        setActiveStageIdx(-1);
        setUrl("");
      }, 1500);
    } catch (err: unknown) {
      clearInterval(timer);
      setStage("idle");
      setActiveStageIdx(-1);
      setExtractError(err instanceof Error ? err.message : "Extraction failed");
    }
  }

  const isProcessing = stage !== "idle" && stage !== "done";

  return (
    <section className="glass rounded-3xl p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss-600">
            Inspiration Hub
          </p>
          <h2 className="font-display text-3xl text-ink leading-tight mt-1">
            Drop a reel.{" "}
            <span className="italic text-moss-600">Get a real plan.</span>
          </h2>
          <p className="text-sm text-ink/65 mt-1.5 max-w-md">
            Paste a TikTok, Reel, or Short. Roots watches, listens, and reads the
            captions to pull every logistic you'd otherwise have to hunt down.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-1.5 text-xs text-ink/50">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-moss-400 animate-pulse" />
          Multimodal model online
        </div>
      </div>

      <div className="mt-5 flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-2xl border border-moss-100 bg-white/80 px-4 py-3 focus-within:shadow-glow transition">
          <span className="text-ink/40">🔗</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isProcessing}
            placeholder="Paste a Reel, TikTok, or YouTube Short URL…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-ink/35"
          />
          {url && !isProcessing && (
            <button
              onClick={() => setUrl("")}
              className="text-ink/30 hover:text-ink/60 text-xs"
              aria-label="Clear"
            >
              ✕
            </button>
          )}
        </div>
        <button
          onClick={handleExtract}
          disabled={isProcessing}
          className="rounded-2xl bg-ink text-clay-50 font-medium px-5 py-3 text-sm hover:bg-moss-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isProcessing ? (
            <>
              <span className="inline-block h-3 w-3 rounded-full border-2 border-clay-50 border-t-transparent animate-spin" />
              Extracting…
            </>
          ) : (
            <>
              ✨ Extract plan
            </>
          )}
        </button>
      </div>

      {/* Error display */}
      {extractError && (
        <p className="mt-2 text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">
          ⚠️ {extractError}
        </p>
      )}

      {/* Quick demo sources */}
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="text-ink/40">Try:</span>
        {[
          { label: "🥾 Hike reel", value: "https://instagram.com/reel/uvas-canyon" },
          { label: "🛍 Thrift route", value: "https://tiktok.com/@thriftedfits/v/1" },
          { label: "🏺 Craft tutorial", value: "https://youtube.com/shorts/coil-mug" },
        ].map((s) => (
          <button
            key={s.value}
            onClick={() => setUrl(s.value)}
            className="rounded-full border border-moss-200 bg-moss-50 px-2.5 py-1 text-ink/70 hover:bg-moss-100"
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Pipeline visualization */}
      {(isProcessing || stage === "done") && (
        <div className="mt-5 rounded-2xl border border-moss-100 bg-gradient-to-br from-moss-50 to-clay-50 p-4 animate-slideUp">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {STAGES.map((s, i) => {
              const done = i < activeStageIdx || stage === "done";
              const active = i === activeStageIdx && stage !== "done";
              return (
                <div
                  key={s.key}
                  className={`rounded-xl p-3 text-xs flex flex-col items-start gap-1 border transition ${
                    done
                      ? "bg-white border-moss-200 text-moss-700"
                      : active
                      ? "bg-white border-moss-300 text-ink shadow-glow"
                      : "bg-white/50 border-moss-100 text-ink/40"
                  }`}
                >
                  <span className="text-base">{s.emoji}</span>
                  <span className="font-medium leading-tight">{s.label}</span>
                  {active && (
                    <div className="h-1 w-full rounded-full bg-moss-100 overflow-hidden mt-0.5">
                      <div className="h-full w-1/2 bg-moss-500 animate-shimmer rounded-full" />
                    </div>
                  )}
                  {done && <span className="text-[10px]">✓ complete</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Saved reels strip */}
      <div className="mt-6">
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/50">
            Saved Inspirations · {reels.length}
          </h3>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
          {reels.map((r) => {
            const selected = r.id === selectedReelId;
            return (
              <button
                key={r.id}
                onClick={() => selectReel(r.id)}
                className={`group min-w-[220px] max-w-[240px] text-left rounded-2xl border bg-white/80 transition overflow-hidden ${
                  selected
                    ? "border-moss-400 shadow-glow"
                    : "border-moss-100 hover:border-moss-300"
                }`}
              >
                <div
                  className={`h-24 relative bg-${r.thumbnailHue} flex items-end p-2`}
                  style={{
                    background:
                      r.thumbnailHue === "moss-400"
                        ? "linear-gradient(135deg,#5E9A55,#234820)"
                        : r.thumbnailHue === "clay-300"
                        ? "linear-gradient(135deg,#D9B47E,#7E5424)"
                        : "linear-gradient(135deg,#C28F4E,#3D7A36)",
                  }}
                >
                  <span className="text-[10px] uppercase tracking-wider bg-black/30 text-white rounded-full px-2 py-0.5 backdrop-blur">
                    {r.platform}
                  </span>
                  <span className="ml-auto text-white/90 text-xs">{r.creator}</span>
                </div>
                <div className="p-3">
                  <p className="text-xs font-semibold text-ink leading-snug line-clamp-2">
                    {r.roadmap.title}
                  </p>
                  <p className="text-[11px] text-ink/55 mt-1 line-clamp-1">
                    📍 {r.extracted.locationGuess}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { useRoots } from "@/lib/store";
import type { Reel } from "@/lib/types";

const SKILL_ICONS: Record<string, string> = {
  "Hiking & Trails": "🥾",
  "Urban Exploration": "🗺️",
  "Ceramics & Hand-Building": "🏺",
  Photography: "📸",
  Cooking: "🍳",
};

function reelSkill(reel: Reel): string {
  if (reel.id === "reel-uvas") return "Hiking & Trails";
  if (reel.id === "reel-vintage") return "Urban Exploration";
  if (reel.id === "reel-ceramics") return "Ceramics & Hand-Building";
  return "Exploration";
}

export function SkillTreeView() {
  const { reels, selectedReelId, calendar } = useRoots();
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const selectedReel = reels.find((r) => r.id === selectedReelId);

  function toggleStep(id: string) {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const skillProgress: Record<
    string,
    { completed: number; total: number; scheduled: boolean }
  > = {};
  for (const reel of reels) {
    const skill = reelSkill(reel);
    if (!skillProgress[skill])
      skillProgress[skill] = { completed: 0, total: 0, scheduled: false };
    if (calendar.some((e) => e.reelId === reel.id))
      skillProgress[skill].scheduled = true;
    if (reel.roadmap.steps) {
      skillProgress[skill].total += reel.roadmap.steps.length;
      skillProgress[skill].completed += reel.roadmap.steps.filter((s) =>
        completedSteps.has(s.id)
      ).length;
    } else if (reel.roadmap.stops) {
      skillProgress[skill].total += reel.roadmap.stops.length;
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-moss-600 font-semibold">
          Your Progress
        </p>
        <h1 className="font-display text-4xl text-ink mt-1">Skill Tree</h1>
        <p className="text-sm text-ink/55 mt-1">
          Skills you&apos;re building from your saved shorts.
        </p>
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-ink/50 mb-3">
          Skills Being Developed
        </h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {Object.entries(skillProgress).map(([skill, prog]) => {
            const pct =
              prog.total === 0
                ? prog.scheduled ? 25 : 5
                : Math.round((prog.completed / prog.total) * 100);
            return (
              <div key={skill} className="glass rounded-2xl p-4 shadow-soft">
                <div className="text-2xl">{SKILL_ICONS[skill] ?? "🌱"}</div>
                <div className="font-semibold text-ink text-sm mt-2">{skill}</div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] text-ink/50 mb-1">
                    <span>{prog.scheduled ? "In progress" : "Not started"}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-moss-100 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-moss-400 to-moss-600 transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                {prog.completed > 0 && (
                  <div className="text-[10px] text-moss-600 mt-2 font-medium">
                    {prog.completed}/{prog.total} steps complete
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {selectedReel?.roadmap.kind === "project" &&
        selectedReel.roadmap.steps && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-ink/50 mb-3">
              {selectedReel.roadmap.title} · Steps
            </h2>
            <div className="flex items-center justify-between text-[11px] text-ink/50 mb-2">
              <span>Progress</span>
              <span>
                {
                  selectedReel.roadmap.steps.filter((s) =>
                    completedSteps.has(s.id)
                  ).length
                }
                /{selectedReel.roadmap.steps.length} complete
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-moss-100 overflow-hidden mb-4">
              <div
                className="h-full bg-moss-500 transition-all duration-500"
                style={{
                  width: `${
                    (selectedReel.roadmap.steps.filter((s) =>
                      completedSteps.has(s.id)
                    ).length /
                      selectedReel.roadmap.steps.length) *
                    100
                  }%`,
                }}
              />
            </div>
            <ol className="space-y-2">
              {selectedReel.roadmap.steps.map((step) => {
                const done = completedSteps.has(step.id);
                return (
                  <li
                    key={step.id}
                    onClick={() => toggleStep(step.id)}
                    className={`flex items-start gap-3 rounded-xl p-3 border transition-colors cursor-pointer ${
                      done
                        ? "bg-moss-50 border-moss-200"
                        : "bg-white/70 border-moss-100 hover:bg-moss-50/50"
                    }`}
                  >
                    <div
                      className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        done
                          ? "bg-moss-500 border-moss-500 text-white"
                          : "border-moss-300"
                      }`}
                    >
                      {done && <span className="text-[10px]">✓</span>}
                    </div>
                    <div className="flex-1">
                      <span
                        className={`text-sm font-medium ${
                          done ? "text-ink/40 line-through" : "text-ink"
                        }`}
                      >
                        {step.title}
                      </span>
                      <div className="text-[11px] text-ink/45 mt-0.5">
                        {step.durationMin} min
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

      {selectedReel?.roadmap.kind === "route" && selectedReel.roadmap.stops && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-ink/50 mb-3">
            {selectedReel.roadmap.title} · Stops
          </h2>
          <div className="flex flex-wrap gap-2">
            {selectedReel.roadmap.stops.map((stop, i) => (
              <div
                key={stop.id}
                className="flex items-center gap-1.5 rounded-full border border-moss-100 bg-white/80 px-3 py-1 text-xs"
              >
                <span className="w-4 h-4 rounded-full bg-moss-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-ink/70">{stop.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

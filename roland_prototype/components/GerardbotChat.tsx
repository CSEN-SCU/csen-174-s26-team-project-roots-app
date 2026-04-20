"use client";

import { useState, useEffect, useRef } from "react";
import { useRoots } from "@/lib/store";
import type { GroupProposal } from "@/lib/types";

export function GerardbotChat() {
  const { chat, members, proposals, activeUserId, sendMessage } = useRoots();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  return (
    <section className="glass rounded-3xl shadow-soft overflow-hidden flex flex-col h-[640px]">
      <header className="px-5 py-4 border-b border-moss-100 flex items-center justify-between bg-white/60">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-moss-500 to-moss-700 flex items-center justify-center text-white font-display text-lg">
              G
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-moss-400 border-2 border-white" />
          </div>
          <div>
            <div className="font-semibold text-ink leading-tight">
              Weekend Crew
            </div>
            <div className="text-[11px] text-ink/50 flex items-center gap-1">
              <span className="text-moss-600 font-medium">Gerardbot</span> ·{" "}
              {members.length} members · 50% Filter on
            </div>
          </div>
        </div>
        <div className="flex -space-x-2">
          {members.slice(0, 4).map((m) => (
            <div
              key={m.id}
              className={`w-7 h-7 rounded-full ${m.color} text-white text-[10px] font-semibold flex items-center justify-center border-2 border-white`}
              title={m.name}
            >
              {m.initials}
            </div>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {chat.map((msg) => {

          if (msg.kind === "proposal" && msg.proposalId) {
            const prop = proposals.find((p) => p.id === msg.proposalId);
            if (!prop) return null;
            return <ProposalCard key={msg.id} proposal={prop} />;
          }

          const isBot = msg.author === "gerardbot";
          const isMe = msg.author === activeUserId;
          const member = members.find((m) => m.id === msg.author);

          if (msg.kind === "system" || isBot) {
            return (
              <div key={msg.id} className="flex gap-2 items-start animate-slideUp">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-moss-500 to-moss-700 text-white text-xs font-display flex items-center justify-center shrink-0">
                  G
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-moss-50 border border-moss-100 px-3 py-2 text-sm text-ink/80 max-w-[80%]">
                  {msg.text}
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex gap-2 items-start animate-slideUp ${
                isMe ? "flex-row-reverse" : ""
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl text-white text-[10px] font-semibold flex items-center justify-center shrink-0 ${
                  member?.color ?? "bg-ink"
                }`}
              >
                {member?.initials ?? "?"}
              </div>
              <div
                className={`rounded-2xl px-3 py-2 text-sm max-w-[80%] ${
                  isMe
                    ? "bg-ink text-clay-50 rounded-tr-sm"
                    : "bg-white border border-moss-100 text-ink/85 rounded-tl-sm"
                }`}
              >
                {!isMe && (
                  <div className="text-[10px] uppercase tracking-wider opacity-60 mb-0.5">
                    {member?.name}
                  </div>
                )}
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(draft);
          setDraft("");
        }}
        className="border-t border-moss-100 bg-white/60 p-3 flex gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message the crew…"
          className="flex-1 rounded-xl border border-moss-100 bg-white px-3 py-2 text-sm outline-none focus:border-moss-300"
        />
        <button
          type="submit"
          className="rounded-xl bg-moss-500 text-white text-sm px-4 py-2 hover:bg-moss-600"
        >
          Send
        </button>
      </form>
    </section>
  );
}

function ProposalCard({ proposal }: { proposal: GroupProposal }) {
  const { members, castVote, retractVote, activeUserId } = useRoots();
  const yes = proposal.votes.filter((v) => v.vote === "yes").length;
  const no = proposal.votes.filter((v) => v.vote === "no").length;
  const total = proposal.votes.length;
  const pct = total === 0 ? 0 : (yes / total) * 100;
  const myVote = proposal.votes.find((v) => v.memberId === activeUserId)?.vote;
  const passed = proposal.status === "scheduled";

  return (
    <div className="ml-9 rounded-2xl border border-moss-200 bg-gradient-to-br from-white to-moss-50 p-4 animate-slideUp shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.16em] text-moss-700 font-semibold">
          {passed ? "Scheduled · group plan" : "Proposed plan"}
        </span>
        {passed && <span className="text-xs text-moss-700">✓ Passed</span>}
      </div>
      <div className="font-display text-lg text-ink mt-1 leading-tight">
        {proposal.title}
      </div>
      <p className="text-sm text-ink/65 mt-1">{proposal.blurb}</p>

      {/* 50% filter bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] text-ink/55 mb-1">
          <span>
            👍 {yes} · 👎 {no} · {total - yes - no} pending
          </span>
          <span>50% Filter</span>
        </div>
        <div className="relative h-2.5 rounded-full bg-moss-100 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-moss-400 to-moss-600 transition-all"
            style={{ width: `${pct}%` }}
          />
          {/* 50% threshold marker */}
          <div className="absolute inset-y-0 left-1/2 w-px bg-clay-500" />
        </div>
        <div className="text-[10px] text-ink/40 mt-1">
          {pct.toFixed(0)}% of group · auto-schedules above 50%
        </div>
      </div>

      {/* Avatar row showing votes */}
      <div className="mt-3 flex items-center gap-1.5">
        {proposal.votes.map((v) => {
          const m = members.find((mm) => mm.id === v.memberId)!;
          return (
            <div
              key={v.memberId}
              className={`relative w-8 h-8 rounded-full ${m.color} text-white text-[10px] font-semibold flex items-center justify-center border-2 ${
                v.vote === "yes"
                  ? "border-moss-500"
                  : v.vote === "no"
                  ? "border-red-400 opacity-60"
                  : "border-white opacity-60"
              }`}
              title={`${m.name} · ${v.vote ?? "pending"}`}
            >
              {m.initials}
              {v.vote === "yes" && (
                <span className="absolute -bottom-1 -right-1 text-[10px] bg-white rounded-full w-4 h-4 flex items-center justify-center">
                  ✓
                </span>
              )}
            </div>
          );
        })}
      </div>

      {!passed && (
        <div className="mt-4 flex items-center gap-2">
          <button
            disabled={myVote === "yes"}
            onClick={() => castVote(proposal.id, activeUserId, "yes")}
            className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${
              myVote === "yes"
                ? "bg-moss-500 text-white"
                : "bg-white border border-moss-200 text-ink hover:bg-moss-50"
            }`}
          >
            👍 I'm in
          </button>
          <button
            disabled={myVote === "no"}
            onClick={() => castVote(proposal.id, activeUserId, "no")}
            className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${
              myVote === "no"
                ? "bg-red-400 text-white"
                : "bg-white border border-moss-200 text-ink hover:bg-moss-50"
            }`}
          >
            👎 Pass
          </button>
          <SimulateOthersButton proposalId={proposal.id} />
        </div>
      )}

      {passed && (
        <div className="mt-3 space-y-2">
          <div className="rounded-lg bg-moss-500 text-white text-xs px-3 py-2 flex items-center gap-2">
            <span>🌱</span>
            <span>Auto-added to group calendar — Gerardbot will text reminders 24h before.</span>
          </div>
          {myVote !== null && (
            <button
              onClick={() => retractVote(proposal.id, activeUserId)}
              className="w-full rounded-lg border border-clay-200 bg-clay-50 text-clay-600 text-xs py-1.5 hover:bg-clay-100 transition"
            >
              ↩ Withdraw my vote
            </button>
          )}
          {myVote === null && (
            <div className="flex gap-2">
              <button
                onClick={() => castVote(proposal.id, activeUserId, "yes")}
                className="flex-1 rounded-lg border border-moss-200 bg-white text-ink text-xs py-1.5 hover:bg-moss-50 transition"
              >
                👍 I&apos;m back in
              </button>
              <button
                onClick={() => castVote(proposal.id, activeUserId, "no")}
                className="flex-1 rounded-lg border border-moss-200 bg-white text-ink text-xs py-1.5 hover:bg-moss-50 transition"
              >
                👎 Still out
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SimulateOthersButton({ proposalId }: { proposalId: string }) {
  const { castVote, proposals, members } = useRoots();
  const proposal = proposals.find((p) => p.id === proposalId);
  if (!proposal) return null;
  const undecided = proposal.votes.filter((v) => v.vote === null);

  if (undecided.length === 0) return null;

  return (
    <button
      onClick={() => {
        const next = undecided[0];
        if (next) castVote(proposalId, next.memberId, "yes");
      }}
      className="rounded-xl bg-clay-100 border border-clay-200 text-clay-600 text-xs px-3 py-2 hover:bg-clay-200"
      title="Simulate next group member voting"
    >
      ⚡ Sim vote
    </button>
  );
}

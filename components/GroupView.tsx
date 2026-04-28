"use client";

import { useState, useEffect, useRef } from "react";
import { useRoots } from "@/lib/store";
import type { GroupProposal } from "@/lib/types";

export function GroupView() {
  const { chat, members, proposals, activeUserId, sendMessage, castVote, calendar } = useRoots();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="grid lg:grid-cols-[1fr_280px] gap-5 h-[calc(100vh-120px)]">

        {/* Main chat panel */}
        <div className="glass rounded-3xl shadow-soft overflow-hidden flex flex-col">
          <header className="px-6 py-4 border-b border-moss-100 bg-white/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-moss-500 to-moss-700 flex items-center justify-center text-white font-display text-lg">
                G
              </div>
              <div>
                <div className="font-semibold text-ink">Weekend Crew</div>
                <div className="text-[11px] text-ink/50">
                  <span className="text-moss-600 font-medium">Gerardbot</span> · {members.length} members · 50% Filter on
                </div>
              </div>
            </div>
            <div className="flex -space-x-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className={`w-8 h-8 rounded-full ${m.color} text-white text-[10px] font-semibold flex items-center justify-center border-2 border-white`}
                  title={m.name}
                >
                  {m.initials}
                </div>
              ))}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {chat.map((msg) => {
              if (msg.kind === "proposal" && msg.proposalId) {
                const prop = proposals.find((p) => p.id === msg.proposalId);
                if (!prop) return null;
                return <FullProposalCard key={msg.id} proposal={prop} />;
              }

              const isBot = msg.author === "gerardbot";
              const isMe = msg.author === activeUserId;
              const member = members.find((m) => m.id === msg.author);

              if (msg.kind === "system" || isBot) {
                return (
                  <div key={msg.id} className="flex gap-3 items-start animate-slideUp">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-moss-500 to-moss-700 text-white text-xs font-display flex items-center justify-center shrink-0">
                      G
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-moss-50 border border-moss-100 px-4 py-2.5 text-sm text-ink/80 max-w-[75%]">
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-ink/30 self-end pb-1">
                      {new Date(msg.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 items-start animate-slideUp ${isMe ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl text-white text-[10px] font-semibold flex items-center justify-center shrink-0 ${member?.color ?? "bg-ink"}`}
                  >
                    {member?.initials ?? "?"}
                  </div>
                  <div className={`flex flex-col ${isMe ? "items-end" : ""} max-w-[75%]`}>
                    {!isMe && (
                      <span className="text-[10px] uppercase tracking-wider text-ink/40 mb-1 ml-1">
                        {member?.name}
                      </span>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm ${
                        isMe
                          ? "bg-ink text-clay-50 rounded-tr-sm"
                          : "bg-white border border-moss-100 text-ink/85 rounded-tl-sm"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-ink/30 mt-1 px-1">
                      {new Date(msg.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </span>
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
            className="border-t border-moss-100 bg-white/60 p-4 flex gap-3"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Message the crew…"
              className="flex-1 rounded-xl border border-moss-100 bg-white px-4 py-2.5 text-sm outline-none focus:border-moss-300"
            />
            <button
              type="submit"
              className="rounded-xl bg-moss-500 text-white text-sm px-5 py-2.5 hover:bg-moss-600"
            >
              Send
            </button>
          </form>
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-4">
          {/* Members */}
          <div className="glass rounded-3xl p-5 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss-600">Members</p>
            <ul className="mt-3 space-y-2">
              {members.map((m) => {
                const isMe = m.id === activeUserId;
                return (
                  <li key={m.id} className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full ${m.color} text-white text-xs font-semibold flex items-center justify-center border-2 border-white shadow-sm`}>
                      {m.initials}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-ink">{m.name}{isMe && <span className="ml-1 text-[10px] text-moss-600">(you)</span>}</div>
                      <div className="text-[11px] text-ink/45">Active</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Group Calendar */}
          <div className="glass rounded-3xl p-5 shadow-soft flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss-600">Group Plans</p>
            {calendar.filter((e) => e.source === "group").length === 0 ? (
              <p className="text-sm text-ink/45 mt-3">No group events yet. Vote to schedule one.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {calendar
                  .filter((e) => e.source === "group")
                  .map((e) => (
                    <li key={e.id} className="rounded-xl bg-clay-50 border border-clay-100 p-3">
                      <div className="text-sm font-medium text-ink">{e.title}</div>
                      <div className="text-[11px] text-clay-600 mt-0.5">
                        {new Date(e.startsAt).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function FullProposalCard({ proposal }: { proposal: GroupProposal }) {
  const { members, castVote, retractVote, activeUserId } = useRoots();
  const yes = proposal.votes.filter((v) => v.vote === "yes").length;
  const no = proposal.votes.filter((v) => v.vote === "no").length;
  const total = proposal.votes.length;
  const pct = total === 0 ? 0 : (yes / total) * 100;
  const myVote = proposal.votes.find((v) => v.memberId === activeUserId)?.vote;
  const passed = proposal.status === "scheduled";
  const undecided = proposal.votes.filter((v) => v.vote === null);

  return (
    <div className="ml-11 rounded-2xl border border-moss-200 bg-gradient-to-br from-white to-moss-50 p-5 shadow-soft animate-slideUp">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.16em] text-moss-700 font-semibold">
          {passed ? "Scheduled · group plan" : "Proposed plan"}
        </span>
        {passed && <span className="text-xs text-moss-700">✓ Passed</span>}
      </div>
      <div className="font-display text-xl text-ink mt-1">{proposal.title}</div>
      <p className="text-sm text-ink/65 mt-1">{proposal.blurb}</p>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] text-ink/55 mb-1">
          <span>👍 {yes} · 👎 {no} · {total - yes - no} pending</span>
          <span>50% Filter</span>
        </div>
        <div className="relative h-3 rounded-full bg-moss-100 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-moss-400 to-moss-600 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
          <div className="absolute inset-y-0 left-1/2 w-px bg-clay-500" />
        </div>
        <div className="text-[10px] text-ink/40 mt-1">{pct.toFixed(0)}% of group · auto-schedules above 50%</div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {proposal.votes.map((v) => {
          const m = members.find((mm) => mm.id === v.memberId)!;
          return (
            <div
              key={v.memberId}
              className={`relative w-9 h-9 rounded-full ${m.color} text-white text-[10px] font-semibold flex items-center justify-center border-2 ${
                v.vote === "yes" ? "border-moss-500" : v.vote === "no" ? "border-red-400 opacity-60" : "border-white opacity-60"
              }`}
              title={`${m.name} · ${v.vote ?? "pending"}`}
            >
              {m.initials}
              {v.vote === "yes" && (
                <span className="absolute -bottom-1 -right-1 text-[10px] bg-white rounded-full w-4 h-4 flex items-center justify-center">✓</span>
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
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition ${
              myVote === "yes" ? "bg-moss-500 text-white" : "bg-white border border-moss-200 text-ink hover:bg-moss-50"
            }`}
          >
            👍 I&apos;m in
          </button>
          <button
            disabled={myVote === "no"}
            onClick={() => castVote(proposal.id, activeUserId, "no")}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition ${
              myVote === "no" ? "bg-red-400 text-white" : "bg-white border border-moss-200 text-ink hover:bg-moss-50"
            }`}
          >
            👎 Pass
          </button>
          {undecided.length > 0 && (
            <button
              onClick={() => castVote(proposal.id, undecided[0].memberId, "yes")}
              className="rounded-xl bg-clay-100 border border-clay-200 text-clay-600 text-xs px-3 py-2.5 hover:bg-clay-200"
            >
              ⚡ Sim vote
            </button>
          )}
        </div>
      )}

      {passed && (
        <div className="mt-4 space-y-2">
          <div className="rounded-xl bg-moss-500 text-white text-sm px-4 py-2.5 flex items-center gap-2">
            <span>🌱</span>
            <span>Auto-added to group calendar — Gerardbot will send reminders 24h before.</span>
          </div>
          {myVote !== null && (
            <button
              onClick={() => retractVote(proposal.id, activeUserId)}
              className="w-full rounded-xl border border-clay-200 bg-clay-50 text-clay-600 text-sm py-2 hover:bg-clay-100 transition"
            >
              ↩ Withdraw my vote
            </button>
          )}
          {myVote === null && (
            <div className="flex gap-2">
              <button
                onClick={() => castVote(proposal.id, activeUserId, "yes")}
                className="flex-1 rounded-xl border border-moss-200 bg-white text-ink text-sm py-2 hover:bg-moss-50 transition"
              >
                👍 I&apos;m back in
              </button>
              <button
                onClick={() => castVote(proposal.id, activeUserId, "no")}
                className="flex-1 rounded-xl border border-moss-200 bg-white text-ink text-sm py-2 hover:bg-moss-50 transition"
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

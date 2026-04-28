"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  mockChat,
  mockMembers,
  mockProposals,
  mockReels,
} from "./mockData";
import type {
  ChatMessage,
  GroupProposal,
  Reel,
} from "./types";

interface CalendarEvent {
  id: string;
  title: string;
  startsAt: string;
  source: "solo" | "group";
  reelId?: string;
  flags?: string[]; // e.g. ["Roland backed out"]
}

export type TabName = "today" | "roadmaps" | "group" | "calendar";

interface RootsState {
  reels: Reel[];
  selectedReelId: string;
  members: typeof mockMembers;
  proposals: GroupProposal[];
  chat: ChatMessage[];
  calendar: CalendarEvent[];
  activeUserId: string;
  activeTab: TabName;
  setActiveTab: (tab: TabName) => void;
  selectReel: (id: string) => void;
  addReel: (reel: Reel) => void;
  scheduleReel: (reelId: string, source?: "solo" | "group") => void;
  castVote: (proposalId: string, memberId: string, vote: "yes" | "no") => void;
  retractVote: (proposalId: string, memberId: string) => void;
  sendMessage: (text: string) => void;
}

const RootsContext = createContext<RootsState | null>(null);

export function RootsProvider({ children }: { children: React.ReactNode }) {
  const [reels, setReels] = useState<Reel[]>(mockReels);
  const [selectedReelId, setSelectedReelId] = useState<string>(mockReels[0].id);
  const [proposals, setProposals] = useState<GroupProposal[]>(mockProposals);
  const [chat, setChat] = useState<ChatMessage[]>(mockChat);
  const [calendar, setCalendar] = useState<CalendarEvent[]>([]);
  const [activeTab, setActiveTab] = useState<TabName>("today");
  const activeUserId = "u-roland";

  const handleSetActiveTab = useCallback((tab: TabName) => setActiveTab(tab), []);
  const selectReel = useCallback((id: string) => setSelectedReelId(id), []);

  const addReel = useCallback((reel: Reel) => {
    setReels((prev) => [reel, ...prev]);
    setSelectedReelId(reel.id);
  }, []);

  const scheduleReel = useCallback(
    (reelId: string, source: "solo" | "group" = "solo") => {
      setReels((prev) => {
        const reel = prev.find((r) => r.id === reelId);
        if (!reel) return prev;
        setCalendar((cal) => {
          if (cal.some((e) => e.reelId === reelId)) return cal;
          return [
            ...cal,
            {
              id: `evt-${reelId}-${Date.now()}`,
              title: reel.roadmap.title,
              startsAt:
                reel.roadmap.scheduledFor ?? new Date().toISOString(),
              source,
              reelId,
            },
          ];
        });
        return prev;
      });
    },
    []
  );

  const castVote = useCallback(
    (proposalId: string, memberId: string, vote: "yes" | "no") => {
      setProposals((prev) =>
        prev.map((p) => {
          if (p.id !== proposalId) return p;
          const nextVotes = p.votes.map((v) =>
            v.memberId === memberId ? { ...v, vote } : v
          );
          const yes = nextVotes.filter((v) => v.vote === "yes").length;
          const total = nextVotes.length;
          const passes = total > 0 && yes / total > 0.5;
          const next: GroupProposal = {
            ...p,
            votes: nextVotes,
            status: passes ? "scheduled" : p.status,
            scheduledFor: passes
              ? p.scheduledFor ?? new Date().toISOString()
              : p.scheduledFor,
          };
          if (passes && p.status !== "scheduled") {
            queueMicrotask(() => {
              setChat((c) => [
                ...c,
                {
                  id: `m-${Date.now()}`,
                  author: "gerardbot",
                  text: `🌱 Plan passed the 50% Filter (${yes}/${total} yes). Added to the group calendar.`,
                  kind: "system",
                  timestamp: new Date().toISOString(),
                },
              ]);
              setCalendar((cal) => {
                if (cal.some((e) => e.reelId === p.reelId)) return cal;
                const reel = reels.find((r) => r.id === p.reelId);
                return [
                  ...cal,
                  {
                    id: `evt-grp-${p.id}-${Date.now()}`,
                    title: p.title,
                    startsAt:
                      reel?.roadmap.scheduledFor ?? new Date().toISOString(),
                    source: "group",
                    reelId: p.reelId,
                  },
                ];
              });
            });
          }

          // Re-joining after withdrawal: remove their flag from the calendar event
          if (p.status === "scheduled") {
            const member = mockMembers.find((m) => m.id === memberId);
            const flagText = `${member?.name ?? "Someone"} backed out`;
            queueMicrotask(() => {
              setCalendar((cal) => {
                const evt = cal.find((e) => e.reelId === p.reelId);
                if (!evt?.flags?.includes(flagText)) return cal;
                setChat((c) => [
                  ...c,
                  {
                    id: `m-${Date.now()}`,
                    author: "gerardbot",
                    text: `✅ ${member?.name ?? "Someone"} is back in for "${p.title}"!`,
                    kind: "system",
                    timestamp: new Date().toISOString(),
                  },
                ]);
                return cal.map((e) =>
                  e.reelId === p.reelId
                    ? { ...e, flags: (e.flags ?? []).filter((f) => f !== flagText) }
                    : e
                );
              });
            });
          }

          return next;
        })
      );
    },
    [reels]
  );

  const retractVote = useCallback(
    (proposalId: string, memberId: string) => {
      setProposals((prev) =>
        prev.map((p) => {
          if (p.id !== proposalId) return p;
          const prevVote = p.votes.find((v) => v.memberId === memberId)?.vote;
          if (prevVote === null) return p; // nothing to retract
          const nextVotes = p.votes.map((v) =>
            v.memberId === memberId ? { ...v, vote: null } : v
          );
          queueMicrotask(() => {
            const member = mockMembers.find((m) => m.id === memberId);
            const name = member?.name ?? "Someone";
            setChat((c) => [
              ...c,
              {
                id: `m-${Date.now()}`,
                author: "gerardbot",
                text: `⚠️ ${name} withdrew their vote from "${p.title}". The plan stays on the calendar but has been flagged.`,
                kind: "system",
                timestamp: new Date().toISOString(),
              },
            ]);
            // Flag the calendar event instead of removing it
            setCalendar((cal) =>
              cal.map((e) =>
                e.reelId === p.reelId
                  ? {
                      ...e,
                      flags: [...(e.flags ?? []), `${name} backed out`],
                    }
                  : e
              )
            );
          });
          return { ...p, votes: nextVotes };
        })
      );
    },
    []
  );

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      setChat((c) => [
        ...c,
        {
          id: `m-${Date.now()}`,
          author: activeUserId,
          text,
          kind: "text",
          timestamp: new Date().toISOString(),
        },
      ]);
    },
    [activeUserId]
  );

  const value = useMemo<RootsState>(
    () => ({
      reels,
      selectedReelId,
      members: mockMembers,
      proposals,
      chat,
      calendar,
      activeUserId,
      activeTab,
      setActiveTab: handleSetActiveTab,
      selectReel,
      addReel,
      scheduleReel,
      castVote,
      retractVote,
      sendMessage,
    }),
    [
      reels,
      selectedReelId,
      proposals,
      chat,
      calendar,
      activeTab,
      handleSetActiveTab,
      selectReel,
      addReel,
      scheduleReel,
      castVote,
      retractVote,
      sendMessage,
    ]
  );

  return (
    <RootsContext.Provider value={value}>{children}</RootsContext.Provider>
  );
}

export function useRoots() {
  const ctx = useContext(RootsContext);
  if (!ctx) throw new Error("useRoots must be used within RootsProvider");
  return ctx;
}

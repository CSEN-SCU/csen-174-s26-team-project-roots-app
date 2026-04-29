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
  flags?: string[];
}

export interface PendingSchedule {
  reelId: string;
  title: string;
  suggestedDate: string;
}

export type TabName = "schedule" | "calendar";

interface RootsState {
  reels: Reel[];
  selectedReelId: string;
  members: typeof mockMembers;
  proposals: GroupProposal[];
  chat: ChatMessage[];
  calendar: CalendarEvent[];
  activeUserId: string;
  activeTab: TabName;
  pendingSchedule: PendingSchedule | null;
  setActiveTab: (tab: TabName) => void;
  selectReel: (id: string) => void;
  addReel: (reel: Reel) => void;
  scheduleReel: (reelId: string, date: string) => void;
  setPendingSchedule: (p: PendingSchedule | null) => void;
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
  const [activeTab, setActiveTab] = useState<TabName>("schedule");
  const [pendingSchedule, setPendingScheduleState] = useState<PendingSchedule | null>(null);
  const activeUserId = "u-roland";

  const handleSetActiveTab = useCallback((tab: TabName) => setActiveTab(tab), []);
  const selectReel = useCallback((id: string) => setSelectedReelId(id), []);
  const setPendingSchedule = useCallback((p: PendingSchedule | null) => setPendingScheduleState(p), []);

  const addReel = useCallback((reel: Reel) => {
    setReels((prev) => [reel, ...prev]);
    setSelectedReelId(reel.id);
  }, []);

  const scheduleReel = useCallback((reelId: string, date: string) => {
    setReels((prev) => {
      const reel = prev.find((r) => r.id === reelId);
      if (!reel) return prev;
      setCalendar((cal) => {
        const without = cal.filter((e) => e.reelId !== reelId);
        return [
          ...without,
          {
            id: `evt-${reelId}-${Date.now()}`,
            title: reel.roadmap.title,
            startsAt: date,
            source: "solo",
            reelId,
          },
        ];
      });
      return prev;
    });
  }, []);

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
          return {
            ...p,
            votes: nextVotes,
            status: passes ? "scheduled" : p.status,
            scheduledFor: passes ? p.scheduledFor ?? new Date().toISOString() : p.scheduledFor,
          } as GroupProposal;
        })
      );
    },
    []
  );

  const retractVote = useCallback((proposalId: string, memberId: string) => {
    setProposals((prev) =>
      prev.map((p) => {
        if (p.id !== proposalId) return p;
        const prevVote = p.votes.find((v) => v.memberId === memberId)?.vote;
        if (prevVote === null) return p;
        return {
          ...p,
          votes: p.votes.map((v) =>
            v.memberId === memberId ? { ...v, vote: null } : v
          ),
        };
      })
    );
  }, []);

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
      pendingSchedule,
      setActiveTab: handleSetActiveTab,
      selectReel,
      addReel,
      scheduleReel,
      setPendingSchedule,
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
      pendingSchedule,
      handleSetActiveTab,
      selectReel,
      addReel,
      scheduleReel,
      setPendingSchedule,
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

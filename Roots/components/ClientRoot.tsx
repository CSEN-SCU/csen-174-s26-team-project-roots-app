"use client";

import { useState, useEffect } from "react";
import { getSession, clearSession, type UserSession } from "@/lib/auth";
import { LoginPage } from "./LoginPage";
import { RootsProvider } from "@/lib/store";
import { TopBar } from "./TopBar";
import { ScheduleView } from "./ScheduleView";
import { CalendarView } from "./CalendarView";
import { ActiveTabRouter } from "./ActiveTabRouter";

export function ClientRoot() {
  // "loading" prevents a flash of login before localStorage is read
  const [session, setSession] = useState<UserSession | null | "loading">("loading");

  useEffect(() => {
    setSession(getSession());
  }, []);

  if (session === "loading") return null;

  if (!session) {
    return <LoginPage onAuth={(s) => setSession(s)} />;
  }

  function handleLogout() {
    clearSession();
    setSession(null);
  }

  return (
    // key ensures a fresh provider (and fresh reel state) whenever the user changes
    <RootsProvider key={session.userId} userId={session.userId} userName={session.name}>
      <TopBar onLogout={handleLogout} />
      <ActiveTabRouter
        schedule={<ScheduleView />}
        calendar={<CalendarView />}
      />
    </RootsProvider>
  );
}

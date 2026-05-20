"use client";

import { useState, useEffect } from "react";
import { getSession, clearSession, onAuthStateChange, type UserSession } from "@/lib/auth";
import { LoginPage } from "./LoginPage";
import { RootsProvider } from "@/lib/store";
import { TopBar } from "./TopBar";
import { ScheduleView } from "./ScheduleView";
import { CalendarView } from "./CalendarView";
import { ActiveTabRouter } from "./ActiveTabRouter";

export function ClientRoot() {
  const [session, setSession] = useState<UserSession | null | "loading">("loading");

  useEffect(() => {
    getSession().then(setSession);
    return onAuthStateChange((s) => setSession(s ?? null));
  }, []);

  if (session === "loading") return null;

  if (!session) {
    return <LoginPage onAuth={(s) => setSession(s)} />;
  }

  async function handleLogout() {
    await clearSession();
    setSession(null);
  }

  return (
    <RootsProvider key={session.userId} userId={session.userId} userName={session.name}>
      <TopBar onLogout={handleLogout} />
      <ActiveTabRouter
        schedule={<ScheduleView />}
        calendar={<CalendarView />}
      />
    </RootsProvider>
  );
}

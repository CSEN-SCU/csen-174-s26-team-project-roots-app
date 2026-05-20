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
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      getSession()
        .then(setSession)
        .catch((err: Error) => {
          setConfigError(err.message);
          setSession(null);
        });
      unsub = onAuthStateChange((s) => setSession(s ?? null));
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : String(err));
      setSession(null);
    }
    return () => unsub?.();
  }, []);

  if (configError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="glass rounded-3xl p-8 max-w-md shadow-soft">
          <h1 className="font-display text-xl text-ink mb-2">Configuration error</h1>
          <p className="text-sm text-ink/60 font-mono break-all">{configError}</p>
        </div>
      </div>
    );
  }

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

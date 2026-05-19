"use client";

import { useState } from "react";
import { login, register, type UserSession } from "@/lib/auth";
import { Logo } from "./Logo";

type Mode = "login" | "register";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function LoginPage({ onAuth }: { onAuth: (session: UserSession) => void }) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function clearError() {
    if (error) setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "register" && name.trim().length < 2) {
      setError("Please enter your name (at least 2 characters).");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const result =
        mode === "login"
          ? await login(email, password)
          : await register(email, name, password);

      if (result.ok && result.session) {
        onAuth(result.session);
      } else {
        setError(result.error ?? (mode === "login" ? "Login failed." : "Registration failed."));
      }
    } finally {
      setLoading(false);
    }
  }

  function switchToRegister() {
    setMode("register");
    setError(null);
  }

  function switchToLogin() {
    setMode("login");
    setError(null);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>

        <div className="glass rounded-3xl p-8 shadow-soft animate-slideUp">
          <h1 className="font-display text-2xl text-ink leading-tight">
            {mode === "login" ? "Welcome back." : "Create your account."}
          </h1>
          <p className="text-sm text-ink/55 mt-1 mb-6">
            {mode === "login"
              ? "Sign in to see your saved inspirations."
              : "Your reels and plans will be saved to your account."}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
            {mode === "register" && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-moss-600 mb-1.5">
                  Your name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); clearError(); }}
                  required
                  autoComplete="name"
                  placeholder="First name"
                  className="w-full rounded-2xl border border-moss-100 bg-white/80 px-4 py-2.5 text-sm outline-none focus:shadow-glow transition placeholder:text-ink/35"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-moss-600 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError(); }}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-moss-100 bg-white/80 px-4 py-2.5 text-sm outline-none focus:shadow-glow transition placeholder:text-ink/35"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-moss-600 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError(); }}
                required
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="••••••••"
                className="w-full rounded-2xl border border-moss-100 bg-white/80 px-4 py-2.5 text-sm outline-none focus:shadow-glow transition placeholder:text-ink/35"
              />
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">
                ⚠️ {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 rounded-2xl bg-ink text-clay-50 font-medium px-5 py-3 text-sm hover:bg-moss-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="inline-block h-3 w-3 rounded-full border-2 border-clay-50 border-t-transparent animate-spin" />
                  {mode === "login" ? "Signing in…" : "Creating account…"}
                </>
              ) : mode === "login" ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </button>

            {mode === "login" && (
              <button
                type="button"
                onClick={switchToRegister}
                className="text-sm text-center text-ink/55 hover:text-ink transition pt-1"
              >
                No account?{" "}
                <span className="text-moss-600 font-medium underline underline-offset-2">
                  Register here
                </span>
              </button>
            )}

            {mode === "register" && (
              <button
                type="button"
                onClick={switchToLogin}
                className="text-sm text-center text-ink/55 hover:text-ink transition pt-1"
              >
                Already have an account?{" "}
                <span className="text-moss-600 font-medium underline underline-offset-2">
                  Sign in
                </span>
              </button>
            )}
          </form>
        </div>

        {mode === "register" && name.trim().length >= 2 && (
          <p className="text-center text-xs text-ink/40 mt-4">
            Signing up as{" "}
            <span className="font-semibold text-ink/60">
              {getInitials(name)} · {name.trim()}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

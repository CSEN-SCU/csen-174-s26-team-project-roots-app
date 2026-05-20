import { getSupabaseClient } from "./supabase";

export interface UserSession {
  userId: string;
  email: string;
  name: string;
}

function sessionFromSupabase(user: { id: string; email?: string; user_metadata?: Record<string, string> }): UserSession {
  return {
    userId: user.id,
    email: user.email ?? "",
    name: user.user_metadata?.name ?? user.email?.split("@")[0] ?? "User",
  };
}

export async function getSession(): Promise<UserSession | null> {
  const { data: { session } } = await getSupabaseClient().auth.getSession();
  return session ? sessionFromSupabase(session.user) : null;
}

export async function clearSession(): Promise<void> {
  await getSupabaseClient().auth.signOut();
}

export function onAuthStateChange(
  callback: (session: UserSession | null) => void
): () => void {
  const { data: { subscription } } = getSupabaseClient().auth.onAuthStateChange(
    (_event, session) => callback(session ? sessionFromSupabase(session.user) : null)
  );
  return () => subscription.unsubscribe();
}

export async function register(
  email: string,
  name: string,
  password: string
): Promise<{ ok: boolean; error?: string; session?: UserSession }> {
  const { data, error } = await getSupabaseClient().auth.signUp({
    email: email.toLowerCase().trim(),
    password,
    options: { data: { name: name.trim() } },
  });
  if (error) return { ok: false, error: error.message };
  if (!data.session) {
    return { ok: false, error: "Check your email to confirm your account, then sign in." };
  }
  return { ok: true, session: sessionFromSupabase(data.session.user) };
}

export async function login(
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string; session?: UserSession }> {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
    email: email.toLowerCase().trim(),
    password,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, session: sessionFromSupabase(data.session.user) };
}

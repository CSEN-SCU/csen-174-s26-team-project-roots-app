// Prototype auth — localStorage + SHA-256 via Web Crypto API.
// Swap for a real auth provider before production.

export interface UserSession {
  userId: string;
  email: string;
  name: string;
}

interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
}

const USERS_KEY = "roots_users";
const SESSION_KEY = "roots_session";

async function hashPassword(password: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(password)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function readUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getSession(): UserSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as UserSession) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

function writeSession(s: UserSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

export async function register(
  email: string,
  name: string,
  password: string
): Promise<{ ok: boolean; error?: string; session?: UserSession }> {
  const normalized = email.toLowerCase().trim();
  const users = readUsers();
  if (users.some((u) => u.email === normalized)) {
    return { ok: false, error: "An account with that email already exists." };
  }
  const passwordHash = await hashPassword(password);
  const user: StoredUser = {
    id: `u-${Date.now()}`,
    email: normalized,
    name: name.trim(),
    passwordHash,
  };
  writeUsers([...users, user]);
  const session: UserSession = { userId: user.id, email: user.email, name: user.name };
  writeSession(session);
  return { ok: true, session };
}

export async function login(
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string; session?: UserSession }> {
  const normalized = email.toLowerCase().trim();
  const users = readUsers();
  const user = users.find((u) => u.email === normalized);
  if (!user) return { ok: false, error: "No account found with that email." };
  const passwordHash = await hashPassword(password);
  if (user.passwordHash !== passwordHash) {
    return { ok: false, error: "Incorrect password." };
  }
  const session: UserSession = { userId: user.id, email: user.email, name: user.name };
  writeSession(session);
  return { ok: true, session };
}

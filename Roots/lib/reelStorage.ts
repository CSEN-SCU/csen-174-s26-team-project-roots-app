import type { Reel } from "./types";

const key = (userId: string) => `roots_reels_${userId}`;

export function loadReels(userId: string): Reel[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key(userId)) ?? "[]") as Reel[];
  } catch {
    return [];
  }
}

export function saveReels(userId: string, reels: Reel[]): void {
  localStorage.setItem(key(userId), JSON.stringify(reels));
}

import { getSupabaseClient } from "./supabase";
import type { Reel } from "./types";

export async function loadReels(userId: string): Promise<Reel[]> {
  const { data, error } = await getSupabaseClient()
    .from("reels")
    .select("data")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => row.data as unknown as Reel);
}

export async function upsertReel(userId: string, reel: Reel): Promise<void> {
  await getSupabaseClient().from("reels").upsert({
    id: reel.id,
    user_id: userId,
    data: reel,
    created_at: reel.createdAt,
  });
}

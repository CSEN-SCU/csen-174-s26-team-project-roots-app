import type { NextRequest } from "next/server";

/** Sliding-window hits per key (in-memory; one Node process). */
const hitsByKey = new Map<string, number[]>();

export function getRateLimitExtractSpec(): string {
  return process.env.RATE_LIMIT_EXTRACT?.trim() || "5 per hour";
}

type ParsedLimit = { max: number; windowMs: number };

const UNIT_MS: Record<string, number> = {
  second: 1000,
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
};

export function parseLimitSpec(spec: string): ParsedLimit {
  const m = spec.trim().match(/^(\d+)\s+per\s+(second|minute|hour|day)$/i);
  if (!m) {
    throw new Error(`Invalid rate limit spec: "${spec}" (e.g. "5 per hour")`);
  }
  const max = Number(m[1]);
  const unit = m[2].toLowerCase();
  const windowMs = UNIT_MS[unit];
  if (!Number.isFinite(max) || max < 1) {
    throw new Error(`Invalid rate limit count in: "${spec}"`);
  }
  return { max, windowMs };
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number };

export function checkRateLimit(key: string, spec: string): RateLimitResult {
  const { max, windowMs } = parseLimitSpec(spec);
  const now = Date.now();
  const windowStart = now - windowMs;

  const prev = hitsByKey.get(key) ?? [];
  const inWindow = prev.filter((t) => t > windowStart);

  if (inWindow.length >= max) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((inWindow[0]! + windowMs - now) / 1000)
    );
    return { allowed: false, retryAfterSec };
  }

  inWindow.push(now);
  hitsByKey.set(key, inWindow);
  return { allowed: true };
}

export function rateLimitExtract(req: NextRequest): RateLimitResult {
  const ip = getClientIp(req);
  return checkRateLimit(`extract:${ip}`, getRateLimitExtractSpec());
}

/** @internal Test helper */
export function _resetRateLimitStore(): void {
  hitsByKey.clear();
}

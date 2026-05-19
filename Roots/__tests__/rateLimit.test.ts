import type { NextRequest } from "next/server";
import {
  _resetRateLimitStore,
  checkRateLimit,
  getClientIp,
  parseLimitSpec,
  rateLimitExtract,
} from "@/lib/rateLimit";

function mockRequest(headers: Record<string, string> = {}): NextRequest {
  return {
    headers: {
      get(name: string) {
        const key = Object.keys(headers).find(
          (h) => h.toLowerCase() === name.toLowerCase()
        );
        return key ? headers[key]! : null;
      },
    },
  } as NextRequest;
}

beforeEach(() => {
  _resetRateLimitStore();
});

describe("parseLimitSpec", () => {
  test("parses per-hour limits", () => {
    expect(parseLimitSpec("5 per hour")).toEqual({
      max: 5,
      windowMs: 3_600_000,
    });
  });

  test("rejects invalid specs", () => {
    expect(() => parseLimitSpec("fast")).toThrow(/Invalid rate limit/);
  });
});

describe("checkRateLimit", () => {
  test("allows requests under the cap", () => {
    expect(checkRateLimit("a", "2 per minute").allowed).toBe(true);
    expect(checkRateLimit("a", "2 per minute").allowed).toBe(true);
  });

  test("blocks when the cap is exceeded", () => {
    expect(checkRateLimit("b", "2 per minute").allowed).toBe(true);
    expect(checkRateLimit("b", "2 per minute").allowed).toBe(true);
    const third = checkRateLimit("b", "2 per minute");
    expect(third.allowed).toBe(false);
    if (!third.allowed) {
      expect(third.retryAfterSec).toBeGreaterThan(0);
    }
  });
});

describe("getClientIp", () => {
  test("uses the first x-forwarded-for address", () => {
    const req = mockRequest({ "x-forwarded-for": "203.0.113.1, 10.0.0.1" });
    expect(getClientIp(req)).toBe("203.0.113.1");
  });

  test("falls back to x-real-ip", () => {
    const req = mockRequest({ "x-real-ip": "198.51.100.2" });
    expect(getClientIp(req)).toBe("198.51.100.2");
  });
});

describe("rateLimitExtract", () => {
  test("keys limits by client IP", () => {
    const reqA = mockRequest({ "x-forwarded-for": "1.2.3.4" });
    const reqB = mockRequest({ "x-forwarded-for": "5.6.7.8" });

    process.env.RATE_LIMIT_EXTRACT = "1 per minute";
    expect(rateLimitExtract(reqA).allowed).toBe(true);
    expect(rateLimitExtract(reqA).allowed).toBe(false);
    expect(rateLimitExtract(reqB).allowed).toBe(true);

    delete process.env.RATE_LIMIT_EXTRACT;
  });
});

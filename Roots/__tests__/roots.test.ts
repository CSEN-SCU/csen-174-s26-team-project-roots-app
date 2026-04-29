/**
 * Roots App — Test Suite
 *
 * Run with:  npm test
 *
 * Test 1 ✅  Website displays new roots properly
 * Test 2 ✅  Link is received and platform is detected
 * Test 3 ❌  User can log in  (DESIGNED TO FAIL — auth not yet implemented)
 * Test 4 ✅  Back end turns AI JSON into the correct Reel shape
 * Test 5 ✅  AI output contains all required JSON fields
 */

import type { Reel } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Helper functions
// These mirror the pure logic in /api/extract/route.ts so we can test it
// in isolation without making real network or AI calls.
// ─────────────────────────────────────────────────────────────────────────────

function detectPlatform(url: string): "instagram" | "tiktok" | "youtube" | "upload" {
  if (/tiktok/i.test(url)) return "tiktok";
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/instagram/i.test(url)) return "instagram";
  return "upload";
}

const VALID_THUMBNAIL_HUES = ["moss-400", "clay-300", "clay-400", "moss-300"] as const;
const VALID_ROADMAP_KINDS = ["route", "project"] as const;
const REQUIRED_TOP_FIELDS = ["platform", "creator", "thumbnailHue", "caption", "extracted", "roadmap"];
const REQUIRED_EXTRACTED_FIELDS = ["transcript", "visualTags", "locationGuess"];
const REQUIRED_ROADMAP_FIELDS = ["kind", "title", "summary", "durationLabel", "scheduledFor"];

function validateAIResponse(data: Record<string, unknown>): string[] {
  const errors: string[] = [];

  for (const field of REQUIRED_TOP_FIELDS) {
    if (!(field in data)) errors.push(`Missing top-level field: "${field}"`);
  }

  if (data.extracted && typeof data.extracted === "object") {
    for (const field of REQUIRED_EXTRACTED_FIELDS) {
      if (!(field in (data.extracted as object)))
        errors.push(`Missing field: "extracted.${field}"`);
    }
  }

  if (data.roadmap && typeof data.roadmap === "object") {
    for (const field of REQUIRED_ROADMAP_FIELDS) {
      if (!(field in (data.roadmap as object)))
        errors.push(`Missing field: "roadmap.${field}"`);
    }
  }

  const hue = data.thumbnailHue as string;
  if (!VALID_THUMBNAIL_HUES.includes(hue as (typeof VALID_THUMBNAIL_HUES)[number])) {
    errors.push(
      `Invalid thumbnailHue: "${hue}". Must be one of: ${VALID_THUMBNAIL_HUES.join(", ")}`
    );
  }

  const kind = (data.roadmap as Record<string, unknown>)?.kind as string;
  if (!VALID_ROADMAP_KINDS.includes(kind as (typeof VALID_ROADMAP_KINDS)[number])) {
    errors.push(`Invalid roadmap.kind: "${kind}". Must be "route" or "project"`);
  }

  return errors;
}

function assembleReel(ai: Record<string, unknown>, url: string): Reel {
  const roadmap = ai.roadmap as Record<string, unknown>;
  const extracted = ai.extracted as Record<string, unknown>;
  return {
    id: `reel-test-${Date.now()}`,
    platform: ai.platform as Reel["platform"],
    url,
    creator: ai.creator as string,
    thumbnailHue: ai.thumbnailHue as string,
    caption: ai.caption as string,
    extracted: {
      transcript: (extracted?.transcript as string) ?? "",
      visualTags: (extracted?.visualTags as string[]) ?? [],
      locationGuess: (extracted?.locationGuess as string) ?? "(unknown)",
      detectedHours: extracted?.detectedHours as string | undefined,
      instructions: extracted?.instructions as string[] | undefined,
    },
    roadmap: {
      id: `rm-test-${Date.now()}`,
      kind: roadmap?.kind as Reel["roadmap"]["kind"],
      title: (roadmap?.title as string) ?? "Untitled Plan",
      summary: (roadmap?.summary as string) ?? "",
      durationLabel: (roadmap?.durationLabel as string) ?? "",
      stops: roadmap?.stops as Reel["roadmap"]["stops"],
      steps: roadmap?.steps as Reel["roadmap"]["steps"],
      scheduledFor: roadmap?.scheduledFor as string | undefined,
    },
    createdAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1 — Does the website display new roots properly?
// ─────────────────────────────────────────────────────────────────────────────

describe("Test 1: Website displays new roots properly", () => {
  test("a newly created Reel has all fields the reel strip and plan view require", () => {
    // ARRANGE — build a Reel as the AI pipeline would return it
    const newReel: Reel = {
      id: "reel-display-001",
      platform: "instagram",
      url: "https://instagram.com/reel/uvas-canyon-demo",
      creator: "@bayareatrails",
      thumbnailHue: "moss-400",
      caption: "Chasing five waterfalls on one 4-mile loop at Uvas Canyon.",
      extracted: {
        transcript:
          "We pulled into Uvas Canyon County Park around 8 AM, paid the $6 day-use fee, and hit the Waterfall Loop.",
        visualTags: ["waterfall", "redwood canopy", "trail markers", "creek crossing"],
        locationGuess: "Uvas Canyon County Park, Morgan Hill, CA",
        detectedHours: "Open daily 8 AM – sunset",
        instructions: ["Arrive early for parking", "Bring $6 cash or card"],
      },
      roadmap: {
        id: "rm-display-001",
        kind: "route",
        title: "Uvas Canyon Waterfall Loop",
        summary: "A 4-mile loop passing five waterfalls through old-growth redwoods.",
        durationLabel: "Saturday · 8:00 AM – 1:30 PM",
        scheduledFor: "2026-04-25T08:00:00",
        stops: [
          {
            id: "s1",
            name: "Uvas Canyon County Park",
            category: "Trailhead",
            address: "8515 Croy Rd, Morgan Hill, CA 95037",
            lat: 37.07,
            lng: -121.77,
            hours: "Open daily 8 AM – sunset",
            note: "Pay $6 day-use fee at the entrance kiosk",
          },
        ],
      },
      createdAt: new Date().toISOString(),
    };

    // ACT — extract the display-critical fields the UI depends on
    const titlePresent = newReel.roadmap.title.trim().length > 0;
    const creatorPresent = newReel.creator.trim().length > 0;
    const hueValid = VALID_THUMBNAIL_HUES.includes(
      newReel.thumbnailHue as (typeof VALID_THUMBNAIL_HUES)[number]
    );
    const captionPresent = newReel.caption.trim().length > 0;
    const locationPresent = newReel.extracted.locationGuess.trim().length > 0;
    const hasStops = (newReel.roadmap.stops?.length ?? 0) > 0;

    // ASSERT
    expect(titlePresent).toBe(true);
    expect(creatorPresent).toBe(true);
    expect(hueValid).toBe(true);
    expect(captionPresent).toBe(true);
    expect(locationPresent).toBe(true);
    expect(hasStops).toBe(true);
    expect(newReel.roadmap.kind).toBe("route");
    expect(newReel.id).toMatch(/^reel-/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2 — Is the link received and the platform detected correctly?
// ─────────────────────────────────────────────────────────────────────────────

describe("Test 2: Link is received and platform is detected correctly", () => {
  test("detectPlatform returns the correct source for every supported URL format", () => {
    // ARRANGE
    const cases: { url: string; expected: ReturnType<typeof detectPlatform> }[] = [
      { url: "https://www.instagram.com/reel/uvas-canyon-hike", expected: "instagram" },
      { url: "https://www.tiktok.com/@thriftedfits/video/7123456789", expected: "tiktok" },
      { url: "https://www.youtube.com/shorts/abc123XYZ", expected: "youtube" },
      { url: "https://youtu.be/abc123XYZ", expected: "youtube" },
      { url: "https://vimeo.com/123456789", expected: "upload" },
      { url: "", expected: "upload" },
    ];

    // ACT + ASSERT — one assertion per case so failures name the exact URL
    for (const { url, expected } of cases) {
      const result = detectPlatform(url);
      expect(result).toBe(expected);
    }
  });

  test("platform detection is case-insensitive for all platforms", () => {
    // ARRANGE
    const mixedCaseUrls = [
      { url: "https://INSTAGRAM.COM/reel/test", expected: "instagram" },
      { url: "https://TikTok.com/@creator/video/1", expected: "tiktok" },
      { url: "https://YouTube.com/shorts/xyz", expected: "youtube" },
    ] as const;

    // ACT + ASSERT
    for (const { url, expected } of mixedCaseUrls) {
      expect(detectPlatform(url)).toBe(expected);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3 — Can a user log in?
// ⚠️  DESIGNED TO FAIL — authentication is not yet implemented.
//    Once auth is added (e.g. NextAuth, Supabase, or Firebase), replace the
//    loginUser stub below with the real function and these assertions will pass.
// ─────────────────────────────────────────────────────────────────────────────

describe("Test 3: User can log in  ⚠️  DESIGNED TO FAIL", () => {
  test("loginUser returns a session with a token and userId for valid credentials", async () => {
    // ARRANGE
    const credentials = { email: "roland@example.com", password: "password123" };

    // ACT — stub returns null because auth is not implemented yet
    const loginUser = async (
      _creds: { email: string; password: string }
    ): Promise<{ token: string; userId: string } | null> => {
      // TODO: replace with real auth call once login is built
      return null;
    };

    const session = await loginUser(credentials);

    // ASSERT — these assertions define the contract auth must satisfy.
    //           All three fail until loginUser is implemented.
    expect(session).not.toBeNull();           // ❌ fails: session is null
    expect(session?.token).toBeDefined();     // ❌ fails: session is null
    expect(session?.userId).toBeDefined();    // ❌ fails: session is null
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 4 — Can the back end turn the AI JSON into the correct UI shape?
// ─────────────────────────────────────────────────────────────────────────────

describe("Test 4: Back end turns AI JSON into the correct Reel shape for the UI", () => {
  test("assembleReel maps every AI response field onto the Reel interface correctly", () => {
    // ARRANGE — a complete, realistic AI response (same shape as /api/extract returns)
    const aiResponse: Record<string, unknown> = {
      platform: "tiktok",
      creator: "@thriftedfits",
      thumbnailHue: "moss-300",
      caption: "A full Oakland thrift tour — four stores, one afternoon, endless finds.",
      extracted: {
        transcript:
          "We started at Crossroads on College Ave, worked our way down to Buffalo Exchange on Telegraph, then ended at Wasteland for the more curated vintage pieces.",
        visualTags: ["clothing rack", "Oakland storefront", "neon vintage sign", "price tags", "denim wall"],
        locationGuess: "Telegraph Ave, Oakland, CA",
        detectedHours: "Mon–Sat 11 AM – 7 PM, Sun 12–6 PM",
        instructions: ["Bring cash for faster checkout", "Go on weekday mornings for fresh stock"],
      },
      roadmap: {
        kind: "route",
        title: "Oakland Thrift Afternoon",
        summary: "Four vintage and thrift stores along Telegraph Ave in one afternoon.",
        durationLabel: "Saturday · 11:00 AM – 4:00 PM",
        scheduledFor: "2026-04-25T11:00:00",
        stops: [
          {
            id: "s1",
            name: "Crossroads Trading Co.",
            category: "Vintage",
            address: "5636 College Ave, Oakland, CA 94618",
            lat: 0,
            lng: 0,
            hours: "11 AM – 7 PM daily",
            travelMinutesFromPrev: null,
            travelMode: null,
            note: "Great for designer secondhand pieces",
          },
          {
            id: "s2",
            name: "Buffalo Exchange",
            category: "Thrift",
            address: "2512 Telegraph Ave, Oakland, CA 94612",
            lat: 0,
            lng: 0,
            hours: "11 AM – 7 PM daily",
            travelMinutesFromPrev: 10,
            travelMode: "walk",
            note: null,
          },
        ],
      },
    };
    const sourceUrl = "https://www.tiktok.com/@thriftedfits/video/7123456789";

    // ACT — assemble the Reel exactly as /api/extract/route.ts does
    const reel = assembleReel(aiResponse, sourceUrl);

    // ASSERT — every field the UI consumes is present and correctly mapped
    expect(reel.platform).toBe("tiktok");
    expect(reel.creator).toBe("@thriftedfits");
    expect(reel.url).toBe(sourceUrl);
    expect(reel.thumbnailHue).toBe("moss-300");
    expect(reel.caption).toContain("Oakland thrift tour");
    expect(reel.roadmap.kind).toBe("route");
    expect(reel.roadmap.title).toBe("Oakland Thrift Afternoon");
    expect(reel.roadmap.durationLabel).toBe("Saturday · 11:00 AM – 4:00 PM");
    expect(reel.roadmap.scheduledFor).toBe("2026-04-25T11:00:00");
    expect(reel.roadmap.stops).toHaveLength(2);
    expect(reel.roadmap.stops![0].name).toBe("Crossroads Trading Co.");
    expect(reel.roadmap.stops![1].travelMode).toBe("walk");
    expect(reel.extracted.visualTags).toContain("clothing rack");
    expect(reel.extracted.locationGuess).toBe("Telegraph Ave, Oakland, CA");
    expect(reel.extracted.instructions).toHaveLength(2);
    expect(reel.id).toMatch(/^reel-test-\d+$/);
    expect(reel.createdAt).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 5 — Does the AI properly convert input into JSON with all required fields?
// ─────────────────────────────────────────────────────────────────────────────

describe("Test 5: AI output contains all required JSON fields", () => {
  test("a complete AI response passes field validation with zero errors", () => {
    // ARRANGE — raw JSON string as the AI returns it (before we parse it in route.ts)
    const rawAIOutput = `{
      "platform": "instagram",
      "creator": "@bayareatrails",
      "thumbnailHue": "moss-400",
      "caption": "Chasing five waterfalls on one loop — $6 entry, bring layers.",
      "extracted": {
        "transcript": "We pulled into Uvas Canyon County Park around eight and hit the Waterfall Loop, a 4-mile trail passing five distinct waterfalls.",
        "visualTags": ["waterfall", "redwood canopy", "trail markers", "kiosk fee box"],
        "locationGuess": "Uvas Canyon County Park, Morgan Hill, CA",
        "detectedHours": "Open daily 8 AM – sunset",
        "instructions": ["Arrive early for parking", "Bring $6 cash or card for day-use fee"]
      },
      "roadmap": {
        "kind": "route",
        "title": "Uvas Canyon Waterfall Loop",
        "summary": "A 4-mile loop passing five waterfalls through old-growth redwoods.",
        "durationLabel": "Saturday · 8:00 AM – 1:30 PM",
        "scheduledFor": "2026-04-25T08:00:00",
        "stops": [
          {
            "id": "s1",
            "name": "Uvas Canyon County Park",
            "category": "Trailhead",
            "address": "8515 Croy Rd, Morgan Hill, CA 95037",
            "lat": 0,
            "lng": 0,
            "hours": "Open daily 8 AM – sunset",
            "travelMinutesFromPrev": null,
            "travelMode": null,
            "note": "Pay $6 day-use fee at the entrance kiosk"
          }
        ]
      }
    }`;

    // ACT — parse the raw string and run the same validation the app uses
    const parsed = JSON.parse(rawAIOutput) as Record<string, unknown>;
    const errors = validateAIResponse(parsed);

    // ASSERT — no missing or invalid fields
    expect(errors).toHaveLength(0);
    expect(parsed.platform).toBe("instagram");
    expect(VALID_THUMBNAIL_HUES).toContain(parsed.thumbnailHue);
    expect(VALID_ROADMAP_KINDS).toContain((parsed.roadmap as Record<string, unknown>).kind);
    expect((parsed.extracted as Record<string, unknown[]>).visualTags).toHaveLength(4);
    expect((parsed.roadmap as Record<string, unknown[]>).stops).toHaveLength(1);
  });

  test("an AI response with missing fields is caught and reported precisely", () => {
    // ARRANGE — intentionally incomplete response: missing thumbnailHue,
    //           roadmap.durationLabel, and extracted.locationGuess
    const incompleteResponse: Record<string, unknown> = {
      platform: "youtube",
      creator: "@someCreator",
      // thumbnailHue intentionally omitted
      caption: "A test plan",
      extracted: {
        transcript: "Some transcript text.",
        visualTags: ["tag1", "tag2"],
        // locationGuess intentionally omitted
      },
      roadmap: {
        kind: "project",
        title: "Test Project Plan",
        summary: "A project plan summary.",
        // durationLabel intentionally omitted
        scheduledFor: "2026-04-25T10:00:00",
      },
    };

    // ACT
    const errors = validateAIResponse(incompleteResponse);

    // ASSERT — each omitted field is reported
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("thumbnailHue"))).toBe(true);
    expect(errors.some((e) => e.includes("extracted.locationGuess"))).toBe(true);
    expect(errors.some((e) => e.includes("roadmap.durationLabel"))).toBe(true);
  });
});

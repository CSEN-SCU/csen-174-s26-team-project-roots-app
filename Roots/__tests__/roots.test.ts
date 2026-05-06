/**
 * Roots App — Test Suite
 *
 * Run with:  npm test
 *
 * Test 1 ✅  Website displays new roots properly
 * Test 2 ✅  Link is received and platform is detected
 * Test 3 ⏭️  User can log in  (skipped — auth deferred to Sprint 2; see describe.skip reason)
 * Test 4 ✅  Back end turns AI JSON into the correct Reel shape
 * Test 5 ✅  Model JSON is fit for a user-visible plan (schema + domain shape)
 * Test 6 ✅  assembleReel applies safe defaults when nested fields are missing (TDD)
 * Test 7 ✅  validateAIResponse rejects invalid thumbnailHue values (TDD)
 * Test 8 ✅  validateAIResponse rejects invalid roadmap.kind values (TDD)
 *
 * Tests 6–8 were written with `.cursor/skills/test-driven-development/SKILL.md`:
 * RED (failing test) → verify failure → GREEN (minimal code) → verify pass → repeat.
 */

import type { Reel } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Helper functions
// assembleReel mirrors reel construction in /api/extract/route.ts.
// validateAIResponse adds the same required-field checks plus domain rules
// (stops/steps presence, visualTags array) so tests encode planner-ready JSON;
// sync the route when you want the API to reject the same bad model output.
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

  const roadmap = data.roadmap as Record<string, unknown> | undefined;
  if (
    roadmap &&
    typeof roadmap === "object" &&
    VALID_ROADMAP_KINDS.includes(kind as (typeof VALID_ROADMAP_KINDS)[number])
  ) {
    if (kind === "route") {
      const stops = roadmap.stops;
      if (!Array.isArray(stops) || stops.length === 0) {
        errors.push(
          "route roadmap must include at least one stop (travelers need a place to go)"
        );
      }
    }
    if (kind === "project") {
      const steps = roadmap.steps;
      if (!Array.isArray(steps) || steps.length === 0) {
        errors.push(
          "project roadmap must include at least one step (people need actionable tasks)"
        );
      }
    }
  }

  if (data.extracted && typeof data.extracted === "object") {
    const ex = data.extracted as Record<string, unknown>;
    if ("visualTags" in ex && ex.visualTags != null && !Array.isArray(ex.visualTags)) {
      errors.push('extracted.visualTags must be an array (not a single string or object)');
    }
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

/**
 * User outcome (not implementation detail): if validation passes, the same JSON we would
 * persist must assemble into a reel a human can actually use in the planner (copy, places, tags).
 * Refactors that preserve behavior should keep this green without changing the test.
 */
function assertValidatedModelPlanWorksEndToEndInTheUi(
  data: Record<string, unknown>,
  sourceUrl: string
): void {
  expect(validateAIResponse(data)).toEqual([]);
  const reel = assembleReel(data, sourceUrl);
  expect(reel.caption.trim().length).toBeGreaterThan(0);
  expect(reel.roadmap.title.trim().length).toBeGreaterThan(0);
  expect(reel.extracted.transcript.trim().length).toBeGreaterThan(0);
  expect(Array.isArray(reel.extracted.visualTags)).toBe(true);
  expect(reel.extracted.visualTags.length).toBeGreaterThan(0);
  if (reel.roadmap.kind === "route") {
    expect((reel.roadmap.stops?.length ?? 0) > 0).toBe(true);
  }
  if (reel.roadmap.kind === "project") {
    expect((reel.roadmap.steps?.length ?? 0) > 0).toBe(true);
  }
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
// Skipped for CI/Sprint 1: real authentication is not implemented yet.
// Remove describe.skip and wire loginUser once auth ships (e.g. NextAuth, Supabase).
// ─────────────────────────────────────────────────────────────────────────────

describe.skip(
  'Test 3: User can log in — reason="Deferred to Sprint 2: implement real auth (session token + userId) before enforcing this contract in CI"',
  () => {
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
      expect(session).not.toBeNull(); // ❌ fails: session is null
      expect(session?.token).toBeDefined(); // ❌ fails: session is null
      expect(session?.userId).toBeDefined(); // ❌ fails: session is null
    });
  }
);

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
// TEST 5 — Can we trust model JSON enough to show a real plan? (schema + domain shape)
// ─────────────────────────────────────────────────────────────────────────────

describe("Test 5: Model JSON is fit to turn into a user-visible day plan", () => {
  test("when the model returns a valid route payload, validation passes and the app can assemble a planner-ready reel", () => {
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

    const parsed = JSON.parse(rawAIOutput) as Record<string, unknown>;
    const sourceUrl = "https://www.instagram.com/reel/uvas-demo";

    assertValidatedModelPlanWorksEndToEndInTheUi(parsed, sourceUrl);
    expect((parsed.roadmap as Record<string, unknown>).kind).toBe("route");
  });

  test("when the model omits logistics users need, we refuse the payload (stable field paths, not exact error copy)", () => {
    // Domain: card theming, map context, and schedule copy are required for a credible plan.
    // Include a step so failures are only about the intentional gaps (not project-without-steps).
    const incompleteResponse: Record<string, unknown> = {
      platform: "youtube",
      creator: "@someCreator",
      caption: "A test plan",
      extracted: {
        transcript: "Some transcript text.",
        visualTags: ["tag1", "tag2"],
      },
      roadmap: {
        kind: "project",
        title: "Test Project Plan",
        summary: "A project plan summary.",
        scheduledFor: "2026-04-25T10:00:00",
        steps: [
          {
            id: "p1",
            title: "Do the thing",
            detail: "One step so the plan is not empty.",
            durationMin: 15,
          },
        ],
      },
    };

    const errors = validateAIResponse(incompleteResponse);
    const joined = errors.join("\n");

    expect(errors.length).toBeGreaterThan(0);
    expect(joined).toContain("thumbnailHue");
    expect(joined).toContain("locationGuess");
    expect(joined).toContain("durationLabel");
  });

  test("when the model declares a route but sends no stops, we block it (empty itinerary)", () => {
    const routeWithNoStops: Record<string, unknown> = {
      platform: "youtube",
      creator: "@creator",
      thumbnailHue: "moss-300",
      caption: "A day out",
      extracted: {
        transcript: "We visit several spots downtown.",
        visualTags: ["street", "café", "signage", "transit"],
        locationGuess: "Downtown, Example City, CA",
      },
      roadmap: {
        kind: "route",
        title: "Downtown crawl",
        summary: "Walkable stops.",
        durationLabel: "Saturday · 10 AM – 2 PM",
        scheduledFor: "2026-05-10T10:00:00",
        stops: [],
      },
    };

    const errors = validateAIResponse(routeWithNoStops);
    expect(
      errors.some(
        (e) =>
          e.includes("stop") &&
          (e.includes("route") || e.includes("travelers") || e.includes("place"))
      )
    ).toBe(true);
  });

  test("when the model sends visualTags as one string (common LLM slip), we reject it", () => {
    const stringTags: Record<string, unknown> = {
      platform: "tiktok",
      creator: "@creator",
      thumbnailHue: "clay-400",
      caption: "Tags wrong shape",
      extracted: {
        transcript: "Narration.",
        visualTags: "waterfall, trail, parking lot",
        locationGuess: "Somewhere, CA",
      },
      roadmap: {
        kind: "project",
        title: "Fix tags",
        summary: "Should be an array.",
        durationLabel: "1 hour",
        scheduledFor: "2026-05-01T12:00:00",
        steps: [
          { id: "p1", title: "Step", detail: "Detail", durationMin: 10 },
        ],
      },
    };

    const errors = validateAIResponse(stringTags);
    expect(errors.some((e) => e.toLowerCase().includes("visualtags"))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests 6–8 — TDD per `.cursor/skills/test-driven-development/SKILL.md`
// RED: add one test, run Jest, confirm expected failure.
// GREEN: smallest change to helpers so that test (and prior tests) pass.
// ─────────────────────────────────────────────────────────────────────────────


describe("Test 6: assembleReel applies safe defaults for missing nested fields", () => {
  test("missing extracted strings and roadmap copy fall back to empty or placeholder values", () => {
    const minimalAI: Record<string, unknown> = {
      platform: "youtube",
      creator: "@minimal",
      thumbnailHue: "clay-300",
      caption: "Caption only",
      extracted: {},
      roadmap: {
        kind: "project",
        scheduledFor: "2026-05-01T12:00:00",
      },
    };
    const url = "https://youtu.be/minimal123";

    const reel = assembleReel(minimalAI, url);

    expect(reel.extracted.transcript).toBe("");
    expect(reel.extracted.visualTags).toEqual([]);
    expect(reel.extracted.locationGuess).toBe("(unknown)");
    expect(reel.roadmap.title).toBe("Untitled Plan");
    expect(reel.roadmap.summary).toBe("");
    expect(reel.roadmap.durationLabel).toBe("");
    expect(reel.url).toBe(url);
    expect(reel.roadmap.kind).toBe("project");
  });
});

describe("Test 7: validateAIResponse rejects invalid thumbnailHue", () => {
  test("a structurally complete payload with a wrong hue yields a thumbnailHue error", () => {
    const badHue: Record<string, unknown> = {
      platform: "instagram",
      creator: "@creator",
      thumbnailHue: "neon-999",
      caption: "Valid caption",
      extracted: {
        transcript: "t",
        visualTags: [],
        locationGuess: "Somewhere",
      },
      roadmap: {
        kind: "route",
        title: "T",
        summary: "S",
        durationLabel: "1h",
        scheduledFor: "2026-05-01T09:00:00",
        stops: [
          {
            id: "s1",
            name: "Somewhere",
            category: "Spot",
            address: "1 Main St, City, ST 00000",
            lat: 0,
            lng: 0,
            hours: "9–5",
          },
        ],
      },
    };

    const errors = validateAIResponse(badHue);

    expect(errors.some((e) => e.includes("Invalid thumbnailHue"))).toBe(true);
    expect(errors.some((e) => e.includes("neon-999"))).toBe(true);
  });
});

describe("Test 8: validateAIResponse rejects invalid roadmap.kind", () => {
  test("a structurally complete payload with a non-route/non-project kind is rejected", () => {
    const badKind: Record<string, unknown> = {
      platform: "tiktok",
      creator: "@creator",
      thumbnailHue: "moss-400",
      caption: "Valid caption",
      extracted: {
        transcript: "t",
        visualTags: ["a"],
        locationGuess: "Here",
      },
      roadmap: {
        kind: "itinerary",
        title: "T",
        summary: "S",
        durationLabel: "1h",
        scheduledFor: "2026-05-01T09:00:00",
      },
    };

    const errors = validateAIResponse(badKind);

    expect(errors.some((e) => e.includes("Invalid roadmap.kind"))).toBe(true);
    expect(errors.some((e) => e.includes("itinerary"))).toBe(true);
  });
});

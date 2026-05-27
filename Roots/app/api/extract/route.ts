import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { rateLimitExtract } from "@/lib/rateLimit";
import type { Reel, Stop, Weather } from "@/lib/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const WMO: Record<number, { condition: string; emoji: string }> = {
  0: { condition: "Clear sky", emoji: "☀️" },
  1: { condition: "Mainly clear", emoji: "🌤" },
  2: { condition: "Partly cloudy", emoji: "⛅️" },
  3: { condition: "Overcast", emoji: "☁️" },
  45: { condition: "Foggy", emoji: "🌫" },
  48: { condition: "Icy fog", emoji: "🌫" },
  51: { condition: "Light drizzle", emoji: "🌦" },
  53: { condition: "Drizzle", emoji: "🌧" },
  55: { condition: "Heavy drizzle", emoji: "🌧" },
  61: { condition: "Light rain", emoji: "🌧" },
  63: { condition: "Rain", emoji: "🌧" },
  65: { condition: "Heavy rain", emoji: "🌧" },
  71: { condition: "Light snow", emoji: "🌨" },
  73: { condition: "Snow", emoji: "❄️" },
  75: { condition: "Heavy snow", emoji: "❄️" },
  80: { condition: "Rain showers", emoji: "🌦" },
  81: { condition: "Rain showers", emoji: "🌦" },
  82: { condition: "Violent showers", emoji: "⛈" },
  95: { condition: "Thunderstorm", emoji: "⛈" },
  96: { condition: "Thunderstorm with hail", emoji: "⛈" },
  99: { condition: "Thunderstorm with hail", emoji: "⛈" },
};

const SYSTEM_PROMPT = `You are Roots — a hyper-detailed logistical extraction engine for social media content. Your job is to analyze social media reel, short, or video metadata and synthesize it into a structured, actionable day plan that real people can follow in the real world.

## What you do

Given a social media post's URL, platform, creator name, video title, and caption/description text, you extract every practical detail and output a single JSON object that can be displayed as a day plan. Your output drives a real app UI — users will follow your plan to actually go to these places or complete these projects. Be thorough, specific, and practical.

## Output schema

You MUST output a single raw JSON object with this exact structure. No markdown fences, no explanation — only the JSON object. All required fields must be present.

{
  "platform": "instagram" | "tiktok" | "youtube" | "upload",
  "creator": string,           // @handle of the creator — always include @ prefix for social handles
  "thumbnailHue": string,      // exactly one of: "moss-400", "clay-300", "clay-400", "moss-300"
  "caption": string,           // 1-2 engaging sentences summarizing what the content is about
  "extracted": {
    "transcript": string,      // 2-3 sentence narrative of what happens in the video
    "visualTags": string[],    // 4-8 specific visual elements visible or mentioned
    "locationGuess": string,   // Best guess at primary location like "Uvas Canyon County Park, Morgan Hill, CA", or "(skill — no location)" for tutorials
    "detectedHours": "Open daily 8:00 AM – sunset" or null,   // Business hours if mentioned, null if unknown
    "instructions": ["tip 1", "tip 2"] or null   // 2-4 practical tips or logistics, null if none
  },
  "roadmap": {
    "kind": "route" | "project",
    "title": string,           // Catchy 3-6 word plan title
    "summary": string,         // One sentence describing what this plan involves
    "durationLabel": string,   // Human-friendly and accurate to the actual activity length. Short: "~45 min", "~1.5 hours". Multi-stop: "Saturday · 10:00 AM – 1:00 PM". Multi-session project: "2 sessions · ~4 hours hands-on". Never stretch a short activity into a full-day label.
    "scheduledFor": string,    // ISO 8601 datetime — next Saturday at 10:00 AM if unspecified
    "stops": [                 // ONLY for kind="route"
      {
        "id": string,          // "s1", "s2", "s3", etc.
        "name": string,        // Place name
        "category": string,    // e.g. "Coffee", "Trailhead", "Vintage", "Restaurant", "Museum", "Park"
        "address": string,     // Full geocodable address including city and state
        "lat": 0,              // Always 0 — geocoding pipeline fills this
        "lng": 0,              // Always 0 — geocoding pipeline fills this
        "hours": string,       // Operating hours or "Hours vary"
        "travelMinutesFromPrev": 15,   // number, or null if first stop
        "travelMode": "walk",          // "walk" | "drive" | "transit" | "bike", or null if first stop
        "note": "Brief practical note" // string, or null if none
      }
    ],
    "steps": [                 // ONLY for kind="project"
      {
        "id": string,          // "p1", "p2", etc.
        "title": string,       // 3-6 word step title
        "detail": string,      // 1-2 sentences of what to do
        "durationMin": number, // Realistic minutes for this step
        "materials": ["item 1", "item 2"] // or null if no materials needed
      }
    ]
  }
}

## Rules for roadmap kind

Classify as "route" when the content involves visiting one or more physical, real-world locations — a park, trail, neighborhood, shop, restaurant, museum, beach, market, or any place you drive/walk/transit to. The number of stops must match the actual activity — do not inflate short outings into all-day plans.

Classify as "project" when the content teaches a skill, craft, recipe, DIY technique, workout, or creative activity that happens primarily at home, in a studio, or at a workbench. Ceramics tutorials, bread baking, oil painting, yoga flows, woodworking, home repair — these are all "project".

When in doubt and any real-world location is named, default to "route".

## Rules for route stops

Stop count must be driven by the actual activity, not padded to hit a minimum:
- A single-destination visit (one café, one museum, one trailhead) can be just 1–2 stops.
- A half-day outing might have 2–3 stops. A full-day trip might have 4–5.
- Never add stops just to fill time. Every stop must be directly relevant to the content.

Only add supplementary stops when they naturally fit the activity and time frame:
- Coffee: only if the outing is 2+ hours AND coffee genuinely fits the flow — never add it reflexively.
- Meal: only if the activity genuinely spans a mealtime and nothing else in the plan covers food.
- For nature/hiking: trailhead is the core stop; post-hike food is optional and only if the hike is 3+ hours.
- For shopping/urban: only add transit or parking anchors if they're meaningfully useful, not to pad count.

Address quality matters — write addresses specific enough to geocode. Include number + street + city + state (e.g. "8515 Croy Rd, Morgan Hill, CA"). If you don't know the exact address, use the known intersection or neighborhood (e.g. "Piedmont Ave and 41st St, Oakland, CA").

Travel modes:
- "drive" for stops more than 2 miles apart, or in car-dependent areas
- "walk" for stops under 0.5 miles in walkable urban areas
- "transit" when BART, subway, or bus is explicitly mentioned
- "bike" only when cycling is explicitly mentioned

travelMinutesFromPrev estimates:
- Driving in urban/suburban areas: assume 25 mph average (12 min per 5 miles)
- Walking: 15 minutes per mile
- Transit: add 10 minutes buffer for waiting

## Rules for project steps

Every project needs 3–7 steps. Always lead with a "Gather materials" step that lists every supply needed. Break hands-on work into logical phases — don't combine 3 hours of work into one step.

durationMin should be honest. If a ceramics tutorial takes 3 sessions of work plus 5 days drying, say so. The sum of durationMin should roughly match the stated duration.

Materials in the gather step should be specific: "1.5 lb stoneware clay" not "clay". Include quantities, sizes, and types when known.

## thumbnailHue selection guide

"moss-400" → outdoor nature: hiking, trails, parks, forests, gardens, camping, ocean views
"clay-300" → food and warmth: restaurants, cafés, bakeries, markets, cooking content
"clay-400" → craft and making: ceramics, woodworking, painting, DIY, home projects, workshops
"moss-300" → urban social: shopping, thrifting, city tours, nightlife, transit, street photography

## caption writing style

Write in a vivid, first-person adjacent style. Reference the key hook that makes this content exciting. Include the specific location or technique. Example: "Chasing five waterfalls on one 4-mile loop at Uvas Canyon — park opens at 8 AM, $6 entry, bring layers for the canyon chill."

## extracted.transcript style

Write as if narrating what you'd see and hear in the video. Be specific about actions, places, and movements. Example: "We pulled into Uvas Canyon County Park around eight, paid the six dollar day-use fee, and hit the Waterfall Loop. It's about a four mile loop passing five distinct waterfalls through old-growth redwoods."

## visualTags guidance

Pick 4–8 specific, concrete visual elements — not generic terms. Good: ["waterfall", "redwood canopy", "kiosk fee box", "trail markers", "creek crossing"]. Bad: ["nature", "outdoors", "trees", "water"]. For urban content: ["BART turnstile", "Oakland storefront", "neon vintage sign", "clothing rack"]. For crafts: ["clay slab", "coil technique", "burnishing rib", "kiln shelf"].

## Handling demo or fictional URLs

If the URL clearly looks like a demo, test, or fictional URL (contains "demo", "example", "test-video", or an obviously fake handle like "demo-hike"), you must still generate a complete, realistic, and genuinely useful plan. Infer the topic from the URL path words and platform. A URL like "instagram.com/reel/uvas-canyon" should produce a real Uvas Canyon hiking plan. A URL like "tiktok.com/@thriftedfits/video/1" should produce a real Oakland thrift route.

## scheduledFor

Default to next Saturday at 10:00 AM. The exact dates will be provided in the user message — use those, not a hardcoded date. Format: ISO 8601 like "2026-05-31T10:00:00". For projects with multiple sessions, use the start of the first session.

## Using the user's location

The user message may include a "User location" line. Use it as follows:

- When the content references a **specific real-world place** (a named park, restaurant, city), ignore the user location for stop selection — the content's location takes priority.
- When the content is **generic or location-agnostic** (e.g., "thrifting tips", "best coffee shops", "morning routine", "ceramic tutorial" with no named place), use the user's location to choose real, nearby venues. Pick actual business names, real addresses, and correct geocodeable locations in that city.
- Set locationGuess to the user's city when no specific location can be inferred from the content itself.
- Never fabricate places. If you don't know specific venues in that city, use well-known chains or clearly label it "Recommended — verify before visiting".

## Quality bar

Your output will be shown directly to users as their actual day plan. Every stop should be a real place (or a clearly labeled "recommended" addition). Every step should be achievable by a real person. The durationLabel should reflect reality. A "Waterfall Loop Day Trip" that starts at 7 AM and includes coffee and brunch should have a durationLabel like "Saturday · 7:00 AM – 1:30 PM", not "3 hours".

If you genuinely cannot determine something (e.g., the exact address of a pop-up market), make a reasonable inference or add a note field saying "Confirm address before visiting". Never leave lat/lng as anything other than 0 — the geocoding pipeline handles coordinates.`;

async function fetchPlatformMeta(url: string): Promise<{ title: string; creator: string; description: string }> {
  const fallback = { title: "", creator: "@unknown", description: "" };
  try {
    if (/youtube\.com|youtu\.be/i.test(url)) {
      const res = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (res.ok) {
        const d = await res.json();
        const handle = d.author_url
          ? "@" + d.author_url.split("/").filter(Boolean).pop()
          : d.author_name
          ? "@" + d.author_name.replace(/\s+/g, "").toLowerCase()
          : "@unknown";
        return { title: d.title ?? "", creator: handle, description: "" };
      }
    }
    if (/tiktok\.com/i.test(url)) {
      const res = await fetch(
        `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (res.ok) {
        const d = await res.json();
        const handle = d.author_name ? "@" + d.author_name : "@unknown";
        return { title: d.title ?? "", creator: handle, description: "" };
      }
    }
  } catch {
    // oEmbed failed — fall through to fallback
  }
  return fallback;
}

async function geocodeStop(stop: Stop): Promise<Stop> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(stop.address)}&format=json&limit=1`,
      {
        headers: { "User-Agent": "Roots-App/1.0 (roots-planning-app)" },
        signal: AbortSignal.timeout(6000),
      }
    );
    if (!res.ok) return stop;
    const data = await res.json();
    if (!data[0]) return stop;
    return { ...stop, lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return stop;
  }
}

async function fetchWeather(lat: number, lng: number): Promise<Weather | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&hourly=precipitation_probability&forecast_days=1&temperature_unit=fahrenheit`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const cw = data.current_weather;
    const code = cw?.weathercode ?? 0;
    const wmo = WMO[code] ?? { condition: "Unknown", emoji: "🌡" };
    const precipChance = data.hourly?.precipitation_probability?.[0] ?? 0;
    return {
      tempF: Math.round(cw?.temperature ?? 65),
      condition: wmo.condition,
      emoji: wmo.emoji,
      precipChance,
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const rateLimit = rateLimitExtract(req);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error:
          "Too many extraction requests. Please wait before trying again (rate limits protect shared API usage).",
      },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSec) },
      }
    );
  }

  try {
    const body = await req.json();
    const url: string = body?.url;
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }
    const userLat: number | undefined = typeof body?.lat === "number" ? body.lat : undefined;
    const userLng: number | undefined = typeof body?.lng === "number" ? body.lng : undefined;

    const platform = /tiktok/i.test(url)
      ? "tiktok"
      : /youtube\.com|youtu\.be/i.test(url)
      ? "youtube"
      : /instagram/i.test(url)
      ? "instagram"
      : "upload";

    const meta = await fetchPlatformMeta(url);

    // Reverse-geocode user coordinates to a readable city string
    let userLocationStr = "unknown";
    if (userLat !== undefined && userLng !== undefined) {
      try {
        const revRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${userLat}&lon=${userLng}&format=json&zoom=10&addressdetails=1`,
          {
            headers: { "User-Agent": "Roots-App/1.0 (roots-planning-app)" },
            signal: AbortSignal.timeout(5000),
          }
        );
        if (revRes.ok) {
          const revData = await revRes.json();
          const a = revData.address ?? {};
          const city = a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? "";
          const state = a.state ?? "";
          userLocationStr = [city, state].filter(Boolean).join(", ") || "unknown";
        }
      } catch {
        // Fall through — location stays "unknown"
      }
    }

    // Compute dynamic date values
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const daysUntilSat = (6 - now.getDay() + 7) % 7 || 7;
    const nextSat = new Date(now);
    nextSat.setDate(now.getDate() + daysUntilSat);
    const nextSatStr = nextSat.toISOString().split("T")[0];

    const userMessage = `Platform: ${platform}
URL: ${url}
Creator: ${meta.creator}
Title: ${meta.title || "(not available — infer from URL)"}
Caption/Description: ${meta.description || "(not available — infer from URL path and platform)"}
Today's date: ${todayStr} (next Saturday: ${nextSatStr})
User location: ${userLocationStr}

Extract a complete plan from this social media content and return it as raw JSON matching the schema in your instructions.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    const rawText =
      response.content.find((b): b is Anthropic.TextBlock => b.type === "text")
        ?.text ?? "";

    const jsonStart = rawText.indexOf("{");
    let jsonStr: string | null = null;
    if (jsonStart !== -1) {
      let depth = 0;
      let inString = false;
      let escaped = false;
      for (let i = jsonStart; i < rawText.length; i++) {
        const ch = rawText[i];
        if (escaped) { escaped = false; continue; }
        if (ch === "\\" && inString) { escaped = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === "{") depth++;
        else if (ch === "}") { depth--; if (depth === 0) { jsonStr = rawText.slice(jsonStart, i + 1); break; } }
      }
    }
    if (!jsonStr) {
      return NextResponse.json(
        { error: "AI did not return valid JSON" },
        { status: 500 }
      );
    }

    // Replace JS `undefined` literals (not valid JSON) with null
    const sanitized = jsonStr.replace(/:\s*undefined\b/g, ": null");

    let extracted: any;
    try {
      extracted = JSON.parse(sanitized);
    } catch (parseErr) {
      console.error("[extract] JSON.parse failed.");
      console.error("[extract] stop_reason:", response.stop_reason);
      console.error("[extract] sanitized (first 500):", sanitized.slice(0, 500));
      console.error("[extract] sanitized (last 500):", sanitized.slice(-500));
      console.error("[extract] parse error:", parseErr);
      return NextResponse.json(
        { error: "Failed to parse AI response as JSON" },
        { status: 500 }
      );
    }

    // Geocode stops sequentially — Nominatim enforces 1 req/sec, parallel requests get blocked
    if (extracted.roadmap?.stops?.length) {
      const geocoded: Stop[] = [];
      for (const stop of extracted.roadmap.stops) {
        geocoded.push(await geocodeStop(stop));
      }
      extracted.roadmap.stops = geocoded;
    }

    // Fetch weather from first geocoded stop
    let weather: Weather | null = null;
    if (extracted.roadmap?.kind === "route" && extracted.roadmap?.stops?.length) {
      const firstGeo = extracted.roadmap.stops.find(
        (s: Stop) => s.lat !== 0 && s.lng !== 0
      );
      if (firstGeo) {
        weather = await fetchWeather(firstGeo.lat, firstGeo.lng);
      }
    }
    if (weather) {
      extracted.roadmap.weather = weather;
    }

    const reel: Reel = {
      id: `reel-${Date.now()}`,
      platform: extracted.platform ?? platform,
      url,
      creator: extracted.creator ?? meta.creator,
      thumbnailHue: extracted.thumbnailHue ?? "moss-400",
      caption: extracted.caption ?? meta.title ?? "Untitled",
      extracted: {
        transcript: extracted.extracted?.transcript ?? "",
        visualTags: extracted.extracted?.visualTags ?? [],
        locationGuess: extracted.extracted?.locationGuess ?? "(unknown)",
        detectedHours: extracted.extracted?.detectedHours,
        instructions: extracted.extracted?.instructions,
      },
      roadmap: {
        id: `rm-${Date.now()}`,
        kind: extracted.roadmap?.kind ?? "route",
        title: extracted.roadmap?.title ?? "Untitled Plan",
        summary: extracted.roadmap?.summary ?? "",
        durationLabel: extracted.roadmap?.durationLabel ?? "",
        stops: extracted.roadmap?.stops,
        steps: extracted.roadmap?.steps,
        weather: weather ?? undefined,
        scheduledFor: extracted.roadmap?.scheduledFor,
      },
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ reel });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[extract]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

# Roots Application Architecture (C4)

Architecture of the **Roots** Next.js app as implemented in [`Roots/`](../Roots/). Reflects the codebase after the latest `main` sync (live extraction, client auth, `localStorage` persistence, Schedule + Calendar as the default shell).

> The sibling file [`architecture.md`](./architecture.md) holds earlier high-level data-flow sketches. This document is the C4 view of the **current** Roots implementation.

---

## Summary

| Aspect | Current implementation |
|--------|-------------------------|
| **Purpose** | Turn Instagram / TikTok / YouTube URLs into actionable **routes** or **projects**, with map, weather, and calendar scheduling |
| **Deployable unit** | Single Next.js 14 application (App Router) |
| **Server persistence** | None — no database |
| **Client persistence** | `localStorage` (users, session, reels per user) |
| **AI & enrichment** | `POST /api/extract` orchestrates oEmbed, Claude, Nominatim, Open-Meteo |
| **Default UI** | Login → Schedule (extract + roadmap + map) ↔ Calendar |
| **In repo, not default home** | Group / Gerardbot views (`GroupView`, `GerardbotChat`, etc.) backed by mock data in context |

---

## Level 1 — System Context

Who uses Roots, what Roots does, and which external systems it talks to.

```mermaid
C4Context
    title Roots — System Context (Level 1)

    Person(planner, "Planner", "Pastes a social video URL, reviews the generated plan, and schedules it on a personal calendar.")

    System(roots, "Roots", "Context-aware planner: social link in → structured route or project out, with geocoding, weather, map, and calendar.")

    System_Ext(social, "Social video platforms", "Instagram Reels, TikTok, YouTube Shorts — content identified by user-supplied HTTPS URLs.")
    System_Ext(anthropic, "Anthropic API", "Claude (claude-sonnet-4-6) synthesizes metadata into JSON plans.")
    System_Ext(oembed, "Platform oEmbed", "YouTube and TikTok oEmbed endpoints for title and creator metadata.")
    System_Ext(nominatim, "OpenStreetMap Nominatim", "Forward geocoding of stop addresses (1 req/sec discipline).")
    System_Ext(meteo, "Open-Meteo", "Current weather for the first geocoded route stop.")

    Rel(planner, roots, "Uses via browser", "HTTPS")
    Rel(planner, social, "Copies link from")
    Rel(roots, anthropic, "Extracts plans via", "API key (server)")
    Rel(roots, oembed, "Fetches metadata", "HTTPS")
    Rel(roots, nominatim, "Geocodes stops", "HTTPS")
    Rel(roots, meteo, "Enriches routes", "HTTPS")
    Rel(roots, social, "URL references content on")
```

---

## Level 2 — Containers

Major runnable / deployable parts inside and around Roots.

```mermaid
C4Container
    title Roots — Container diagram (Level 2)

    Person(planner, "Planner", "End user in a web browser.")

    System_Boundary(roots, "Roots") {
        Container(web, "Roots Web Application", "Next.js 14, React 18, TypeScript", "Serves UI (App Router + client components) and server API route POST /api/extract.")
        ContainerDb(browser_store, "Browser localStorage", "Per-origin key/value store", "Users, session, and extracted reels keyed by userId. No server-side DB.")
    }

    System_Ext(anthropic, "Anthropic API", "LLM extraction")
    System_Ext(oembed, "oEmbed APIs", "YouTube / TikTok metadata")
    System_Ext(nominatim, "Nominatim", "Geocoding")
    System_Ext(meteo, "Open-Meteo", "Weather")

    Rel(planner, web, "Uses", "HTTPS")
    Rel(web, browser_store, "Reads/writes", "Client JS")
    Rel(web, anthropic, "messages.create", "Server, ANTHROPIC_API_KEY")
    Rel(web, oembed, "fetch metadata", "Server")
    Rel(web, nominatim, "geocode stops", "Server, sequential")
    Rel(web, meteo, "forecast", "Server")
```

### Container notes

| Container | Technology | Responsibilities |
|-----------|------------|------------------|
| **Roots Web Application** | Next.js App Router, Tailwind, Leaflet (client-only) | Auth gate, Schedule/Calendar UI, extraction API, in-memory rate limit |
| **Browser localStorage** | Web Storage API | `roots_users`, `roots_session`, `roots_reels_{userId}` |

Environment variables (see [`Roots/.env.example`](../Roots/.env.example)):

- `ANTHROPIC_API_KEY` — required for extraction
- `RATE_LIMIT_EXTRACT` — optional, default `5 per hour` per client IP

---

## Level 3 — Components (Web Application)

Internal structure of the Next.js app: UI modules, shared client state, and the extract pipeline.

```mermaid
C4Component
    title Roots Web Application — Components (Level 3)

    Container_Boundary(web, "Roots Web Application") {
        Component(page, "app/page.tsx", "Server entry", "Renders ClientRoot.")
        Component(shell, "Client shell", "ClientRoot, LoginPage, TopBar, ActiveTabRouter", "Session gate; Schedule vs Calendar tabs.")
        Component(schedule, "Schedule module", "ScheduleView, InspirationInput, RoadmapView", "URL input, staged progress UI, reel strip, plan detail.")
        Component(map, "Map module", "MapViewClient (dynamic Leaflet)", "Route stops on map when kind=route.")
        Component(calendar, "Calendar module", "CalendarView", "Day/week/month; place solo events from roadmap.")
        Component(state, "RootsProvider", "lib/store.tsx", "Reels, selection, calendar events, mock group/chat data.")
        Component(auth, "Auth module", "lib/auth.ts", "Register/login, SHA-256 passwords, session in localStorage.")
        Component(storage, "Reel persistence", "lib/reelStorage.ts", "load/save reels per userId.")
        Component(api, "Extract API", "app/api/extract/route.ts", "Rate limit → oEmbed → Claude → parse → geocode → weather → Reel JSON.")
        Component(ratelimit, "Rate limiter", "lib/rateLimit.ts", "Sliding window per IP (in-memory, single process).")
        Component(types, "Domain types", "lib/types.ts", "Reel, Roadmap, Stop, Weather, group types.")
    }

    Rel(page, shell, "Renders")
    Rel(shell, auth, "getSession / login")
    Rel(shell, state, "Wraps with RootsProvider")
    Rel(shell, schedule, "schedule tab")
    Rel(shell, calendar, "calendar tab")
    Rel(schedule, state, "useRoots")
    Rel(schedule, api, "POST /api/extract", "fetch")
    Rel(schedule, map, "RoadmapView embeds")
    Rel(calendar, state, "scheduleReel, pendingSchedule")
    Rel(state, storage, "persist reels")
    Rel(api, ratelimit, "rateLimitExtract")
    Rel(api, types, "builds Reel")
```

### Component inventory (by folder)

| Area | Key files | Role |
|------|-----------|------|
| **App** | `app/layout.tsx`, `app/page.tsx`, `app/api/extract/route.ts` | Layout, home, extraction orchestration |
| **Shell** | `components/ClientRoot.tsx`, `LoginPage.tsx`, `TopBar.tsx`, `ActiveTabRouter.tsx` | Auth + tab routing |
| **Schedule** | `ScheduleView.tsx`, `InspirationInput.tsx`, `RoadmapView.tsx`, `MapViewClient.tsx` | Primary user journey |
| **Calendar** | `CalendarView.tsx` | Timeline placement |
| **Lib** | `store.tsx`, `auth.ts`, `reelStorage.ts`, `rateLimit.ts`, `types.ts`, `mockData.ts` | State, auth, persistence, limits, seeds |
| **Latent UI** | `GroupView.tsx`, `GerardbotChat.tsx`, `TodayView.tsx`, `RoadmapsView.tsx` | Not mounted on default `page.tsx`; store still holds mock proposals/chat |

---

## Key flows

### Extraction (`POST /api/extract`)

```mermaid
sequenceDiagram
    actor User
    participant UI as InspirationInput
    participant API as extract/route.ts
    participant RL as rateLimit
    participant OEM as oEmbed
    participant AI as Anthropic
    participant GEO as Nominatim
    participant WX as Open-Meteo
    participant Store as RootsProvider

    User->>UI: Paste URL, submit
    UI->>API: POST { url }
    API->>RL: rateLimitExtract(IP)
    alt over limit
        API-->>UI: 429 + Retry-After
    end
    API->>API: Detect platform (IG/TT/YT/upload)
    API->>OEM: fetchPlatformMeta (YT/TT oEmbed)
    API->>AI: messages.create (system + user metadata)
    AI-->>API: JSON plan (route or project)
    loop each stop (sequential)
        API->>GEO: geocodeStop(address)
    end
    opt route with geocoded stop
        API->>WX: fetchWeather(lat, lng)
    end
    API-->>UI: { reel }
    UI->>Store: addReel(reel)
    Store->>Store: saveReels → localStorage
```

### Authenticated session and navigation

```mermaid
flowchart LR
    A[ClientRoot] --> B{Session in localStorage?}
    B -->|no| C[LoginPage]
    C --> D[register / login → auth.ts]
    D --> E[RootsProvider]
    B -->|yes| E
    E --> F[TopBar: Schedule | Calendar]
    F --> G[ActiveTabRouter]
    G --> H[ScheduleView]
    G --> I[CalendarView]
```

---

## Data model (client)

Core types live in [`Roots/lib/types.ts`](../Roots/lib/types.ts).

```mermaid
erDiagram
    Reel ||--|| Roadmap : has
    Roadmap ||--o{ Stop : "stops (route)"
    Roadmap ||--o{ ProjectStep : "steps (project)"
    Roadmap |o--o| Weather : "optional (route)"

    Reel {
        string id
        string platform
        string url
        string creator
        object extracted
    }
    Roadmap {
        string kind
        string title
        string scheduledFor
    }
    Stop {
        float lat
        float lng
        string address
    }
```

**Server** does not persist reels; each extraction returns a `Reel` JSON payload consumed by the client.

---

## Deployment view (Level 4 — simplified)

Typical local or hosted deployment: one Node process running Next.js.

```mermaid
C4Deployment
    title Roots — Deployment (simplified)

    Deployment_Node(user_device, "User device", "Browser") {
        Container(browser, "Web browser", "Chrome, Safari, etc.")
        ContainerDb(ls, "localStorage", "")
    }

    Deployment_Node(host, "Application host", "Node 18+") {
        Container(next, "next start / next dev", "Next.js server")
    }

    Deployment_Node(cloud_apis, "External APIs", "") {
        Container(anthropic, "Anthropic", "")
        Container(geo_apis, "oEmbed, Nominatim, Open-Meteo", "")
    }

    Rel(browser, next, "HTTPS", "pages + /api/extract")
    Rel(browser, ls, "")
    Rel(next, anthropic, "")
    Rel(next, geo_apis, "")
```

**Operational constraints**

- Rate limiting is **in-process memory** — not shared across multiple server instances.
- Nominatim usage is **sequential** per request to respect ~1 req/sec policy.
- Auth is a **prototype** (local passwords in `localStorage`) — not suitable for production without a real IdP.

---

## Testing boundary

| Layer | Location | Covers |
|-------|----------|--------|
| Unit / API | `Roots/__tests__/roots.test.ts`, `rateLimit.test.ts` | Extract route behavior, URL validation, rate limit parsing |
| Manual | `npm run dev` | End-to-end with `ANTHROPIC_API_KEY` |

---

## Related documentation

- [`Roots/README.md`](../Roots/README.md) — setup, scripts, feature overview
- [`Roots/PROTOTYPE.md`](../Roots/PROTOTYPE.md) — UX notes (partially superseded by live extraction)
- [`architecture/architecture.md`](./architecture.md) — earlier conceptual diagrams

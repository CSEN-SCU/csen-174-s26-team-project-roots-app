# Roots Application Architecture (C4)

Architecture of the **Roots** Next.js app as implemented in [`Roots/`](../Roots/). Reflects the codebase after the Supabase migration on `main` (live extraction, Supabase Auth, Postgres reel persistence, Schedule + Calendar as the default shell).

> The sibling file [`architecture.md`](./architecture.md) holds earlier high-level data-flow sketches. This document is the C4 view of the **current** Roots implementation.

---

## Summary

| Aspect | Current implementation |
|--------|-------------------------|
| **Purpose** | Turn Instagram / TikTok / YouTube URLs into actionable **routes** or **projects**, with map, weather, and calendar scheduling |
| **Deployable unit** | Single Next.js 14 application (App Router) |
| **Auth** | Supabase Auth — email / password, JWT session managed by Supabase client |
| **Server persistence** | Supabase PostgreSQL — `reels` table (JSONB), one row per reel per user |
| **Client persistence** | Supabase JS SDK handles session token in `localStorage`; no custom keys |
| **AI & enrichment** | `POST /api/extract` orchestrates oEmbed → Claude → Nominatim → Open-Meteo |
| **Default UI** | Login → Schedule (extract + roadmap + map) ↔ Calendar |
| **In repo, not default** | Group / Gerardbot views (`GroupView`, `GerardbotChat`, etc.) backed by mock data in context |

---

## Level 1 — System Context

Who uses Roots, what Roots does, and which external systems it talks to.

```mermaid
C4Context
    title Roots — System Context (Level 1)

    Person(planner, "Planner", "Pastes a social video URL, reviews the generated plan, and schedules it on a personal calendar.")

    System(roots, "Roots", "Context-aware planner: social link in → structured route or project out, with geocoding, weather, map, and calendar.")

    System_Ext(supabase, "Supabase", "Managed auth and PostgreSQL database — stores user accounts and extracted reels, accessible from any device.")
    System_Ext(anthropic, "Anthropic API", "Claude (claude-sonnet-4-6) synthesizes metadata into JSON plans.")
    System_Ext(oembed, "Platform oEmbed", "YouTube and TikTok oEmbed endpoints for title and creator metadata.")
    System_Ext(nominatim, "OpenStreetMap Nominatim", "Forward geocoding of stop addresses (1 req/sec discipline).")
    System_Ext(meteo, "Open-Meteo", "Current weather for the first geocoded route stop.")

    Rel(planner, roots, "Uses via browser", "HTTPS")
    Rel(roots, supabase, "Auth + reel storage", "HTTPS / Supabase JS SDK")
    Rel(roots, anthropic, "Extracts plans via", "API key (server-side only)")
    Rel(roots, oembed, "Fetches video metadata", "HTTPS")
    Rel(roots, nominatim, "Geocodes stop addresses", "HTTPS, sequential")
    Rel(roots, meteo, "Fetches weather forecast", "HTTPS")
```

---

## Level 2 — Containers

Major runnable / deployable parts inside and around Roots.

```mermaid
C4Container
    title Roots — Container diagram (Level 2)

    Person(planner, "Planner", "End user in a web browser.")

    System_Boundary(roots, "Roots") {
        Container(web, "Roots Web Application", "Next.js 14, React 18, TypeScript", "Serves the SPA (App Router + client components) and the server-side API route POST /api/extract.")
    }

    System_Boundary(supabase_boundary, "Supabase (managed cloud)") {
        Container(sb_auth, "Supabase Auth", "Email / password auth service", "Issues and validates JWTs. Stores user accounts. Session token cached in browser by the Supabase JS SDK.")
        ContainerDb(sb_db, "PostgreSQL", "Supabase-managed Postgres", "reels table — one JSONB row per reel per user, protected by Row Level Security (auth.uid() = user_id).")
    }

    System_Ext(anthropic, "Anthropic API", "LLM extraction")
    System_Ext(oembed, "oEmbed APIs", "YouTube / TikTok metadata")
    System_Ext(nominatim, "Nominatim", "Geocoding")
    System_Ext(meteo, "Open-Meteo", "Weather")

    Rel(planner, web, "Uses", "HTTPS")
    Rel(web, sb_auth, "register / login / getSession / signOut", "Supabase JS SDK (browser)")
    Rel(web, sb_db, "loadReels (SELECT) / upsertReel (UPSERT)", "Supabase JS SDK (browser, RLS-gated)")
    Rel(web, anthropic, "messages.create", "Server-side, ANTHROPIC_API_KEY")
    Rel(web, oembed, "fetch video metadata", "Server-side")
    Rel(web, nominatim, "geocode stops", "Server-side, sequential")
    Rel(web, meteo, "fetch forecast", "Server-side")
```

### Container notes

| Container | Technology | Responsibilities |
|-----------|------------|------------------|
| **Roots Web Application** | Next.js App Router, Tailwind, Leaflet (client-only) | Auth gate, Schedule/Calendar UI, extraction API, in-memory rate limit |
| **Supabase Auth** | Supabase managed service | User accounts, password hashing, JWT issuance, session refresh |
| **PostgreSQL (reels)** | Supabase-managed Postgres | `reels(id TEXT, user_id UUID, data JSONB, created_at TIMESTAMPTZ)` — Row Level Security ensures each user only sees their own rows |

Environment variables (see [`Roots/.env.example`](../Roots/.env.example)):

- `ANTHROPIC_API_KEY` — required for extraction (server-side only)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Supabase anon / publishable key (safe to expose in browser; RLS enforces access)
- `RATE_LIMIT_EXTRACT` — optional, default `5 per hour` per client IP

---

## Level 3 — Components (Web Application)

Internal structure of the Next.js app: UI modules, shared client state, and the extract pipeline.

```mermaid
C4Component
    title Roots Web Application — Components (Level 3)

    Container_Boundary(web, "Roots Web Application") {
        Component(page, "app/page.tsx", "Server entry", "Renders ClientRoot.")
        Component(shell, "Client shell", "ClientRoot, LoginPage, TopBar, ActiveTabRouter", "Session gate; config-error screen; Schedule vs Calendar tabs.")
        Component(schedule, "Schedule module", "ScheduleView, InspirationInput, RoadmapView", "URL input, staged progress UI, reel strip, plan detail.")
        Component(map, "Map module", "MapViewClient (dynamic Leaflet)", "Route stops on map when kind=route.")
        Component(calendar, "Calendar module", "CalendarView", "Day/week/month; place solo events from roadmap.")
        Component(state, "RootsProvider", "lib/store.tsx", "Reels (loaded async from Supabase), selection, calendar events, mock group/chat data.")
        Component(auth, "Auth module", "lib/auth.ts", "register/login/logout/getSession/onAuthStateChange via Supabase Auth.")
        Component(supabase_lib, "Supabase client", "lib/supabase.ts", "Typed singleton SupabaseClient. Accepts NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or ANON_KEY.")
        Component(storage, "Reel persistence", "lib/reelStorage.ts", "loadReels (SELECT from reels table) / upsertReel (UPSERT into reels table).")
        Component(api, "Extract API", "app/api/extract/route.ts", "Rate limit → oEmbed → Claude → parse → geocode → weather → Reel JSON.")
        Component(ratelimit, "Rate limiter", "lib/rateLimit.ts", "Sliding window per IP (in-memory, single process).")
        Component(types, "Domain types", "lib/types.ts", "Reel, Roadmap, Stop, Weather, group types.")
    }

    Container(sb_auth, "Supabase Auth", "Managed auth service")
    ContainerDb(sb_db, "PostgreSQL", "reels table")

    Rel(page, shell, "Renders")
    Rel(shell, auth, "getSession / onAuthStateChange / clearSession")
    Rel(shell, state, "Wraps app with RootsProvider on auth")
    Rel(shell, schedule, "schedule tab")
    Rel(shell, calendar, "calendar tab")
    Rel(schedule, state, "useRoots")
    Rel(schedule, api, "POST /api/extract", "fetch")
    Rel(schedule, map, "RoadmapView embeds")
    Rel(calendar, state, "scheduleReel, pendingSchedule")
    Rel(state, storage, "loadReels on mount / upsertReel on addReel")
    Rel(auth, supabase_lib, "uses")
    Rel(storage, supabase_lib, "uses")
    Rel(supabase_lib, sb_auth, "auth.signUp / signIn / getSession / onAuthStateChange")
    Rel(supabase_lib, sb_db, "from('reels').select / upsert")
    Rel(api, ratelimit, "rateLimitExtract")
    Rel(api, types, "builds Reel")
```

### Component inventory (by folder)

| Area | Key files | Role |
|------|-----------|------|
| **App** | `app/layout.tsx`, `app/page.tsx`, `app/api/extract/route.ts` | Layout, home, extraction orchestration |
| **Shell** | `components/ClientRoot.tsx`, `LoginPage.tsx`, `TopBar.tsx`, `ActiveTabRouter.tsx` | Auth + tab routing, config-error screen |
| **Schedule** | `ScheduleView.tsx`, `InspirationInput.tsx`, `RoadmapView.tsx`, `MapViewClient.tsx` | Primary user journey |
| **Calendar** | `CalendarView.tsx` | Timeline placement |
| **Lib** | `store.tsx`, `auth.ts`, `reelStorage.ts`, `supabase.ts`, `rateLimit.ts`, `types.ts`, `mockData.ts` | State, auth, persistence, Supabase client, limits, seeds |
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
    participant SB as Supabase (reels table)

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
    loop each stop (sequential, ~1 req/s)
        API->>GEO: geocodeStop(address)
    end
    opt route with geocoded stop
        API->>WX: fetchWeather(lat, lng)
    end
    API-->>UI: { reel }
    UI->>Store: addReel(reel)
    Store->>SB: upsertReel → reels table (JSONB)
```

### Authenticated session and navigation

```mermaid
flowchart LR
    A[ClientRoot mounts] --> B{Supabase session\ngetSession}
    B -->|error / not configured| CE[Config error screen]
    B -->|no session| C[LoginPage]
    C --> D[register / login\nvia Supabase Auth]
    D --> E[RootsProvider\nloads reels from Postgres]
    B -->|session exists| E
    E --> F[TopBar: Schedule · Calendar]
    F --> G[ActiveTabRouter]
    G --> H[ScheduleView]
    G --> I[CalendarView]
```

---

## Data model

Core TypeScript types live in [`Roots/lib/types.ts`](../Roots/lib/types.ts). Reels are persisted server-side as JSONB.

```mermaid
erDiagram
    USER ||--o{ REEL : "owns (user_id FK)"
    REEL ||--|| ROADMAP : has
    ROADMAP ||--o{ STOP : "stops (route)"
    ROADMAP ||--o{ PROJECTSTEP : "steps (project)"
    ROADMAP |o--o| WEATHER : "optional (route)"

    USER {
        uuid id
        string email
        string name
    }
    REEL {
        string id PK
        uuid user_id FK
        jsonb data
        timestamptz created_at
    }
    ROADMAP {
        string kind
        string title
        string scheduledFor
    }
    STOP {
        float lat
        float lng
        string address
    }
```

**Supabase schema (run in SQL Editor):**

```sql
CREATE TABLE reels (
  id          TEXT        PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data        JSONB       NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own reels"   ON reels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert own reels" ON reels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own reels" ON reels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete own reels" ON reels FOR DELETE USING (auth.uid() = user_id);
```

---

## Deployment view

```mermaid
C4Deployment
    title Roots — Deployment

    Deployment_Node(user_device, "User device", "Web browser") {
        Container(browser, "Browser", "Chrome, Safari, etc.", "Runs the React SPA; Supabase JS SDK stores session JWT in localStorage.")
    }

    Deployment_Node(host, "Application host", "Node 18+ / Vercel") {
        Container(next, "next start / next dev", "Next.js server", "Serves pages and /api/extract. Holds ANTHROPIC_API_KEY.")
    }

    Deployment_Node(supabase_cloud, "Supabase Cloud", "Managed SaaS") {
        Container(sb_auth_node, "Auth service", "Supabase Auth", "")
        ContainerDb(sb_pg, "PostgreSQL", "Supabase Postgres", "reels table")
    }

    Deployment_Node(cloud_apis, "External APIs", "") {
        Container(anthropic, "Anthropic", "claude-sonnet-4-6", "")
        Container(geo_apis, "oEmbed · Nominatim · Open-Meteo", "", "")
    }

    Rel(browser, next, "Pages + /api/extract", "HTTPS")
    Rel(browser, sb_auth_node, "Auth calls (signIn, getSession)", "HTTPS / Supabase JS")
    Rel(browser, sb_pg, "reels SELECT / UPSERT", "HTTPS / Supabase JS + RLS")
    Rel(next, anthropic, "messages.create", "HTTPS")
    Rel(next, geo_apis, "metadata + geocode + weather", "HTTPS")
```

**Operational constraints**

- Rate limiting is **in-process memory** — not shared across multiple server instances. A Redis adapter would be needed for multi-instance deployments.
- Nominatim usage is **sequential** per request to respect the ~1 req/sec policy.
- Supabase Row Level Security ensures each user can only read and write **their own reels** — the anon/publishable key is safe to expose in the browser.

---

## Testing boundary

| Layer | Location | Covers |
|-------|----------|--------|
| Unit / API | `Roots/__tests__/roots.test.ts`, `rateLimit.test.ts` | Extract route behavior, URL validation, rate limit parsing |
| Manual | `npm run dev` | End-to-end with `ANTHROPIC_API_KEY` + Supabase credentials |

---

## Related documentation

- [`Roots/README.md`](../Roots/README.md) — setup, scripts, feature overview
- [`Roots/PROTOTYPE.md`](../Roots/PROTOTYPE.md) — UX notes (partially superseded by live extraction)
- [`architecture/architecture.md`](./architecture.md) — earlier conceptual diagrams

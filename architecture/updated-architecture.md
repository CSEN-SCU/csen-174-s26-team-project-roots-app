# Roots — Architecture (C4)

> Reflects `main` after the Supabase migration: Supabase Auth replaces the old localStorage auth, and extracted reels are persisted in a Postgres `reels` table so accounts and data are accessible from any device.

---

## Level 1 — System Context

```mermaid
---
config:
  layout: elk
title: Roots — System Context
---
flowchart TB
    User["User"]
    Roots["Roots App"]
    Supabase["Supabase\nAuth + PostgreSQL"]
    Claude["Anthropic API\nclaude-sonnet-4-6"]
    OEmbed["YouTube / TikTok\noEmbed"]
    Nominatim["Nominatim\nGeocoding"]
    OpenMeteo["Open-Meteo\nWeather"]

    User -- pastes social URL --> Roots
    Roots -- returns plan + map --> User
    Roots <-- auth & reel storage --> Supabase
    Roots -- extract plan --> Claude
    Roots -- video metadata --> OEmbed
    Roots -- geocode stops --> Nominatim
    Roots -- weather forecast --> OpenMeteo

    User:::userNode
    Roots:::appNode
    Supabase:::supabaseNode
    Claude:::apiNode
    OEmbed:::apiNode
    Nominatim:::apiNode
    OpenMeteo:::apiNode

    classDef userNode     stroke:#fb7185,fill:#fff1f2,color:#1e1b4b
    classDef appNode      stroke:#38bdf8,fill:#f0f9ff,color:#1e1b4b
    classDef supabaseNode stroke:#34d399,fill:#ecfdf5,color:#1e1b4b
    classDef apiNode      stroke:#a78bfa,fill:#f5f3ff,color:#1e1b4b
```

---

## Level 2 — Containers

```mermaid
---
config:
  layout: elk
title: Roots — Containers
---
flowchart TB
    User["User\n(browser)"]

    subgraph Roots ["Roots App"]
        WebApp["Next.js 14\nApp Router + React 18"]
    end

    subgraph SupabaseCloud ["Supabase (managed)"]
        SbAuth["Auth Service\nemail / password · JWT"]
        SbDB[("PostgreSQL\nreels table · JSONB\nRow Level Security")]
    end

    ExtAPIs["Anthropic · oEmbed\nNominatim · Open-Meteo"]

    User -- HTTPS --> WebApp
    WebApp -- signIn / getSession --> SbAuth
    WebApp -- SELECT / UPSERT reels --> SbDB
    WebApp -- server-side API calls --> ExtAPIs
    SbAuth -. JWT session .-> WebApp
    SbDB -. reel rows .-> WebApp

    User:::userNode
    WebApp:::appNode
    SbAuth:::supabaseNode
    SbDB:::dbNode
    ExtAPIs:::apiNode

    classDef userNode     stroke:#fb7185,fill:#fff1f2,color:#1e1b4b
    classDef appNode      stroke:#38bdf8,fill:#f0f9ff,color:#1e1b4b
    classDef supabaseNode stroke:#34d399,fill:#ecfdf5,color:#1e1b4b
    classDef dbNode       stroke:#a3e635,fill:#f7fee7,color:#1e1b4b
    classDef apiNode      stroke:#a78bfa,fill:#f5f3ff,color:#1e1b4b
```

---

## Level 3 — Components

```mermaid
---
config:
  layout: elk
title: Roots Web App — Components
---
flowchart TB
    subgraph Browser ["Client (browser)"]
        ClientRoot["ClientRoot\nauth gate + config-error screen"]
        LoginPage["LoginPage"]
        TopBar["TopBar"]
        ScheduleView["ScheduleView\nInspirationInput · RoadmapView"]
        MapView["MapViewClient\nLeaflet (dynamic import)"]
        CalendarView["CalendarView"]
        Store["RootsProvider\nlib/store.tsx"]
        AuthLib["lib/auth.ts"]
        ReelStorage["lib/reelStorage.ts"]
        SbClient["lib/supabase.ts\ntyped singleton client"]
    end

    subgraph Server ["Server (Next.js API route)"]
        ExtractAPI["POST /api/extract\noEmbed → Claude → geocode → weather"]
        RateLimit["lib/rateLimit.ts\nsliding window per IP"]
    end

    SbAuth["Supabase Auth"]
    SbDB[("PostgreSQL\nreels")]

    ClientRoot --> LoginPage & TopBar & ScheduleView & CalendarView
    ScheduleView --> MapView & Store & ExtractAPI
    CalendarView --> Store
    Store --> ReelStorage
    ClientRoot --> AuthLib
    LoginPage --> AuthLib
    AuthLib --> SbClient
    ReelStorage --> SbClient
    SbClient --> SbAuth & SbDB
    ExtractAPI --> RateLimit

    ClientRoot:::shellNode
    LoginPage:::shellNode
    TopBar:::shellNode
    ScheduleView:::uiNode
    MapView:::uiNode
    CalendarView:::uiNode
    Store:::stateNode
    AuthLib:::libNode
    ReelStorage:::libNode
    SbClient:::supabaseNode
    ExtractAPI:::apiNode
    RateLimit:::libNode
    SbAuth:::supabaseNode
    SbDB:::dbNode

    classDef shellNode    stroke:#fb7185,fill:#fff1f2,color:#1e1b4b
    classDef uiNode       stroke:#38bdf8,fill:#f0f9ff,color:#1e1b4b
    classDef stateNode    stroke:#fb923c,fill:#fff7ed,color:#1e1b4b
    classDef libNode      stroke:#94a3b8,fill:#f8fafc,color:#1e1b4b
    classDef supabaseNode stroke:#34d399,fill:#ecfdf5,color:#1e1b4b
    classDef dbNode       stroke:#a3e635,fill:#f7fee7,color:#1e1b4b
    classDef apiNode      stroke:#a78bfa,fill:#f5f3ff,color:#1e1b4b
```

---

## Extraction flow

```mermaid
---
config:
  layout: elk
title: POST /api/extract — end to end
---
flowchart LR
    User["User\npastes URL"] --> Input["InspirationInput"]
    Input -- POST url --> API["extract/route.ts"]
    API --> RL{"rate limit\ncheck"}
    RL -- over limit --> E429["429 Too Many\nRequests"]
    RL -- ok --> Platform["detect platform\nIG · TT · YT · upload"]
    Platform --> OEmbed["oEmbed\ntitle + creator"]
    OEmbed --> Claude["Anthropic\nClaude sonnet-4-6"]
    Claude -- JSON plan --> Parse["parse +\nvalidate"]
    Parse --> Geo["Nominatim\nsequential geocode\n1 req/s"]
    Geo --> Weather["Open-Meteo\nweather for stop 1"]
    Weather --> Store["RootsProvider\naddReel"]
    Store --> SbDB[("PostgreSQL\nupsertReel")]

    User:::userNode
    Input:::uiNode
    API:::apiNode
    RL:::libNode
    Platform:::apiNode
    OEmbed:::apiNode
    Claude:::apiNode
    Parse:::apiNode
    Geo:::apiNode
    Weather:::apiNode
    Store:::stateNode
    SbDB:::dbNode
    E429:::errorNode

    classDef userNode  stroke:#fb7185,fill:#fff1f2,color:#1e1b4b
    classDef uiNode    stroke:#38bdf8,fill:#f0f9ff,color:#1e1b4b
    classDef apiNode   stroke:#a78bfa,fill:#f5f3ff,color:#1e1b4b
    classDef libNode   stroke:#94a3b8,fill:#f8fafc,color:#1e1b4b
    classDef stateNode stroke:#fb923c,fill:#fff7ed,color:#1e1b4b
    classDef dbNode    stroke:#a3e635,fill:#f7fee7,color:#1e1b4b
    classDef errorNode stroke:#f87171,fill:#fef2f2,color:#1e1b4b
```

---

## Auth flow

```mermaid
---
config:
  layout: elk
title: Session lifecycle
---
flowchart TB
    Mount["ClientRoot\nmounts"] --> Check["getSession\nSupabase Auth"]
    Check -- config error --> ErrorScreen["config error\nscreen"]
    Check -- no session --> Login["LoginPage"]
    Login -- register --> SbSignUp["supabase.auth.signUp"]
    Login -- sign in --> SbSignIn["supabase.auth.signInWithPassword"]
    SbSignUp & SbSignIn -- JWT session --> Provider["RootsProvider\nloads reels from Postgres"]
    Check -- session exists --> Provider
    Provider --> UI["Schedule ↔ Calendar"]
    UI -- logout --> SbSignOut["supabase.auth.signOut"]
    SbSignOut --> Login

    Mount:::shellNode
    Check:::supabaseNode
    ErrorScreen:::errorNode
    Login:::shellNode
    SbSignUp:::supabaseNode
    SbSignIn:::supabaseNode
    Provider:::stateNode
    UI:::uiNode
    SbSignOut:::supabaseNode

    classDef shellNode    stroke:#fb7185,fill:#fff1f2,color:#1e1b4b
    classDef supabaseNode stroke:#34d399,fill:#ecfdf5,color:#1e1b4b
    classDef stateNode    stroke:#fb923c,fill:#fff7ed,color:#1e1b4b
    classDef uiNode       stroke:#38bdf8,fill:#f0f9ff,color:#1e1b4b
    classDef errorNode    stroke:#f87171,fill:#fef2f2,color:#1e1b4b
```

---

## Data model

```mermaid
erDiagram
    USER ||--o{ REEL : owns
    REEL ||--|| ROADMAP : has
    ROADMAP ||--o{ STOP : "stops (route kind)"
    ROADMAP ||--o{ PROJECTSTEP : "steps (project kind)"
    ROADMAP |o--o| WEATHER : "first stop only"

    USER {
        uuid   id
        string email
        string name
    }
    REEL {
        string      id          PK
        uuid        user_id     FK
        jsonb       data
        timestamptz created_at
    }
    ROADMAP {
        string kind
        string title
        string durationLabel
        string scheduledFor
    }
    STOP {
        string name
        string address
        float  lat
        float  lng
        string travelMode
    }
```

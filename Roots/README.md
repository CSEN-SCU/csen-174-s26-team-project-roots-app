[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/NfqHRKdw)

# Roots

**Roots** is a context-aware planner for “I saw this online — now what?” Paste a **Instagram, TikTok, or YouTube** URL (or a demo URL). The app calls an LLM-backed extractor, then shows a **roadmap** you can browse, place on a **map** (routes), and **add to your calendar**.

## What it does

- **Inspiration input** — Submit a URL; the UI walks through staged progress while `POST /api/extract` runs.
- **AI extraction** — Claude (Anthropic) turns title/caption/oEmbed metadata into structured JSON: transcript-style summary, visual tags, location hints, tips, and either **multi-stop routes** or **project steps** with materials and durations.
- **Geocoding & weather** — Route stops are geocoded (OpenStreetMap Nominatim). Weather for the first resolved stop comes from Open-Meteo.
- **Schedule view** — Horizontal “reel strip” to switch plans; main panel shows the roadmap, extraction detail card, and Leaflet map for routes.
- **Calendar** — Day / week / month views; place scheduled plans on the timeline (solo flow from the roadmap).

State is held in React context (`lib/store.tsx`) with realistic mock seeds in `lib/mockData.ts` plus any reels you extract in-session.

## Stack

- **Next.js 14** (App Router), **React 18**, **TypeScript**
- **Tailwind CSS** (moss/clay palette, Instrument Serif + Inter)
- **Leaflet** / react-leaflet (client-only via dynamic import)
- **Anthropic SDK** on the server for extraction
- **Jest** + ts-jest for unit tests (`npm test`)

## Prerequisites

- Node.js 18+ (LTS recommended)
- An **Anthropic API key** for real extractions

## Setup

```bash
npm install
```

Create **`Roots/.env.local`**:

```env
ANTHROPIC_API_KEY=sk-ant-api03-...
```

Without a key, extraction requests will fail at runtime.

## Scripts

```bash
npm run dev    # http://localhost:3000
npm run build
npm run start
npm run lint
npm test       # Jest
```

## Related code

- **`app/api/extract/route.ts`** — Platform detection, oEmbed where available, Claude prompt, JSON parse, sequential geocoding, weather enrichment.
- **`lib/types.ts`** — `Reel`, `Roadmap`, `Stop`, chat/proposal types shared with mock data.
- **Group / Gerardbot** — `GerardbotChat.tsx`, `GroupView.tsx`, and related pieces are part of the codebase; the **default home page** in this folder is **Schedule + Calendar** only. For a UI that surfaces Today + Group + Roadmaps tabs, see the sibling **`roland_prototype/`** directory in the repo root.

## Docs note

`PROTOTYPE.md` in this folder describes an earlier “mock-only” story; the app now performs **live extraction** when `ANTHROPIC_API_KEY` is set. Treat `PROTOTYPE.md` as supplementary UX notes, not as environment setup.

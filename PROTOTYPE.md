# Roots — Prototype

Context-Aware Personal Planner. Drop a Reel/TikTok, and Roots extracts the
location, hours, and instructions to turn it into a real, scheduled plan.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** with a custom moss/clay palette + Instrument Serif display
- **Leaflet** + react-leaflet for the visual map
- 100% mock data — no API keys required

## Run

```bash
npm install
npm run dev
# open http://localhost:3000
```

## What's in the prototype

| Pillar | Where it lives | Demo it by… |
|---|---|---|
| **Inspiration Input Hub** | `components/InspirationInput.tsx` | Pasting any URL → click *Extract plan*. The 5-stage multimodal pipeline animates (fetch → transcribe → vision → geocode → weather), then a new reel slides into your saved strip. |
| **Multimodal Extraction** | `RoadmapView` → *What Roots saw, heard, & read* card | Switch between the 3 saved reels in the strip. The right-hand card shows the transcript, visual tags, geocoded location, business hours, and instructions. |
| **Solo Routes** | `RoadmapView` (route kind) | Select the Uvas Canyon or Oakland Thrift reel. Numbered map pins, walk/drive icons, per-leg travel times, business hours, weather chip. |
| **Project Steps** | `RoadmapView` (project kind) | Select the *Coil Mug* reel. Step-by-step roadmap with materials chips and durations. |
| **Calendar event flow** | *Add to calendar* button → `CalendarPeek` | Tapping the button slides the plan into the calendar peek with a confirmation toast. |
| **Gerardbot group chat** | `components/GerardbotChat.tsx` | The pre-loaded chat shows Gerardbot extracting a reel into a proposal card. |
| **50% Filter voting** | `ProposalCard` inside chat | Click *I'm in* / *Pass*, or use **⚡ Sim vote** to simulate other members. Once >50% vote yes, Gerardbot auto-posts a system message and pushes the plan to the group calendar. |
| **Visual map** | `components/MapView.tsx` (Leaflet, dynamic-imported) | Custom moss pins numbered by stop order, dashed polyline route, popups with hours. |

## Architecture notes

- All app state lives in a single `RootsProvider` context (`lib/store.tsx`) so
  the chat, calendar, and roadmap stay in sync — vote yes past the 50% line and
  watch the calendar peek update in real time.
- Mock content is shaped exactly like what a real multimodal extraction service
  would return (`lib/types.ts` defines the contract).
- Leaflet is dynamic-imported via `MapViewClient` to avoid SSR issues with
  `window`.

## Design system

- **Moss** (`#3D7A36` family) — primary, "rooted" actions
- **Clay** (`#A36F30` family) — warm secondary, materials, group accents
- **Display:** Instrument Serif (italics for emotive moments)
- **Body:** Inter
- Mobile-first grid; collapses to single column under `lg`.

## Demo script (60 seconds)

1. Click **✨ Extract plan** with no URL → watch the pipeline run, a new reel appears.
2. Click the **Coil Mug** card → see project-style roadmap with steps + materials.
3. Click the **Uvas Canyon** card → see route-style roadmap, map, weather.
4. Hit **Add to calendar** → confirmation + entry in *Your Calendar*.
5. Scroll to the chat. On the proposal card, tap **⚡ Sim vote** twice. Once you
   cross 50%, Gerardbot announces it and the group event lands on the calendar.

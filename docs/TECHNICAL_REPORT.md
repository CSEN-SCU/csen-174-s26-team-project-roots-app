# Roots — Technical Report

**Team Roots · Roland Breise, Cole Prendeville, Frank Tittiger · Spring 2026**

---

## 1. Product Vision and Evolution

**Original W2 vision:** Roots was designed for people who doom-save social media content — hoarding reels and TikToks with no plan to act on them. The vision: paste a social video URL and the app transforms it into an actionable plan, either a real-world multi-stop route with a map and travel legs, or a step-by-step project roadmap with materials. The tagline from our W2 statement captures it: *"proactively extracts hidden metadata, logistics, and instructional steps from video content to move the user to action sooner and more often."*

**Current vision:** That core promise held. The product now does exactly what W2 described — paste a reel, get a structured plan — and has added calendar scheduling, live geocoding with weather, stop/step editing, and drag-and-drop reordering. The primary user from W2 (someone who saves content but never acts on it) remains the target. What changed is scope: the original vision included a group planning mode (Gerardbot group chat, voting) that was prototyped in `roland_prototype/` but not wired into the main `Roots/` app. That feature shifted to backlog (issues [#9](https://github.com/CSEN-SCU/csen-174-s26-team-project-roots-app/issues/9) and [#23](https://github.com/CSEN-SCU/csen-174-s26-team-project-roots-app/issues/23)).

**Four decisions that bent the vision:**

1. **Mock-first → live extraction.** The W2/W3 prototype used `lib/mockData.ts` hardcoded seeds. We deferred live AI calls while building UI, then wired `POST /api/extract` to Claude once the structure was stable. `Roots/PROTOTYPE.md` documents the mock-only phase.
2. **localStorage → Supabase.** Mid-quarter, the security audit (W7) flagged browser-local state as a gap if we ever shipped auth. We replaced it with Supabase for auth and persistent plan storage (commit [`c77afd5`](https://github.com/CSEN-SCU/csen-174-s26-team-project-roots-app/commit/c77afd52866fe8b684fc8691f3a752a67ed93f47)).
3. **Group features → backlog.** Demo dry-run feedback showed the schedule+calendar flow alone was dense enough for a demo. Group planning was implemented in `roland_prototype/` but intentionally excluded from the main app's home page to reduce scope risk.
4. **Geocoding robustness.** The first pass relied on Nominatim for location resolution. When hike-style content (non-address place names) failed to geocode, we added an Overpass API name-based fallback (commit [`f5cfca7`](https://github.com/CSEN-SCU/csen-174-s26-team-project-roots-app/commit/f5cfca730fd54ce6772ad784093ee0b48e4b339b)).

**User served:** The W2 primary persona — a 20-something who has dozens of saved reels and zero executed plans — still describes the user. The product still solves their problem. The "group trip planner" persona from W3 storyboards is partially served by the calendar view but not yet by a multi-user room; that remains future work.

---

## 2. Architecture Evolution

### W4 → W8 → Current

**W4 initial architecture** was a single Next.js app with all logic (UI, AI calls, geocoding, state) colocated in the frontend. State lived in React context backed by `lib/mockData.ts`. There was no backend separation, no persistence layer, and no external service integration beyond a planned Anthropic API call.

**W8 revised architecture** introduced the production-shaped `POST /api/extract` server route, separating client UI from server-side AI and geocoding logic. The route handled platform detection, oEmbed metadata fetch, Claude prompt construction, JSON parsing, sequential Nominatim geocoding, and Open-Meteo weather enrichment. State remained in React context; plans were session-only. The `architecture/` folder in the repo ([commit `789afff`](https://github.com/CSEN-SCU/csen-174-s26-team-project-roots-app/commit/789afffc872308548d82e2426b53d9c040d3acf4)) introduced C4 diagrams capturing this layout.

**Current architecture (post-code-freeze)** adds Supabase as a persistence and auth layer, IP-based rate limiting on the extract route, Overpass API as a geocoding fallback, and in-app plan editing (stop add/remove, dwell-time editing, drag-and-drop reorder). The architecture diagram below shows containers as of the final sprint.

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (Next.js 14 Client)                                    │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────┐   │
│  │ Schedule /   │  │  Roadmap /       │  │  Calendar        │   │
│  │ Reel Strip   │  │  Map View        │  │  (day/wk/mo)     │   │
│  └──────┬───────┘  └────────┬────────┘  └──────────────────┘   │
│         │                   │  React Context (lib/store.tsx)    │
└─────────┼───────────────────┼───────────────────────────────────┘
          │ POST /api/extract │ Supabase client
          ▼                   ▼
┌─────────────────────────┐  ┌──────────────────────────────────┐
│  Next.js Server Route   │  │  Supabase (auth + plan storage)  │
│  app/api/extract/       │  └──────────────────────────────────┘
│  route.ts               │
│  ├─ Platform detect     │
│  ├─ oEmbed fetch        │
│  ├─ Claude (Anthropic)  │──→  Anthropic API (claude-3-5-haiku)
│  ├─ JSON parse          │
│  ├─ Nominatim geocode   │──→  OpenStreetMap Nominatim
│  ├─ Overpass fallback   │──→  Overpass API
│  └─ Open-Meteo weather  │──→  Open-Meteo API
└─────────────────────────┘
          │ deployed on
          ▼
   Vercel (CI/CD via GitHub Actions → Vercel)
```

**Three architectural decisions with repo references:**

| Decision | Trigger | Repo link |
|---|---|---|
| Extract all AI/geocoding logic into server route | Avoid exposing Anthropic key client-side; security audit (W7) | [`Roots/app/api/extract/route.ts`](https://github.com/CSEN-SCU/csen-174-s26-team-project-roots-app/blob/main/Roots/app/api/extract/route.ts) |
| Replace localStorage with Supabase | W7 security audit finding TECH 2 (no auth/persistence); red team noted it as medium severity | Commit [`c77afd5`](https://github.com/CSEN-SCU/csen-174-s26-team-project-roots-app/commit/c77afd52866fe8b684fc8691f3a752a67ed93f47) |
| Add Overpass API geocoding fallback | Nominatim failing on hike/trail names that lack street addresses | Commit [`f5cfca7`](https://github.com/CSEN-SCU/csen-174-s26-team-project-roots-app/commit/f5cfca730fd54ce6772ad784093ee0b48e4b339b) |

---

## 3. Current State of the Prototype

**What it does today:**
- User pastes an Instagram Reel, TikTok, or YouTube Short URL into the inspiration field. `POST /api/extract` runs platform detection and oEmbed metadata fetch, sends title/caption/URL to Claude, and receives structured JSON: a plan type (route or project), stop/step list, location hints, tips, and duration estimates.
- Route plans geocode each stop via Nominatim with Overpass fallback; the first resolved stop fetches weather from Open-Meteo. The roadmap renders with a Leaflet map showing stops and travel legs (`Roots/app/components/RoadmapView.tsx`).
- Users can edit plans in-place: add/remove stops or steps, edit dwell times, drag-and-drop to reorder (commit [`147f39b`](https://github.com/CSEN-SCU/csen-174-s26-team-project-roots-app/commit/147f39b3d91bf838be78ad228a6ec0cc115cc5e2)).
- Plans are added to a calendar (day/week/month views) via the schedule flow (`Roots/app/components/CalendarView.tsx`).
- Auth and plan persistence are backed by Supabase.

**What it does not do yet:**
- Group planning (multi-user rooms, Gerardbot chat, voting) — prototyped in `roland_prototype/` but not in the main app (issues [#9](https://github.com/CSEN-SCU/csen-174-s26-team-project-roots-app/issues/9), [#23](https://github.com/CSEN-SCU/csen-174-s26-team-project-roots-app/issues/23))
- AI-assisted plan editing ("move this hike to a different city") — issue [#17](https://github.com/CSEN-SCU/csen-174-s26-team-project-roots-app/issues/17)
- Google Calendar sync — issue [#13](https://github.com/CSEN-SCU/csen-174-s26-team-project-roots-app/issues/13)
- Location-aware plan generation based on device GPS — issue [#14](https://github.com/CSEN-SCU/csen-174-s26-team-project-roots-app/issues/14)

**Seams:** The real-world social video extraction pipeline depends on publicly available oEmbed metadata and caption text; videos with no captions or platform-blocked oEmbed (TikTok in particular) fall back to URL-only extraction, which degrades plan quality. The demo video and URL parsing handle these gracefully by returning generic structure, but stop accuracy varies.

**Links:**
- Live URL: [https://roots-app-s26.vercel.app](https://roots-app-s26.vercel.app)
- Demo video: [https://youtu.be/ZjOUPIpExWU](https://youtu.be/ZjOUPIpExWU)
- Repo: [https://github.com/CSEN-SCU/csen-174-s26-team-project-roots-app](https://github.com/CSEN-SCU/csen-174-s26-team-project-roots-app)

---

## 4. Engineering Process: Testing, Security, Deployment

### Testing

**Planned (W5):** Unit tests for the extract pipeline (JSON parse correctness, geocoding response handling) and component-level smoke tests. Jest + ts-jest was the agreed toolchain. We scoped out end-to-end tests as out-of-budget given the sprint timeline.

**Implemented:** Jest + ts-jest runs via `npm test` in `Roots/`. The CI workflow executes tests on every push and pull request. One representative test is the extract pipeline's JSON parsing and validation logic in `Roots/__tests__/` — it verifies that a valid Claude response produces the correct `Roadmap` type shape and that malformed JSON is caught and surfaced as a user-facing error rather than a silent crash. The CI setup required skipping one deferred auth test that requires a live Supabase connection (annotated with `@skip-no-env`) — a human judgment call the AI-generated test scaffold did not make on its own.

**AI vs. human split:** Cursor generated the initial test stubs from the `lib/types.ts` type definitions — a 5-minute task that would have taken 30 minutes by hand. Human judgment was required to identify which paths were worth testing (the parse/validate cycle is the one most likely to fail in production) versus which to skip (geocoding, which requires live network). The deferred-auth skip annotation was written by hand after the AI scaffold caused CI to hang waiting for env vars.

CI workflow file: [`.github/workflows/ci.yml`](https://github.com/CSEN-SCU/csen-174-s26-team-project-roots-app/blob/main/.github/workflows/ci.yml)

### Security

**Planned (W7):** The red-team audit of Roots (conducted by TripSync's team) identified three technical findings and two responsible-AI findings. The findings and our remediations:

| Finding | Severity | Fix shipped |
|---|---|---|
| TECH 1/API 1: No URL input validation — any text accepted, free API access | High | Added URL format validation before the extract call fires; arbitrary text now returns a 400 before hitting Claude. Commit [`a893783`](https://github.com/CSEN-SCU/csen-174-s26-team-project-roots-app/commit/a893783469fbbd961fe3da1829453f0878eb06a3) |
| TECH 2: No authentication | Medium | Replaced localStorage with Supabase auth (commit `c77afd5`) |
| TECH 3: Raw model text in parse-failure logs | Medium | Parse-failure path now logs request ID + error type only, no model output slice. Documented in [`docs/sprint-2-remediations.md`](https://github.com/CSEN-SCU/csen-174-s26-team-project-roots-app/blob/main/docs/sprint-2-remediations.md) |
| API 2: Long-form YouTube URLs accepted | Low | Added platform detection to reject non-short YouTube URLs before Claude is called (`app/api/extract/route.ts`) |
| RAI 1: Crisis input shows JSON error, no crisis resources | Medium | Added a content check: when extract returns no valid JSON after a crisis-flagged input, the UI shows stable copy and a resource link rather than the raw error string |

API key management: no key was found in the repo at any point in git history (confirmed by the red team's audit). The Anthropic key is injected at runtime via Vercel environment variables, never committed.

### Deployment

**Planned (W6):** GitHub Actions CI on every PR and push to main; Vercel for hosting with automatic preview deployments on PRs.

**Implemented:** Every push to main and every PR triggers the `CI` workflow ([`.github/workflows/ci.yml`](https://github.com/CSEN-SCU/csen-174-s26-team-project-roots-app/blob/main/.github/workflows/ci.yml)), which runs lint and Jest in the `Roots/` directory (19 workflow runs as of code freeze). Vercel auto-deploys on merge to main. The workflow was added in [CI run #1](https://github.com/CSEN-SCU/csen-174-s26-team-project-roots-app/actions/runs/25462462405) (commit `678ccc2`). PR #19 was specifically a test of the CI gate requiring a passing check before merge ([CI run #2](https://github.com/CSEN-SCU/csen-174-s26-team-project-roots-app/actions/runs/25462734729)).

**AI vs. human split:** The GitHub Actions YAML was scaffolded by Cursor (install, lint, test steps). Human intervention was required to add the `--passWithNoTests` flag to avoid CI failure during the pre-test scaffolding phase and to configure the working-directory to `Roots/` rather than the repo root, which Cursor did not infer from the monorepo layout.

---

## 5. Successes, Setbacks, and What Would Change

### Successes

**1. The extract pipeline shipped fast and worked.** We had a functioning `POST /api/extract` end-to-end within Sprint 1 — real URL in, structured plan out. This happened because we spent W3 and W4 nailing the `lib/types.ts` type schema before writing a line of AI prompt logic. Having `Roadmap`, `Stop`, and `Step` typed first meant the Claude prompt had a concrete JSON target, and the first live run produced parseable output on the first try. We would keep the "types before prompt" practice.

**2. The Supabase migration went cleanly.** Replacing localStorage with Supabase mid-sprint (Sprint 2) in a running app is the kind of change that tends to cascade. It didn't, because the state access was already abstracted through `lib/store.tsx`. The migration touched one file plus the new Supabase client init, and CI stayed green (commits `c77afd5` → `93004a7`). We would keep the store-abstraction pattern.

**3. CI caught a real bug before merge.** PR #19 opened by Frank revealed that the test suite failed in CI even though it passed locally due to a missing env var. The CI gate forced the fix before main was touched. Without it, the broken test would have silently lived in main.

### Setbacks

**1. Geocoding was underestimated throughout.** Every sprint had at least one geocoding-related commit. Nominatim works well for addresses but poorly for named trails, neighborhoods, or landmarks described in video captions. We added the Overpass fallback late (Sprint 3, commit `f5cfca7`), but it should have been in the design from Sprint 1. The early signal we missed was in W4 testing: several sample reels failed to geocode any stops. We noted it as a known issue rather than a blocking one — that was wrong. Future teams: geocoding edge cases compound; treat them as a priority, not a polish item.

**2. The group feature never made it out of the prototype directory.** `roland_prototype/` has a working Gerardbot group chat and voting UI. It never merged into `Roots/`. The early signal was that we had two parallel directories with no convergence plan after Sprint 1. The sprint board showed the group cards sitting in "In Progress" for two sprints without moving to "Done." We would fix this by enforcing a merge-or-kill decision at the Sprint 2 retrospective rather than letting the split persist.

**3. The security remediations came late.** Three of the five red-team findings (URL validation, long-form YouTube detection, log sanitization) were straightforward and should have been baseline behavior from Sprint 1. We didn't think adversarially about the input field until an external team did. One commit — `a893783` (rate limiting and URL validation) — fixed what amounted to free API access for anyone who typed text instead of a URL. The early signal: the W5 testing plan focused entirely on happy-path extraction and never included adversarial inputs. We would add a security column to sprint planning, not just to W7.

### AI tools across the quarter

Cursor carried significant load on boilerplate: type scaffolding, initial component shells, the Actions YAML, and test stubs. It earned its weight on the `lib/types.ts` schema (which it generated from a prose description in about two minutes) and on `CalendarView.tsx` (a complex grid component it produced in a single prompt that needed only minor layout corrections). We had to override it twice in meaningful ways: it wired the Supabase client to `window.localStorage` as a fallback, which we had to catch and remove manually (commit `93004a7`), and its first draft of the extract prompt asked Claude to return markdown, not JSON, which would have broken every downstream parser. Both overrides required a human to read the output carefully rather than accept it wholesale.

---

## 6. Future Work

1. **Group planning rooms** (one sprint). Multi-user shared plans with voting are already prototyped in `roland_prototype/`. Merging `GroupView.tsx` and `GerardbotChat.tsx` into the main app and wiring them to Supabase real-time channels is a focused sprint of work. This matters because the W2 vision named group trip planning as a core use case, and it's never shipped.

2. **AI-assisted plan editing** (one sprint). Issue [#17](https://github.com/CSEN-SCU/csen-174-s26-team-project-roots-app/issues/17): let users prompt the plan directly ("move this to Boston," "add a lunch stop between stop 2 and 3"). The extract route already handles free-text; a second Claude call with the existing plan JSON as context would implement this.

3. **Google Calendar sync** (afternoon). Issue [#13](https://github.com/CSEN-SCU/csen-174-s26-team-project-roots-app/issues/13). The in-app calendar already schedules plans; exporting to `.ics` or calling the Google Calendar API would close the loop for users who live in Google Calendar.

4. **Location-aware plan generation** (one sprint). Issue [#14](https://github.com/CSEN-SCU/csen-174-s26-team-project-roots-app/issues/14): pass the user's device GPS to the extract route so Claude can geocode relative to "near me" rather than the video's implied location. This is a meaningful quality improvement for route-type plans.

5. **Video scraping for TikTok/Instagram captions** (research problem). Issue [#11](https://github.com/CSEN-SCU/csen-174-s26-team-project-roots-app/issues/11). oEmbed metadata for these platforms is thin; actual caption and audio extraction requires either platform API access (gated) or browser automation (fragile). This is not a sprint of work — it's a platform-dependency research problem.

---

## 7. Advice to Future CSEN 174 Teams

1. **Decide your type schema before writing your first AI prompt** — a typed contract for the model's output prevents a class of bugs that are expensive to debug mid-sprint.
2. **Add a "security" column to your sprint board from Week 1, not just Week 7** — adversarial inputs to an AI-powered field are not a polish concern, they are a launch concern.
3. **Kill or merge parallel directories by the Sprint 2 retrospective** — two competing prototypes with no convergence plan will both be incomplete at demo night.

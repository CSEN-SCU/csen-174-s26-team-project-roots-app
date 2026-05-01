[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/NfqHRKdw)

# Roots — CSEN-174 team project

**Roots** turns social video inspiration into actionable plans: paste a reel or short URL, and the app builds a structured **route** (real-world stops with map, travel legs, hours, weather) or **project** (step-by-step instructions and materials).

## Repository layout

| Directory | Purpose |
|-----------|---------|
| [`Roots/`](Roots/) | **Main app** — Next.js 14, Schedule + Calendar experience, Jest tests, and the production-shaped `/api/extract` pipeline. |
| [`roland_prototype/`](roland_prototype/) | **Alternate prototype shell** — four tabs (Today, Calendar, Group, Roadmaps) including Gerardbot group chat and voting demos. Same core types and extract route pattern; older dependency pins and no test script. |

Start with **`Roots/`** for the current primary UI and automated tests. Use **`roland_prototype/`** if you need the multi-tab “today + group” layout.

## Quick start (main app)

```bash
cd Roots
npm install
# Set ANTHROPIC_API_KEY in .env.local for live extraction (see Roots/README.md)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Details, environment variables, and feature list: **[Roots/README.md](Roots/README.md)**.

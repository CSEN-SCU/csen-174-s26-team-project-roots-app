[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/NfqHRKdw)

# Roots — Roland prototype shell

This folder is an **alternate Next.js front-end** for the same **Roots** concept: social URL in, structured **route** or **project** plan out. It shares the same domain types (`lib/types.ts`), mock data shape, and **`/api/extract`** pattern as the main app in **`../Roots/`**.

## How this variant differs

| | `roland_prototype/` | `../Roots/` (main) |
|--|---------------------|---------------------|
| **Navigation** | Four tabs: **Today**, **Calendar**, **Group**, **Roadmaps** | **Schedule** + **Calendar** |
| **Gerardbot / group voting** | **Today** and **Group** views include chat, proposals, and simulated voting | Those components exist in the repo but are not on the default home page |
| **Tests** | No Jest script | `npm test` |
| **Dependencies** | Older pinned Next 14.2.5 | Newer Next + Jest stack |

Use this prototype when you want to demo **group coordination** and the **Today** dashboard without reshaping the main app.

## Stack

Next.js 14 (App Router), React, TypeScript, Tailwind, Leaflet, Anthropic SDK (`app/api/extract/route.ts`).

## Setup

```bash
npm install
```

Add **`.env.local`** with:

```env
ANTHROPIC_API_KEY=sk-ant-api03-...
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

For the **canonical** README, environment notes, and test commands, see **[../Roots/README.md](../Roots/README.md)**.

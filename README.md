# Paws & Pedigrees

A browser game about inheriting Grandpa's old championship kennel, starting again with a shelter rescue, and building a
kennel legacy through training, working, competing and breeding generations of dogs.

This branch (`rebuild`) is a fresh rebuild. The earlier prototypes live on the `prototype-archive` branch. Product
direction and decisions are in [docs/GAME_VISION.md](docs/GAME_VISION.md); the current playable test is described in
[docs/PHASE1_FIELD_TEST.md](docs/PHASE1_FIELD_TEST.md).

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

Other commands:

| Command | What it does |
| --- | --- |
| `npm test` | Unit and simulation tests (Vitest) |
| `npm run build` | Type-check and production build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `node scripts/screenshots.mjs` | Opens the game in Edge at desktop and phone sizes and saves screenshots to `.browser.local/` (dev server on port 5180) |
| `node scripts/playthrough.mjs [label] [phone]` | Scripted playthrough: a mark, a blind and a lesson, with screenshots |
| `node scripts/dogshots.mjs [seed]` | Screenshots of the dog viewer in several poses |

Open `/?view=dogs&seed=1` for the development dog viewer.

## How the code is organised

```
src/core/     Pure game rules: seeded randomness, maths, genetics (coat loci, polygenic traits, breeds), the dog record
src/sim/      Pure, fixed-step simulations: the dog's behaviour, wind and scent, retrieves, marker training, result cards
src/render/   React Three Fiber scenes: the field, the procedural dog and its coat shader, the keeper, camera
src/app/      Game state (zustand), input, actions, sounds, the interface snapshot
src/ui/       The on-screen interface and panels
tests/        Vitest tests, including tests that play the exercises with scripted handlers
```

Rules and simulations never import React or three.js, so they can be tested and later run on a server.

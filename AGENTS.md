# Project context for coding sessions

**Current build:** `npm run dev`, `npm test`, `npm run build`. Phase 1 test guide: [docs/PHASE1_FIELD_TEST.md](docs/PHASE1_FIELD_TEST.md). Keep rules and simulations in `src/core` and `src/sim` free of React and three.js. Write normally formatted code (Prettier, 100 columns).

**October 1, 2026: full redesign approved.** Read the first section of [docs/GAME_VISION.md](docs/GAME_VISION.md) before anything else. The new game is built fresh on the `rebuild` branch, mechanics first, with playtest gates between phases. The `prototype-archive` branch holds everything from before the rebuild. Only the story is fixed; the bullets below describe earlier prototypes and are kept as history. Where they conflict with the approved redesign, the redesign wins. Key confirmed rules: player skill must visibly change outcomes (no click-and-wait play); no dog deaths; dogs age by season, not by day; build for future in-game purchases with fair free and premium leagues; keep costs low.

Before planning or changing gameplay, onboarding, progression, competition, breeding, or monetization, read [docs/GAME_VISION.md](docs/GAME_VISION.md). It records the owner's current direction and distinguishes agreed goals, future activities, proposals, and open decisions.

- Follow the latest user instructions. Older milestone documents and the README feature catalogue do not establish current product priorities or prove that a feature is implemented.
- The owner has authorized beginning the redesign and selected a closer follow camera with keyboard movement and phone controls. The Homecoming rebuild is separate from the existing game at `/?preview=legacy`; see `docs/HOMECOMING_PREVIEW.md`. Field Club and woodland search remain earlier experiments, not constraints on the redesign. Preserve the grandfather inheritance, rescue-first beginning, and breeding-centered legacy. Further story/balance details remain proposals where marked.
- Do not treat the owner's illustrative breed or discipline examples as an exclusive plan. Do not describe proposed systems as completed.
- Preserve the human keeper/handler perspective, rescue-first beginning, long-term kennel/breeding vision, and fair free-versus-paid competition requirements.
- Local IndexedDB play remains the current persistence choice. Keep new rules and data compatible with eventual cloud migration; use isolated saves for automated browser tests.
- Record new confirmed product decisions and materially changed implementation status in the vision document so later sessions retain context.

For the immediate code task, also read the relevant implementation notes linked from that document.

- The owner authorized continued connected gameplay development with meaningful testing check-ins. Homecoming now includes shelter adoption, a named founding rescue, settling and first recall; it saves to its own `paws-homecoming` IndexedDB repository. Preserve that progress as well as the original game save. The main game store is not mounted by this route. Do not describe the full training/competition/breeding systems as implemented in the rebuild.

- Latest October 1 feedback supersedes expansion of Homecoming: the owner rejected it as too similar to the old game and authorized a new yard playtest. `/?preview=yard` is isolated and never opens a database. See `docs/PLAY_YARD.md`. Establish enjoyable continuous interaction and a distinct cartoon presentation before adding more progression content. Existing Homecoming saves must remain intact.

- Latest owner clarification (October 1): combine the newest cartoon characters with the Homecoming property. The main concern is feel and mechanics, not another visual redesign. Homecoming now includes continuous fetch in its own courtyard with the adopted dog; see the latest section of `docs/HOMECOMING_PREVIEW.md`. Prioritize connected play here rather than building a third standalone environment. Preserve both saves; fetch is temporary free play, not saved training rewards.

- The owner requested a more substantial playable slice to decide whether the game is worth pursuing. Homecoming now connects the front gate to three authored neighborhood search/retrieve requests in a shared orchard loop. See `docs/NEIGHBORHOOD_OUTINGS.md`. Preserve optional saved work records, one-time payouts, and adoption progress. Do not call this a complete game, competition circuit, procedural investigation system, or validated enjoyable experience.

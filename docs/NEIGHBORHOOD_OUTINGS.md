# Neighborhood outings

Implemented locally October 1, 2026 in the existing Homecoming route. This is a full request/search/retrieve/return/reward loop for playtesting, not a final game or a new standalone demo.

## Access and controls

After settling an adopted dog, Homecoming points to the front gate for Mara's missing satchel. Use Walk there or walk to the gate yourself, open the gate interaction, and choose Help Mara. No focus-walk completion is required. The first request unlocks Ellis and Rowan; they use different clue locations and creek approaches in the same orchard map.

WASD/arrows or the analog phone pad move the keeper. Q/E or turn buttons orbit the close camera. Click/tap reachable nearby ground to ask the dog to investigate (within ten meters). C/the pace button toggles careful search and jogging. R/Whistle recovers rabbit distractions and recalls the dog. M/Trail map shows landmarks and positions. Follow your dog and local gold scent particles; being within five meters lets a sniff inspection finish. Once the dog identifies the bag, approach within three meters and use F/Bring it. Return physically to the southern trailhead together. Pause/leave is always available. The native result dialog has an explicit return home.

## Rules and architecture

- `outings.ts`: pure mutable activity simulation, bounded navigation, collision, authored cases, abilities, qualification and pure reward rules.
- `OutingGame.tsx`: input, follow camera, dog indications, characters, bag retrieval, map and dialogs.
- `OutingScenery.tsx`: shared orchard loop, bridge and stepping-stone crossings, rocks, trees and rabbits.
- `LegacyPreview.tsx`: front-gate job board, immediate objective, activity entry/return and saved reward dispatch.
- `Journey.work`: optional backward-compatible record containing unique completed case IDs, earned search experience and best partnership score. Existing version-two snapshots without this field remain valid. Version-one care migration remains intact. Invalid work data must not silently reset.

The activity uses the actual adopted dog's scent/focus and current learned focus. Detection range is 2.8 + scent/18 + focus/35 + searchExperience/30 meters; jogging multiplies this by .45. A scent lock leads the dog toward the current clue while the keeper stays nearby. Rabbit encounters can distract dogs below 90 combined natural/learned focus; a whistle immediately recovers attention. Keeper experience shortens inspection from 1.6 seconds down to a .7-second minimum. All thresholds are prototype balance, not claims about real breeds.

The creek is a barrier except at its two crossings. Sampled grid navigation keeps the dog on traversable routes. A deliberate return to the same neighbor completes the activity; merely spotting a hidden item is insufficient. The partnership score uses time together during active movement and distraction count, not an idle-time or speed bonus.

Each unique job grants 2 meals, 8 keeper XP, 10 search XP, 4 bond and consumes 15 energy/12 water/8 food. Qualification requires a settled dog and enough condition to cover that cost with a small reserve. Replaying a completed case bypasses condition gates because it awards and consumes nothing. Reward dispatch is idempotent per case. No completion on cancellation; mid-outing position is temporary and a refresh restarts the outing from home. Rewards commit only on Return home together. The original game save is untouched.

## Scope limits

The three requests are authored variations in one map. There are no randomized clue graphs, live NPC schedules, dynamic weather, payments, competition or breeding additions. Environmental art remains prototype geometry. Supplies and ability gains are a first meaningful consequence, not a full facility/economy loop. Real playtesting must establish whether exploration and handling are engaging.

## Verification

Unit tests drive all three routes through actual simulated movement and dog detection, assert walkable positions and physical return, compare aptitude/pace detection, verify whistle recovery, qualification and one-time rewards. `scripts/homecoming-outing-smoke.mjs` uses isolated browser saves and real desktop/phone input for a complete first request, pause/map, crossings, pickup/return, unlocks and reload. Browser screenshots live in ignored `.browser.local`.


Final local verification: 81 unit tests passed; the first request passed complete desktop and emulated-phone playthroughs through the saved payout/unlock/reload; TypeScript, targeted lint and production build passed. The existing build warnings concern stale Browserslist data and large shared bundles. No deployment was performed. Actual-phone performance and whether the outing is enjoyable remain human playtest questions.

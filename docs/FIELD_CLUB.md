# Field Club: first playable multi-discipline slice

September 29, 2026. Product direction: [GAME_VISION.md](GAME_VISION.md).

## What a tester does

1. Adopt and name a founding rescue. Existing players keep their kennel and dogs.
2. In the kennel, choose **Visit the Field Club**, the physical **Field Club** marker, or the Keeper Desk's **Field Club sports** option.
3. Follow the suggested scent-search practice, then explore herding, water retrieval, and agility. Each activity has instructions, live feedback, pause/exit, and a result to save.
4. Prepare the dog using the club's care panel. Buy food before serving a meal; water and rest are free. The same supplies and needs are used everywhere in the game.
5. Enter the beginner combined trial after trying all four disciplines with that dog. Complete four rounds with the same companion and compare the round-by-round standings.
6. Use the first-completion grant to help adopt another rescue, allocate dogs to team rounds, or practice a weak discipline. Specialist entries also open after the introduction.

The introduction is completed by finishing the combined trial, not by winning. Daily rewards begin on a subsequent day. Regional/national championships, working careers, and additional activities are visible future directions, not disguised playable buttons.

## Four distinct activities

| Discipline | Player decisions | Ability effects |
| --- | --- | --- |
| Agility | Direct movement, approach obstacles in order, cue jumps, negotiate tunnel/weave/seesaw gates. | Course speed; existing simulation governs acceleration, momentum, faults and jumping. |
| Scent search | Explore nine stations, follow a proximity scent signal, stop to investigate three hidden objects. | Detection range and time needed to investigate. |
| Herding | Position behind sheep relative to the pen, follow as they move, choose steady or brisk pressure. | Working distance and tolerance for close handling. |
| Water retrieval | Collect numbered dummies, choose a return route around a current, recall to shore and manage stamina. | Swim speed and stamina efficiency. |

The handler remains visible. Ground clicks send the dog; named buttons provide an alternate control path in the three new fields. Agility retains keyboard/touch controls and also accepts ground destinations. New field rounds stop after three targets or 180 seconds; partial work scores at timeout. Pausing or leaving awards nothing until a result is saved. Leaving a round preserves the current visit so the unfinished round can be retried. Ending the visit retains completed-round training but forfeits event completion.

## Progression and balance

- Natural aptitude combines game-specific breed/composition tendencies and existing inherited stats. These are fictional balancing values, not biological claims. Individual variation and mixed ancestry affect the result.
- Rescue aptitudes are initially hidden. One saved attempt reveals an early indication; three reveal a numerical assessment. Purchased dogs disclose aptitude immediately. Discovery does not create the underlying ability.
- Per-dog, per-discipline experience develops learned ability independently of inherited potential. Legacy trained stats and bond contribute modestly. Better aptitude increases learning yield as well as performance.
- Keeper levels increase club learning by 4% per level above level 1, capped at +80%. Existing coaching skill supplies a smaller additional modifier.
- Each saved round uses 6 energy and 4 training points. First exploration awards 35 keeper XP; later rounds award 15. First event-category completion adds 80 XP. Existing level-up rewards remain in use.
- Practices require activity eligibility and enough resources. Events also require at least 60% food/water and enough energy/TP for every assigned round. Care remains available between rounds.
- Combined events require one dog and all four prior practices. Team events require at least two distinct dogs from the player's kennel; one dog may take multiple rounds. Event order is agility, search, herding, water. No substitutions after starting a visit.
- All scores use 0–100. Four-round overall scores are equal-weight averages. The result table shows stable simulated local rivals with different strengths. A tied displayed average currently favors the player in this introductory preview.
- Grants: $150 for the first combined completion, $120 for the first team completion, $40 for each first specialist completion. Replays earn development and records, not repeat entry grants. This prevents an unlimited free-entry cash source, but is not the final repeatable economy.
- Existing adult/nursery breeding rules remain. The new learned discipline experience is not inherited. Breed composition and base stats continue to influence offspring aptitude; new explicit discipline genetics and career qualifications remain future work.

## Implementation and storage

- `src/game/club/model.ts`: versioned types, aptitude/learning rules, scores and local standings.
- `simulation.ts`: pure search/herding/water movement and interaction rules.
- `progress.ts`: enrollment, entry checks, atomic round receipts, rewards and cancellation.
- `FieldGame.tsx`: shared R3F rendering and controls for three fields, using existing dog/handler assets.
- `FieldClub.tsx` / `club.css`: direction, preparation, records, roster selection and results.
- `src/game/agility/AgilityGame.tsx`: reused obstacle simulation and scene with optional handler mode.

Club progress is stored as version 1 under `tutorialProgress.fieldClub` in the existing IndexedDB snapshot, including records keyed by dog ID, the active visit, its saved round receipts, first-grant keys, and the latest 16 visit reports. Old snapshots without the field enroll on first entry; no reset is required. The current in-progress physical round restarts after reload, while completed rounds remain saved.

Club entry is local-only until cloud persistence covers this domain. Domain rules and simulation are separate from rendering; a future command service can validate/persist the same structures without replacing the scenes. Local results are not trusted multiplayer scores. Cloud transactions, import/migrations, entitlements and payments are separate work.

## Validation and limits

`npm test` covers full simulation completion, aptitude/learning differences, invalid entry, prerequisites, resource costs, duplicate/stale results, cancellation, combined/team rosters, grants and serialized progress. Existing agility tests include continuous traversal of every gate.

With Vite running on port 5173 and Playwright Chromium installed, `npm run test:club` uses isolated browser saves. It covers real adoption, first search, new field controls, results, reload/resume, agility launch/cancellation, and desktop/mobile layouts. `scripts/first-day-smoke.mjs` now runs this current onboarding check. `node scripts/club-events-smoke.mjs` uses saved three-round fixtures then plays the final round to check combined/team grants, second adoption, roster selection, landscape layout, breeding navigation and reload. It does not claim to play all eight event rounds in a browser. These checks do not touch the developer's save or establish that human players find the game enjoyable.

`node scripts/club-controls-smoke.mjs` checks real mouse/touch ground commands, pause/resume, agility destination movement and cancellation. The production build, 49 gameplay tests, club activity/event/control checks, and existing navigation/desk checks passed during this milestone. Phone checks use browser emulation, not physical hardware.

Early visual limitations: simple authored field geometry, reused dog animations (including an approximate swim pose), and fixed club courses. Search target layouts vary by visit; herding and water need more course variety and difficulty tuning. The game is still a prototype, not a production online league or a finished lifetime/economy simulation. Real-phone performance and unfamiliar-player comprehension need human testing before increasing content scope.

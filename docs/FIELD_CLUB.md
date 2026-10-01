# Field Club: first playable multi-discipline slice

September 30, 2026. Product direction: [GAME_VISION.md](GAME_VISION.md).

## What a tester does

1. Adopt and name a founding rescue. Existing players keep their kennel and dogs.
2. In the kennel, choose **Visit the Field Club**, the physical **Field Club** marker, or the Keeper Desk's **Field Club sports** option.
3. Choose any club event your dog qualifies for. The board shows working ability and a requirement of 35. Dogs do not have to rehearse an event to enter it.
4. Develop weaker disciplines through separate training: ground-pad footwork for agility, dry-land conditioning for water, and focus/steadiness holds around a distraction for search/herding. These two focus disciplines currently share an exercise, with separate progression.
5. Prepare the dog using the club's care panel. Buy food before serving a meal; water and rest are free. The same supplies and needs are used everywhere.
6. Finish a first event to open club membership and wider kennel options. Complete a club event in each discipline with the same dog to enter its four-round combined trial. Team trials use at least two dogs.
7. Work toward deep woods expedition and cross-current endurance retrieval (four distant dummies). These require 120 experience in that sport and working ability 55. They are harder events within existing sports, not new disciplines.

Membership is awarded for finishing a first club event, not for winning. Daily rewards begin on a subsequent day. Regional/national championships, working careers, and additional sports remain future directions.

## Four distinct activities

| Discipline | Player decisions | Ability effects |
| --- | --- | --- |
| Agility | Cue obstacles in order; reposition if necessary. The dog approaches, jumps, traverses gates and stops for the next command. | Running speed, acceleration, turning, braking, jump timing and preparation. |
| Scent search | Follow a missing-bag case through woodland forks, read evidence, recover broken trails and redirect animal distractions. | Detection reach, investigation time, resistance to distractions and ability to bridge faint trails. |
| Herding | Select a sheep, then correct with flank/drive cues and steady/brisk pressure. | Reassessment frequency, positioning accuracy, working distance and scatter tolerance. |
| Water retrieval | Send to a dummy, choose direct/sheltered routing, manage stamina and redirect an empty return. | Swimming speed, current resistance, stamina efficiency, pickup duration and follow-through. |

Ground clicks remain available for repositioning. A water dog with working ability below 38 turns back without its first dummy once; sending again lets it finish. This deterministic beginner mistake demonstrates follow-through without repeated random failure. The entry floor is 35, so only the least prepared eligible dogs show it. Advanced water includes a dummy in the current.

Herding and water events stop at all targets or 180 seconds, with partial credit at timeout. Woodland search allows recovery without a failure countdown; elapsed time contributes to its score. Separate training stops at its objective or 120 seconds. Pausing or leaving awards nothing until a result is saved. Completed rounds persist between visits; the unfinished physical round restarts after reload. Ending a visit keeps saved development and forfeits its completion grant.

## Progression and balance

- Natural aptitude combines game-specific breed/composition tendencies and existing inherited stats. These are fictional balancing values, not biological claims. Individual variation and mixed ancestry affect the result.
- Rescue aptitudes are initially hidden. One saved attempt reveals an early indication; three reveal a numerical assessment. Purchased dogs disclose aptitude immediately. Discovery does not create the underlying ability.
- Per-dog, per-discipline experience develops learned ability independently of inherited potential. Legacy trained stats and bond contribute modestly. Better aptitude increases learning yield as well as performance.
- Keeper levels increase club learning by 4% per level above level 1, capped at +80%. Existing coaching skill supplies a smaller additional modifier.
- Each saved round uses 6 energy and 4 training points. The first fully completed training exercise per sport adds a one-time 15 discipline XP bonus; incomplete attempts do not consume it. Training reports show working ability before and after learning. Empty attempts award no discipline XP. First exploration awards 35 keeper XP; later rounds award 15. First event-category completion adds 80 XP. Existing level-up rewards remain in use.
- Training requires activity eligibility and enough resources, without an ability floor. Club events additionally enforce working ability 35; advanced events enforce 120 discipline XP and ability 55. Events also require at least 60% food/water and enough energy/TP for every assigned round. Care remains available between rounds.
- Combined events require one dog and prior club event completion in all four sports. Separate training does not fill the event passport. Team events require at least two distinct dogs from the player's kennel; one dog may take multiple rounds. Event order is agility, search, herding, water. No substitutions after starting a visit.
- New score reports give up to 60 points for completion, 25 for pace and 15 for control. Time reduces pace continuously, each mistake costs 3 control points, and partial completion scales all components. Actual time, distance, relevant handling metrics and score components are saved. Older scores are labeled earlier bests; the first event under the new rules starts a comparable best. Training never overwrites event bests.
- All scores use 0–100. Four-round overall scores are equal-weight averages. The result table shows stable simulated local rivals with different strengths. A tied displayed average currently favors the player in this introductory preview. Revised reports use stronger fixed rivals on the new scoring scale; historical reports retain their original rivals. A timed-out partial event saves development but does not fill the event passport, award a completion grant or unlock membership.
- Grants: $150 for the first combined completion, $120 for the first team completion, $40 for each first specialist completion. Replays earn development and records, not repeat entry grants. This prevents an unlimited free-entry cash source, but is not the final repeatable economy.
- Existing adult/nursery breeding rules remain. The new learned discipline experience is not inherited. Breed composition and base stats continue to influence offspring aptitude; new explicit discipline genetics and career qualifications remain future work.

## Implementation and storage

- `src/game/club/model.ts`: versioned types, aptitude/learning rules, scores and local standings.
- `simulation.ts`: pure search/herding/water movement and handler-task rules.
- `trainingSimulation.ts` / `TrainingGame.tsx`: separate foundation exercises and their 3D training yard.
- `performance.ts`: shared score components and actual-execution reports.
- `progress.ts`: enrollment, entry checks, atomic round receipts, rewards and cancellation.
- `FieldGame.tsx`: shared R3F rendering and controls for three fields, using existing dog/handler assets.
- `FieldClub.tsx` / `club.css`: direction, preparation, records, roster selection and results.
- `src/game/agility/AgilityGame.tsx`: reused obstacle simulation and scene with optional handler mode.

Club progress is stored as version 1 under `tutorialProgress.fieldClub` in the existing IndexedDB snapshot, including records keyed by dog ID, the active visit, its saved round receipts, first-grant keys, and the latest 16 visit reports. Old snapshots without the field enroll on first entry; no reset is required. The current in-progress physical round restarts after reload, while completed rounds remain saved.

Club entry is local-only until cloud persistence covers this domain. Domain rules and simulation are separate from rendering; a future command service can validate/persist the same structures without replacing the scenes. Local results are not trusted multiplayer scores. Cloud transactions, import/migrations, entitlements and payments are separate work.

## Validation and limits

`npm test` covers full simulation completion, stronger-versus-weaker execution, qualification rules, distinct training exercises, novice water redirection, advanced layouts, invalid entries, care/resource costs, duplicate/stale results, cancellation, rosters, grants and serialized reports.

With Vite running on port 5173 and Playwright Chromium installed, `npm run test:club` uses isolated browser saves. It exercises rescue adoption, separate focus training, woodland investigation and recovery, saved result details and reload, qualification, automatic water returns, full handler-cued agility, and desktop herding. Trained-dog fixtures cover event controls without claiming to earn every XP point in the browser. `node scripts/club-training-smoke.mjs` plays pad footwork, conditioning pace/recovery, deep woods search and the four-dummy advanced water event. Additional control/event scripts cover pointer movement, pause/exit and combined/team final rounds. See the release response for checks actually run; phone emulation is not physical-device validation.

Early visual limitations remain: simple authored geometry, shared dog animations including an approximate swim pose, fixed club courses, and the shared focus exercise for search/herding. Search targets vary by visit. Herding/water need further course variety. Qualification values, learning speed, opponent scores and the repeatable economy need human playtesting. Fixed simulated rivals are not calibrated competitive leagues. This update does not deliver the full lifetime, working-career, online or monetization design.

The September 30 woodland redesign replaces box search in every club search round, including combined/team events. See [WOODLAND_SEARCH.md](WOODLAND_SEARCH.md) for the current mechanics and dedicated browser check. Earlier box simulation remains covered for compatibility; its old field UI is no longer used by club search.

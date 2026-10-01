# Homecoming environment preview

The owner authorized beginning the redesigned game and selected a closer follow camera with keyboard movement and phone controls. This first slice tests the property scale, camera, movement, contextual interaction, and introductory atmosphere. It now continues through a shelter visit, founding-dog adoption, settling in and a first recall lesson. It is not the full redesigned game or final art.

## Access and isolation

- Local URL: `http://127.0.0.1:5173/?preview=legacy`.
- The existing kennel hub includes a Homecoming preview link.
- Pause and Test tools offer a return to the current game.
- The same repository and Vite/Vercel entry point are retained. No deployment was performed.
- `main.tsx` lazy-loads the preview before the existing store hydration/single-writer lock. It does not mount App, gameStore, auth, or save services. Existing IndexedDB progress is untouched.
- Homecoming progress now saves separately in IndexedDB `paws-homecoming`, store `journey`. Story flags, kennel name, founding rescue, observations, bond and first recall survive refresh. Position, test companions and temporary camera settings do not persist. The original game database and schema are unchanged.

## Implemented

- Newly authored courtyard environment with a timber kennel, workbench/ledger, one run, food supplies, a nursery exterior, fenced meadow scenery, planting, trees, and distant hills. Ground textures are generated locally; scene uses no remote asset services.
- Follow camera, keyboard WASD/arrows, Shift jogging, full Q/E camera rotation, camera buttons, wider property view, touch direction pad, ground click/tap navigation, and journal destinations. Camera clearance retracts the view before buildings instead of restricting rotation to one side of the courtyard.
- Collision-aware movement and bounded grid navigation for walking to landmarks. Play space is the courtyard; interiors and surrounding grounds are not yet traversable.
- Nearby interaction with F or a contextual button. One current objective gives directions and can walk the keeper there.
- Three-part illustrated arrival story: Grandpa with his dogs, the kennel in its championship years, and the keys/ledger he leaves the player after passing away. Player-paced Back/Continue/Skip controls, reduced-motion support, phone layout, and replay from Journal. The final page directs the player to his workbench. Read his ledger, prepare a run (visible blanket), name the kennel (updates physical sign and header), and reach the gate. Story references to money and food establish the premise; this isolated scene does not yet implement an economy.
- Nursery and training-ground interactions describe their future role. The gate opens Larchwood Rescue once the ledger, run and kennel name are ready. The first run becomes the settling-in objective after adoption.
- Initial Test tools: temporary companion and restored-finish visual toggles, plus restart of this preview. These are openly available preview controls, not a secured production admin feature. Level/stat/genetics/time editors remain future work.
- New original Blender keeper and athletic/stocky companion assets replace the old preview figures. The keeper has a modeled face, hair, clothing, hands, rounded boots, and an articulated skeleton. Dogs have continuous torso/limb meshes, eyes, muzzle, folded ears, paws, a two-bone tail, collar and tag, and baked idle/walk/run/sniff/sit clips. Test tools can switch companion builds. This is a stylized refinement pass, not final breed-specific art or a coat-genetics implementation. See [character assets](HOMECOMING_CHARACTERS.md).
- Adopted dogs and test companions explore/sniff nearby, follow, recall, and wait. The adopted dog retains its selected body build, collar and chosen name. Test companions are disabled once a founding rescue is adopted. Test companions do not grant adoption, stats, rewards, care, or breeding access. Earlier game scenes still use their existing character assets.
- A front-gate arch and open gates, courtyard direction signs, and a road/treeline beyond the entrance make the exit recognizable. A persistent direction indicator identifies the current destination, distance, and whether it is behind/left/right/ahead. Face destination turns the close camera without moving the keeper. Journal destinations update this indicator while the story objective stays visible. The gate sign's back hides when it would occlude the follow camera.
- Dialogs and loss of browser focus pause movement. Native modal dialogs provide focus containment, Escape, and explicit close/return controls.

## Implementation boundaries

`src/game/legacy/property.ts` owns positions and navigation. `PropertyScenery.tsx` owns environment geometry/materials. `PropertyWorld.tsx` owns foreground movement/camera and companion behavior. `LegacyPreview.tsx` owns the temporary introduction and interaction UI. No economy or genetics rules are duplicated here.

This is a new exterior prototype, not a cosmetic conversion of the old cutaway menu. Final art, interior transitions, sound, the full care/economy/lifecycle, additional training activities, competition circuit, genetics, detailed coats, and full admin tools still need implementation. Do not describe those as delivered or lower normal unlock requirements to demonstrate them.

## Validation

`scripts/legacy-preview-smoke.mjs` uses isolated desktop and emulated-phone browser contexts to exercise movement, walking to landmarks, the introduction, naming, gate ending, test companion controls, pause, and reset. It checks that only the separate Homecoming database is opened and the original game store is not mounted and captures screenshots. Physical-phone performance and enjoyment still require human testing.

`scripts/legacy-visual-smoke.mjs` checks the new keeper and both companion assets, behind-camera gate directions, facing a destination, full camera rotation, and sit/release controls. The game unit suite includes camera clearance, directional bearings, and reachability around the added signpost/entrance pillars. Studio and in-game screenshots are inspected in addition to automated checks; scripted success does not establish finished art quality.

`scripts/legacy-story-smoke.mjs` checks the illustrated prologue at desktop, phone, small-phone and landscape sizes: all pictures load, pages advance/backtrack, movement pauses, skip and journal replay work, and replay preserves preview state without opening the original game database. `HomecomingStory.tsx` owns the presentation and story copy; original assets and generation prompts live in [the artwork manifest](../art/story/homecoming/README.md), with compressed JPEGs served from `public/story/homecoming/` (about 1.2 MB combined). These are story illustrations, not exact renders of the current 3D scene. No narration/audio has been added. Intro completion now persists with the separate Homecoming journey.


## Shelter and founding companion (September 30)

The owner authorized continuing through connected playable sections, checking in at meaningful testing points rather than requesting approval for every small step. The first continuation adds:

- A separate 3D shelter with three named rescue candidates, animated greetings, beds, bowls and a meeting area. Selecting a candidate brings the camera to that dog. Mobile keeps the 3D scene visible above a separately scrolling interaction card.
- Each candidate has an individual introduction, age, sex, body build, collar and response timing. All are mixed breeds; their underlying fictional aptitude profiles are not scientific breed claims. Greetings reveal behavioral observations, not numerical potential. These profiles are stored for later systems; they do not yet drive a competition or a genetics simulation.
- Wait quietly, offer a toy or invite closer. Complete one meeting with the selected dog before naming and confirming adoption. Meeting a different candidate does not count. The first adoption is covered, with one prepared run and no currency gate; the actual starting economy is still pending.
- Adopt and name one founding companion, return together, settle at the prepared run and try a first recall. Ask the dog to wait, walk at least three meters away and call. The milestone completes only once the dog actually arrives. It awards five bond once, not on repeated clicking. This introductory command lesson is not the final training system.
- A journal record retains shelter observations. New objectives explain the next action and explicitly identify the current end of the slice after the recall.
- Restart now asks for confirmation and affects only Homecoming. Test companions/build switches cannot replace an adopted dog.

`journey.ts` owns the versioned serializable model and adoption rules. `journeyRepository.ts` owns the IndexedDB adapter behind a small repository interface suitable for a future server adapter. Saves compare revisions inside a read/write transaction, so stale tabs cannot overwrite newer progress. The hook waits for hydration, serializes writes, exposes saving/error status and offers retry and JSON download on save failure. Unsupported/incomplete saves stop loading rather than being replaced with defaults. JSON downloads preserve data for recovery; a restore UI is not implemented yet.

`scripts/legacy-adoption-smoke.mjs` covers desktop and emulated-phone meetings, candidate-specific eligibility, invalid/valid names, adoption, homecoming, first recall, reload and preservation of an original-game sentinel save. `scripts/legacy-storage-smoke.mjs` tests revision conflicts and unsupported-save protection. Unit tests cover adoption prerequisites, one-dog capacity, independent stored aptitude data and invalid records. Existing story/property smoke tests now expect the separate database.


## Care and focus walk (next playable continuation)

- Version 2 of the Homecoming snapshot adds `routine`: food, water, energy, meal stock, first meal/water flags, learned focus, keeper experience, lesson records and invitation acknowledgment. Version 1 migrates with conservative starter values and preserves every existing story/dog field. Database schema stays version 1; snapshot and database versions are different concerns.
- After first recall, the objective points to the run for a meal and water. Four meals are available immediately, resolving the missing-starting-food problem. Water/rest are free. Empty cupboards offer one emergency rescue meal, so this limited slice cannot strand a player before the earning/shop systems exist. This support is a prototype safety net, not the final economy balance.
- Meals, drinks and quiet rest direct the dog to the run. A short action must finish before stats/stock change. Meals restore 45 food and consume one portion; water restores to 100; rest restores 35 energy. Actions at 90 or above are unavailable. Interrupted actions do not consume anything. Movement is paused while property dialogs are open.
- The focus walk is a separate meadow scene. WASD/arrows, touch direction pad or ground taps move the keeper. Both keeper and dog must reach each of five markers together. Scent patches create recoverable distractions; easy/brisk pace and route matter. Call close resets attention with a four-second cooldown; praise only counts once per marker while close and attentive. Beginner dogs can always recover.
- Natural focus, learned focus and keeper experience determine attention and following speed. Quality rewards staying together during active movement and well-timed praise, with no speed bonus or failure countdown. Waiting motionless cannot inflate the score. A completed lesson awards 3-8 focus, 5-10 keeper experience, and costs 18 energy, 8 food and 12 water. A dog needs at least 40 food/water and 30 energy to begin. Exit/pause is available throughout. No training is credited until accepting the completed lesson.
- The first completed lesson points to a newcomers' meet invitation at the front gate. The panel explicitly states that the actual event is the next chapter to build. Do not present the invitation as a playable competition or the focus walk as the finished multi-discipline training system.
- Care/lesson rules are in `routine.ts`; the deterministic movement/scoring simulation is in `focusWalk.ts`; `FocusWalkGame.tsx` owns the meadow and controls. Art remains replaceable independently of these systems.
- Unit coverage includes old-save migration, care/resource guards, quality-dependent gains and actual simulated lesson completion. `scripts/legacy-training-smoke.mjs` drives real desktop and phone movement through care, the lesson and reload. These checks establish function, not enjoyment.

## Visual target

Owner preference: a polished cartoon/stylized look, with expressive dogs, deliberate proportions, cohesive materials, scenery and animation. A dedicated art pass is deferred while connected gameplay is established. Adding polygons alone is not the art plan, and the current procedural environment is not a final quality target. Existing story illustrations establish mood rather than guaranteeing matching in-game fidelity.

Validation for this continuation: 74 unit tests, desktop/emulated-phone care-to-training-to-reload checks, pause/cancellation checks with native modal focus containment, TypeScript/lint and production build passed locally. The training exit smoke is `scripts/legacy-training-exit-smoke.mjs`.


## Combined courtyard and cartoon characters (October 1)

This supersedes the earlier Blender-character implementation status above. `CharacterModel.tsx` now adapts scene poses to the cartoon characters shared with the play-yard experiment. Original Blender source/assets remain for reference; they are not loaded by Homecoming. Shelter, courtyard and focus walk use the same new figures, with stocky proportions and rescue collar colors retained.

Use **Play fetch** on the companion panel at `/?preview=legacy`. It is available with an adopted or temporary test companion, except while care is running. Hold/drag/release on courtyard ground to aim and throw; WASD/arrows or phone direction buttons keep moving the keeper. Q/E, camera buttons and Look around remain available. Call helps during hesitation or playful laps. **Put toy away** restores ground-click walking and the current story objective. No progression prerequisite has been removed; fetch is optional companionship, with no training credit or resource changes.

`propertyFetch.ts` adapts the shared play simulation to Homecoming's collision geometry/pathfinding. Ball movement checks the swept path to avoid tunneling through narrow posts or planters; throws are contained to reachable courtyard ground. This currently treats solid footprints as barriers at all ball heights rather than modeling realistic aerial clearance. Aim dots show the airborne trajectory, not reflected bounces. `FetchToy.tsx` renders the toy and throw guide. The existing `PropertyMotion` owns temporary play state; no save schema changes are needed.

The adopted dog's saved retrieval aptitude changes movement speed. Natural retrieval/focus and learned focus determine beginner hesitation/lap behavior (initial thresholds documented in GAME_VISION). This is independent of cartoon body/color. Unlike Pip/June's standalone demo, three temporary returns do not train the saved dog. Return counters reset when a play session starts. All current saved story, dog, routine and original-game data remain intact.

Verification: unit coverage for full-courtyard throws, collision-safe paths, reachable planter-edge targets and independent handling configuration; `scripts/homecoming-fetch-smoke.mjs` exercises actual desktop/phone throws, moving returns, modal pause, toy exit, reload, unchanged saved journey and database isolation. Existing adoption smoke checks shelter, naming, settling and first recall with the shared cartoon characters. Human testing is still needed to judge feel and enjoyment.


## Neighborhood work (October 1)

The front gate now opens a playable request board after settling the founding rescue. Mara's search-and-return job leads to two additional authored requests in the same orchard loop. This supersedes the earlier gate-only invitation endpoint. Existing training and the club invitation remain available; the actual competition is still unimplemented. See [Neighborhood outings](NEIGHBORHOOD_OUTINGS.md) for controls, dog abilities, one-time rewards, saved work records and scope limits.

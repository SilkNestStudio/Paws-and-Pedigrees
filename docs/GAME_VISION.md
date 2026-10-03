# Paws & Pedigrees: product vision and direction

Last updated: October 2, 2026.

## October 1, 2026: approved full redesign (supersedes the implementation direction below)

The owner approved a complete redesign plan and a fresh rebuild. Only the story is fixed: Grandpa leaves the player his former championship kennel, the founding dog is a shelter rescue, and breeding future generations is the long-term heart of the game. Everything about how the game plays is open. Sections after this one record earlier direction and prototype history; where they conflict with this section, this section wins.

### Why the earlier prototypes failed (keep in mind)

- The player's input was usually "select a target, then watch the dog". The owner's quality bar: **player skill (timing, positioning, reading the dog, decisions) must visibly change outcomes.** Click-and-wait interactions, more menus, new palettes and more explanatory text do not meet it.
- Dogs had no readable mind: behaviour was scripted paths plus one ability number per sport.
- Dogs looked identical (coat colour was tied to body build), and the original colour genetics were not locus-based.
- Work was breadth-first: each round of feedback produced a new isolated prototype that was never iterated until it was fun.

### Repository approach (approved)

- `prototype-archive` branch (on GitHub): frozen snapshot of everything before the rebuild, including the Homecoming and play-yard work. Retrieve any old file with `git show prototype-archive:<path>`.
- `rebuild` branch: the new game, built as a fresh setup. Old code may be copied in only where the new design needs it (for example the revision-checked IndexedDB save pattern, the node test runner, throw physics); old code must not decide how the game plays.
- `main`: stays the old game until the owner decides the new one is better.

### Build order (approved): mechanics first, then outward

Do not build start to finish. Each phase must pass a playtest gate with the owner and a few testers before the next begins.

1. **Phase 0, safety and foundation:** archive (done), new project structure, formatter.
2. **Phase 1, the feel:** one property, one dog with a dog "mind", the four handling verbs, retrieve with marks and stop-whistle blinds, one marker-training session, three visually distinct dogs from real coat genetics. **Gate:** testers play 15 minutes and want more, and a skilled player visibly beats an unskilled one. If not, keep iterating Phase 1.
3. **Phase 2, the opening:** the visual inheritance intro, shelter, first days, mentor Mara, aptitude discovery, scent search with wind, keeper skills, the Village Fun Day. **Gate:** a new player can explain the goal within a minute.
4. **Phase 3, the kennel:** day loop, autonomous eating, economy, generated jobs, restorations, a second dog, local trials and titles.
5. **Phase 4, competition:** full agility, herding, regional combined events, rival kennels with real simulated dogs, team basics.
6. **Phase 5, bloodlines:** breeding, whelping, puppy socialisation, evaluation, placement, show ring.
7. **Phase 6, legacy:** aging, retirement and mentoring, the national cup, Hall of Fame.
8. **Phase 7, live:** accounts, cloud saves, premium league, real payments.

### Core design (approved)

- **One handling system for every activity.** The dog is an AI agent with drives (scent, chase, play, company, fatigue), attention split between keeper and surroundings, and learned cues with individual reliability. The keeper has four verbs: **move and position** (body position steers the dog), **cue** (send, recall, stop whistle, left/right/back, leave it, sport cues), **mark and reward** (timed "Yes!" reinforces what the dog just did), and **read** (body-language tells such as ears, head snap and tail flag). Dogs telegraph what they are about to do; no failure is a hidden dice roll.
- **Training is shaping, not a repeat of the event.** The dog offers behaviours from its personality; marking good attempts in time teaches faster, mistimed marks teach the wrong thing. Competitions use the learned cues in real-time handling.
- **Dog model layers:** genes (coat loci plus hidden breeding values), about 11 aptitudes (speed, turning, stamina, power, nose, drive, focus, cooperativeness, confidence, water, soft mouth), per-cue skills, condition, bond, and the keeper's knowledge (aptitude ranges that narrow through observed work). Each aptitude changes a specific behaviour. Rescue dogs come from the same gene pool as bought dogs.
- **Activities with distinct decisions:** retrieve/gundog and scent search first; then tracking, agility (walk the course, plan crosses, real-time handling), herding (flocking sheep, whistles), show ring (structure from genes plus presentation); later dock diving, flyball, disc, rally, carting, lure coursing. Levels add new rules, not bigger numbers. Work jobs use the same verbs and are generated from templates.
- **Competition circuit:** weekly local specialist trials, a combined regional at each season's end, and a yearly national championship (Grandpa's cup, name open) with an individual all-rounder title and a kennel team title (3–4 dogs, at most 2 rounds each, relay final). Titles Novice → Open → Excellent → Champion. Rival kennels own real dogs run through the same simulation. The opening loss is an unranked Village Fun Day: the dog genuinely shines in one round and a rival kennel wins overall.
- **Kennel:** the property is the menu. Visible restoration (field, pond, pasture, whelping room) opens new verbs and activities. Grandpa's ledger is the quest log, pedigree book and in-world teaching in his voice. Keeper skills: Handling, Training, Reading, Husbandry, Breeding. One tuning file holds all balance numbers.
- **Genetics:** real coat loci (E, K, A, B, D, M, S, T, plus length, furnishings and curl) with correct gene interactions and a stable per-dog marking layout. Aptitudes and temperament use a polygenic model (mid-parent value plus Mendelian sampling, scaled by heritability). Inbreeding uses Wright's coefficient. Trained skills, titles and bond are never inherited. Merle × merle pairings are flagged.

### Owner decisions confirmed October 1

- **Time:** game days advance only when the player plays; a day is one short session (about 15–25 minutes) ending when the keeper goes to bed. **Dogs age by season, not by day:** 7 days make a season, and every dog ages 3 months at the season change, with a season recap. Each season ends with its big event. A "quiet week" option skips several days. Starting pace: about 4 months of dog life per real hour; first litter possible after about 6–8 hours of play. All numbers live in one tuning file and are adjustable.
- **No dog deaths.** The game will reach a broad audience. Grandpa's passing stays as backstory only. Old dogs retire (around age 10) to the house or a retirement meadow outside kennel capacity and mentor puppies (a training bonus in their specialty). A retiree may go to live with a family or story character, who sends postcards. Founders remain in the Hall of Fame, trophies, family tree and ledger. This replaces earlier mortality direction.
- **Built for in-game purchases from the start, without real payments yet.** Every reward is tagged earned or purchased; every dog records whether purchased advantages ever touched it (inheritance of that record is an open rule) so a free league and a premium league stay fair. Store catalog is data-driven with an entitlement list; development purchases are free test buttons. Candidate products: cosmetics, activity packs, premium dogs with disclosed abilities (premium league only). Real payments wait for accounts and a trusted server.
- **Keep costs low.** Blender, local IndexedDB saves and Vercel's free plan during testing. Vercel's free (Hobby) plan does not allow commercial use, so Pro (about $20/month) will be needed once the game earns money. Claude builds the dog and environment art with Blender scripts for now; a hired artist may replace the base dog model later without changing the game underneath.
- **Implementation status (October 1):** Phase 0 is complete (archive branch pushed, fresh project on the `rebuild` branch). Phase 1's first playable is built and awaiting the owner's playtest: three genetically distinct rescues, free play, seven retrieve set-ups with steadiness, stop whistle, casts, wind-borne scent and hunting, four marker-training lessons whose skills carry into the field, and explanatory result cards. Simulation tests confirm that training and handling skill change results. The dog model is a code-built stand-in until the Blender base dog is made. This is not proof the gate has passed; only playtesting can show that.
- **Owner feedback on the Phase 1 field test (October 1):** better than the old game but not enough to judge: a single activity done a couple of times a day can't show whether the game is worth playing. Specific problems: no idea what to do, everything was retrieving, couldn't see where things were thrown, the dog didn't go where clicked, graphics poor. **Approved change of plan:** build a shallow but complete "first week" covering the story opening, the shelter, home care, a second activity (scent search), jobs, money, a restoration, guidance from Mara, and the Village Fun Day, so the whole loop can be judged. Implemented: see [The first week](FIRST_WEEK.md). Fixes for each complaint: an objective tracker, goal arrow and how-to-play cards; scent search and care alongside retrieving; the camera follows throws and a flag marks each fall; the dog goes where you click, with an aim line. Blender-built characters (a rigged dog shaped by its genes and painted by the genetic coat shader, and dressed people with handler animations) replaced the code-built figures; source scripts are in `tools/blender/`. Awaiting the owner's playtest of the first week.
- **Owner feedback on the first week (October 2):** the owner likes the direction, especially goals that unlock new training options and driving the van to places to do things. Complaints: the view was hard to work with (the camera lagged behind the character's turns), the field is bigger than the view so it was hard to see where items were thrown or where the search circle was without the map, a recurring slow-button warning (INP of about 490 ms), and the graphics. **Changes made:** W walks forward, S backs up, A/D turn the keeper, and the camera stays locked behind them; standing still turns the keeper toward what matters; the field camera rises and pulls back to fit the keeper and the farthest target; beams, distance labels and edge arrows mark falls, blinds, the search area and a distant dog; the map is shown by default and can be tapped to send or search. Place changes run behind a short travel fade with grounds cached, and the full-week browser test records no interaction slower than 200 ms. Blender-made buildings, trees, hedges, fences and yard items replaced the code-built boxes at home, the orchard, the green and the rescue. Awaiting the owner's playtest of these changes. The proposed next step (Step 2, "the kennel grows": water work, a second dog, seasons and aging, a new discipline, trials and titles, more van destinations) is a proposal awaiting approval.
- **Visual inheritance intro is kept.** Recommended form: a short illustrated letter from Grandpa (existing illustrations reusable at first), then the arrival played in 3D — through the gate at dusk, into the trophy room with his photos and ledger, past the empty runs — with kennel naming at the gate sign. Built in Phase 2, after the core mechanics are proven.

## Read this first

This is the main product reference for future development. It records the owner's direction, including the September 29 discussion about playable activities, meaningful dog abilities, and team events. Read it before proposing gameplay milestones or implementing progression changes.

This describes the intended game, not a list of delivered features. Older milestone documents explain how particular prototypes were built; their delivery order and gameplay assumptions may have been superseded. The owner's latest instructions take precedence over this document.

Decision labels used below:

- **Agreed direction:** the owner has explicitly requested or endorsed this outcome.
- **Expansion backlog:** activities the owner wants available for future development; not all belong in the next release.
- **Proposed design:** a way to realize the direction, still subject to iteration and playtesting.
- **Open decision:** not yet settled. Do not silently turn it into a requirement.

## 1. What the app should become

**Agreed direction:** an accessible 3D dog companionship, training, competition, working-dog, and breeding game in which the player builds a respected kennel from one founding rescue.

**Core identity clarified by the owner:** the project originated as a breeding game. Breeding and building generations must be a major pillar of the redesigned game, planned into its foundation even if players unlock breeding later. Active companionship, training, and competition should support this identity, not displace it.

The player is the human keeper/handler. Dogs are individual companions with discoverable strengths, learned abilities, personalities, and lives that develop over time. They are also the foundation of a kennel that can earn recognition through individual performance, useful work, and team achievements.

The desired experience combines:

- The attachment of caring for a particular dog and learning what makes it special.
- The satisfaction of actively playing varied activities and observing improvement.
- Decisions about preparing for events, strengthening weaknesses, and choosing work.
- The management of facilities, resources, a growing roster, and eventually litters.
- The long-term story of founding dogs, successors, retirement, and kennel legacy.

The owner wants a polished, commercially viable game that could eventually reach a very large audience. Technical tests passing, a nicer interface, or additional menus do not establish that the game is engaging or ready for that audience.

## 2. The problem the next work must solve

**Owner feedback:** even the owner does not consistently know what to do. A new tester asked what the point was roughly 45 seconds after starting. The available systems feel disconnected, and too little of the game offers meaningful active play.

Immediate priorities are more varied playable activities, consequential abilities and training, and onboarding that makes the purpose understandable. Breeding remains central to the eventual game but should enter later in the player's journey.

Do not respond to this feedback only by polishing labels, moving buttons, adding paragraphs of instructions, or introducing more numerical meters. Those improvements may help, but they do not supply the missing gameplay.

The owner gave agility, search, swimming, show events, Shepherds, and Collies as examples. They did not approve those examples as an exclusive discipline list or a fixed three-discipline milestone. A proposed 'first season' was unclear; a calendar-based season is not a requirement.

## 3. The connected play loop

**Latest owner-supplied story proposal:** inherit a former champion kennel, introduce its history before adopting the founding rescue, discover promise despite an early overall competition loss, earn through odd jobs, develop both keeper and dogs, restore useful facilities, expand the roster, breed and raise distinct litters, retain or sell puppies according to capacity, and pursue the predecessor's championship legacy with a new kennel name and team. The owner explicitly presents this as an editable idea, not a fixed script. Detailed and plausible coat inheritance is a major design requirement. See [Kennel legacy story proposal](LEGACY_STORY_PROPOSAL.md) for the full sequence, recommendations, research references, and unresolved choices. The owner subsequently authorized starting the new playable experience; unsettled story and balance details remain open.

**Confirmed follow-up:** the former keeper is Grandpa, who leaves the player the kennel when he passes away. Preserve intended player progression: do not introduce breeding or other later gameplay prematurely for testing. The owner wants admin controls to change levels, stats, and related state so later stages can be tested before release. Test access is separate from normal gameplay unlocks; specific controls and scenarios are still to be designed.

**Proposed design supporting the agreed direction:**

1. Understand the current ambition: a useful assignment, a new skill, an event, or a kennel improvement.
2. Check the relevant dog's condition, strengths, and readiness.
3. Choose care, practice, or an activity that contributes to that ambition.
4. Play it with understandable controls and meaningful decisions.
5. See the result: what the dog did well, what held it back, and what changed.
6. Decide whether to practice a weakness, capitalize on a strength, enter an event, or invest in the kennel.

The home environment should make the next opportunity visible while leaving the player free to choose. A visit should offer an enjoyable action and a useful outcome. Repeated sessions should change what the player and dog can accomplish.

Care, training, activities, competitions, work, upgrades, and breeding must feed into this loop rather than exist as isolated menus.

## 4. Dogs, discovery, and meaningful ability

**Agreed direction:** begin with a dog from the pound. Rescue remains part of the game's identity throughout kennel growth. The first dog is the founding companion and can become the face of the kennel's brand.

Rescue dogs have hidden potential that becomes understood through bonding, training, and actual activities. Purchased dogs may offer more information upfront. Rescue origin should not impose inferior inherited potential.

Keep these concepts distinct:

- **Natural aptitude:** individual tendencies, informed by breed and inheritance.
- **Learned ability:** technique, commands, experience, and conditioning developed through play.
- **Bond:** the partnership between keeper and dog.
- **Current condition:** needs, energy, health, age, and recovery.
- **Discovery:** how much the player knows about that dog's abilities.

Discovery must reveal something that changes or explains performance. A scent-oriented dog might detect a trail sooner or distinguish competing scents more clearly; an agile dog might corner more effectively. Finding out about an ability should not merely unlock a paragraph or create an arbitrary ability that the dog could not previously use.

The owner wants aptitude to affect both performance and learning: a dog naturally strong in searching should perform search tasks better and benefit more from appropriate search training. It should still be possible to improve weaker areas through effort.

Breed tendencies must allow individual variation, exceptional rescues, and useful mixed breeds. Proposed examples such as Shepherd/search and Collie/agility are starting game-design ideas, not universal biological rankings. Validate breed-specific claims before presenting them as realism.

Exact numerical profiles, learning rates, ceilings, and inheritance mappings remain open. Avoid a universal best breed or a system where every dog becomes mechanically identical. Keep player decisions consequential; do not replace control with unexplained random failure.

## 5. Activity expansion backlog

**Agreed direction:** develop a broader range of actively playable activities. The owner endorsed the diversity below and wants these available as expansion directions. Order, final mechanics, and base-game versus paid access are open decisions.

| Activity | Proposed player decisions | Abilities that could matter | Possible role |
| --- | --- | --- | --- |
| Agility | Plan approaches, direct the dog through obstacles, manage rhythm and faults. | Acceleration, balance, turning, obstacle technique, attention. | Practice, specialist trials, combined events. |
| Herding | Position the handler and dog to move animals through gates or into pens. | Instinct, restraint, responsiveness, positioning. | Farm jobs, precision challenges, trials. |
| Search and rescue | Choose search areas, interpret clues and indications, locate a missing person. | Scent ability, confidence, stamina, cooperation. | Useful assignments, exercises, scored events. |
| Tracking | Follow a particular trail through intersections and distracting scents. | Scent discrimination, sustained concentration, trail experience. | Investigation tasks and specialist challenges. |
| Retrieving | Remember multiple landing positions, select targets, send and recall the dog. | Memory, steadiness, carrying skill, recall. | Field work, practice, accuracy events. |
| Swimming / water retrieval | Choose routes and targets, balance distance and effort, complete a return. | Water confidence, swimming efficiency, stamina, retrieval technique. | Water work and combined or specialist events. |
| Dock diving | Prepare an approach and coordinate release, jump, and toy placement. | Acceleration, jumping power, confidence, timing. | Short distance or precision challenges. |
| Flyball | Complete hurdle-and-retrieve runs; later coordinate relay participants. | Speed, turning, retrieving, relay teamwork. | Individual practice and kennel team events. |
| Disc catching | Place throws, anticipate movement, connect catches into a routine. | Acceleration, aerial control, anticipation, coordination. | Casual play, precision and routine events. |
| Rally obedience | Direct turns, stops, stays, and position changes around a sequence of stations. | Attention, responsiveness, learned commands, composure. | Training and precision trials. |
| Trick routines | Teach components, compose a sequence, and perform it. | Memory, coordination, engagement, consistency. | Bonding, community demonstrations, competitions. |
| Lure coursing | Manage pacing and anticipation through a moving-lure course. | Speed, turning, stamina, pursuit focus. | Racing careers and endurance challenges. |
| Carting / sled work | Choose routes, manage effort and loads, eventually coordinate dogs. | Strength, endurance, cooperation, team compatibility. | Deliveries, working careers, team events. |
| Showmanship / show events | Prepare the dog, present movement and positions, handle distractions. | Composure, conditioning, learned presentation, handling partnership. | Show careers and selected combined events. |

Obedience and recall can also support other disciplines rather than only constitute a separate minigame. The existing fetch activity can support companionship and retrieving development.

Hunting/field activities and best-in-show were part of the owner's earlier vision. Retrieving, tracking, search, and showmanship explore parts of that interest; the specific hunting game and show rules are not yet defined.

Select activities for different decisions and experiences. Search and tracking need a deliberate distinction; dock diving and water retrieval should not be the same minigame with different names. Avoid recreating several unrelated activities as the same timing bar or bouncing emoji.

## 6. Competitions, working careers, and teams

**Agreed direction:** support more than one route to success. Real-world competition rules are inspiration, not a constraint on the game's design.

- **Specialist events:** pursue excellence in one discipline and earn useful rewards through a dog's strengths.
- **Combined individual events:** one dog completes multiple disciplines. Higher-level regional and national competitions should test broader preparation and more demanding tasks, not merely reskin agility or raise opponent numbers.
- **Kennel team events:** assign different dogs to suitable rounds or coordinated roles. The owner explicitly endorsed this idea. Multiple dogs should become a useful roster with complementary strengths.
- **Working tasks:** use trained abilities in assignments such as recovering a lost item, farm assistance, deliveries, rescue exercises, or community demonstrations. This provides purpose before or alongside championship success.

An individual all-round title and a kennel team title recognize different accomplishments. Team success should not erase the value of developing a versatile individual; individual events should not erase the reason to keep specialists.

Proposed combined-event scoring: present understandable round results and overall standings, with comparable score scales across disciplines. Strong search performance can help an overall result while weak agility still meaningfully costs points. Possible higher-tier minimums per round need balancing, not automatic adoption.

Team design questions include roster size, whether one dog may enter multiple rounds, substitutions, cumulative fatigue, and relay coordination. Early versions can use a player's own kennel against simulated opponents; live multiplayer is not required to prove the concept.

Opponent abilities should eventually be coherent with their dogs and preparation. Breed names attached to unrelated random scores will not demonstrate the intended system.

## 7. Onboarding and ongoing direction

**Agreed direction:** onboarding must explain the point of the game and teach through actual play. A few paragraphs or a list of rooms is insufficient.

The intended ambition should be understandable in the opening minute: give a rescue a home, discover and develop its abilities, succeed in activities and events, and build a kennel with a future.

Proposed onboarding principles:

- Introduce an enjoyable small activity early, with a result the player can understand.
- Teach prerequisites in the order the player encounters them: obtain food before asking them to feed the dog.
- Connect care to the activity it prepares the dog for.
- Reveal the first ability through observed performance.
- Lead into an accessible event or assignment, explain its outcome, and recommend a useful next action.
- Introduce later systems when they answer a real need; do not overwhelm adoption with breeding management.
- Make incomplete lessons resumable. Keep exits and routes back visible on desktop and mobile.
- Do not award daily login rewards before the player has completed the introductory journey.
- Keep starting resources modest enough that immediate facility upgrades cannot skip the intended beginning.

Observe actual new players. A passing scripted tutorial does not prove that someone understands the purpose, can choose a next action, or wants another session.

## 8. Keeper, facilities, economy, and pacing

**Agreed direction:** consistent play should build a kennel over time. The game should involve bonding, feeding, training, and care, with active play beyond waiting for timers.

Keeper progression must improve the ability to develop dogs. Proposed benefits include better training yield, aptitude assessment, advanced exercises, more precise commands, and managing a larger roster. The relationship between keeper level and the existing separate training-skill stat must be made clear and coherent.

Facility upgrades should open gameplay: a training space, nursery, working equipment, new practice conditions, team preparation, or the capacity to care for additional dogs. A higher number or cosmetic room change alone is insufficient. Visual upgrades should reflect the facility's actual capabilities.

The physical kennel and yard are the preferred home/navigation experience. Walk to relevant places, then use readable panels when needed. Keep kennel naming, emblems, pantry stock, selected-dog needs, and clear return controls. Existing portraits remain useful for records and icons; 3D dogs and environments need progressive visual improvement.

Care should support attachment and preparation. Design the session budget so maintenance does not consume all the time and energy available for enjoyable play. Exact costs, regeneration, training yields, unlock requirements, and calendar rates require a shared balance model.

## 9. Breeding, puppy development, aging, and legacy

**Agreed direction:** breeding is a central long-term system introduced later in the player's journey, including crossbreeds, inherited differences, and litters of distinct puppies. Its later introduction does not make it a secondary design priority. A dog need not become a national champion to breed. Extensive development and high-level participation provide a fuller understanding of its potential before a player chooses a pairing.

Pairings should serve goals: complementary team roles, stronger abilities, steadier temperaments, or a desired combination of characteristics. Earlier breeding means making decisions with less evidence; it should not mean arbitrarily worthless puppies.

Keep inherited potential separate from trained stats, earned titles, and keeper knowledge. Current design direction is that accomplished parents improve the prospects and information available, not that every puppy is automatically a champion. Tools to improve breeding prediction or influence outcomes are an interest from earlier discussion; their mechanics and monetization remain open.

Litter size, nursery space, caring for puppies, retaining or responsibly rehoming them, and capacity growth all need to work together. Breeding should not become an uncontrolled stream of interchangeable inventory.

Dogs mature, have competitive careers, gradually age, and retire. The owner wants mortality and kennel legacy to matter. The precise time scale and presentation are unresolved. Earlier documents' proposed multi-week puppy periods and multi-month careers are balancing ideas, not approved final numbers.

The owner also requested consequences for prolonged lack of care, including skill loss and veterinary clearance before activity resumes. Existing capped absence/recovery rules are a foundation, not final lifetime balance. Protected absence/caretaker options are proposed ways to make a regular schedule practical. Avoid irreversible save damage from a routine break or making payment necessary for recovery.

Retired founding dogs should remain meaningful in the kennel's history. Memorials, descendants, records, and retained identity can carry their story forward.

## 10. Free play, premium competition, and possible paid expansions

**Agreed direction:** the game should eventually generate income. The owner is open to real-money assistance/upgrades, rare dogs with disclosed abilities, and possibly paid access to additional activity content. Specific products and prices have not been chosen.

Fairness requirement: free players must not be forced to compete against purchased high-level advantages in their earned-only competition. Paid competitive advantages belong in a premium/open category; free players may eventually qualify for and enter that category through play.

Possible activity packs are an expansion option, not a decision to put any particular discipline behind payment. Preserve a worthwhile free core and a coherent progression path. Paid-only requirements must not quietly block completion of a supposedly free championship or undermine fair team competition.

Open policy decisions include whether buying content access alone changes eligibility, how mixed teams are classified, which advantages follow offspring, and how cosmetics differ from progression purchases. Earlier proposals favored tracking advantages through lineage and transfers; the exact policy needs explicit design before implementation.

Local saves are suitable for the current prototype, not authoritative proof of competitive results, purchased ownership, or paid advantage. Real payments and shared competitive economies require secure accounts, validated results and transactions, entitlements, recovery, and a trusted backend first.

## 11. Platform and implementation boundaries

**Agreed direction:** continue with the browser-accessible React/TypeScript/React Three Fiber game and test on desktop and phone. Use IndexedDB/local storage until investment in hosted persistence is justified; keep migration to cloud practical without rewriting the game.

Preserve separation between activity simulation, dog development, progression/rewards, UI, and storage. New activity state and ability schemas need defaults and migration for existing saves. Route effects through shared gameplay rules rather than duplicating rewards or breed calculations in each minigame.

Reusing environments, dog rigs, care, and data is desirable when it improves delivery. Existing implementation is not a product constraint: replace mechanics that do not serve the experience. An engine switch is not an agreed requirement.

Maintain readable controls, pause/resume, visible exits, sensible cancellation, accessible alternatives where practical, and useful results on both desktop and mobile. Profile real target devices as content grows.

## 12. Current implementation versus intended destination

Snapshot updated for the September 30 handler-command and separate-training implementation.

- Preserved foundations: IndexedDB saves, rescue adoption, dog records and genetics, care/bonding, a 3D kennel and handler yard, fetch/obedience activities, agility, shop, breeding/nursery rules, older competition activities, and return navigation.
- New playable slice: four Field Club disciplines (agility, scent search, herding, water retrieval), per-dog experience and discovery, aptitude/composition effects on performance and learning, keeper coaching, specialist events, four-round individual trials, and four-round team trials with at least two owned dogs. Opponents are explicitly simulated local club rivals.
- New-player direction: adoption leads to a visible club invitation and a choice of qualified events. Separate training exercises develop ability toward locked events. The first finished club event opens membership and wider kennel options; completing events in all four disciplines opens the combined trial. Care is available in the club before events. New players receive daily rewards only on a later day after finishing their introduction. Old saves and the older first-ribbon record remain compatible.
- Partial: breed sport profiles are prototype balancing values, not biological rankings; visual environments and animations are early assets. The agility course is reused. Team events allocate dogs to sequential rounds rather than simultaneous multiplayer or relays.
- Future work: higher-tier combined championships, meaningful working assignments, more activity families, advanced training exercises, facility-specific activity unlocks, coherent lifetime/economy balancing, discipline inheritance beyond existing breed composition/base stats, authoritative online competition, payments, and activity-pack entitlements.

Do not present the full expansion backlog as delivered. See [Field Club implementation and tester guide](FIELD_CLUB.md) for mechanics, validation, and limitations.

## 13. Current milestone and unresolved choices

The owner clarified the previously unfinished request and authorized creating the initial 3-4 disciplines as a functional tester game demonstrating the larger concept. The selected first slice is **agility, scent search, herding, and water retrieval**, chosen for different decisions. This selection does not exclude other activities from section 5.

The first outcome is finishing an eligible club event with the founding rescue. Training is separate from competition, not a mandatory rehearsal of the same course. Completing club events in all four disciplines leads to the combined trial. Every sport contributes equally; a team trial demonstrates why complementary dogs matter. Starter event grants are paid once per event category; replaying develops skills and records. This is a local testing economy, not a completed long-term financial model.

Later work must settle championship composition and qualification, richer team roles, activity/facility progression, life pacing, breed/inheritance balancing, and paid-content boundaries. Observe unfamiliar testers before expanding the discipline list: they should understand what to do, what the dog learned, and why another dog could help.

## September 30: confirmed controls and training direction

- **Agreed:** the player gives handler commands; dogs execute using their abilities. Water sends should show swimming speed and retrieval competence, including a correctable empty return. Agility cues select an obstacle and the dog performs it.
- **Agreed:** search needs a closer view. Strong scent dogs detect across a box; inexperienced dogs need directions to additional sides. Extra guidance should allow completion of an eligible activity.
- **Agreed:** training requirements should actually block harder events. Players choose events their dog qualifies for and develop toward others.
- **Agreed:** training must not be the same task repeated as an event. Shorter copies of competitive courses do not satisfy this request. Training should teach underlying skills through separate exercises.
- **Implemented preview:** handler cues for all four events; search side investigations and a close camera; autonomous agility approaches, herding pressure and water pickups/returns; observable speed, detection, turning, stamina and handling differences; reports of actual execution and continuous time scoring.
- **Implemented preview:** separate ground-pad footwork, dry-land conditioning, and focus/steadiness exercises around a distraction. Search and herding currently share the stay exercise with discipline-specific progression. This is not a complete training curriculum.
- **Implemented preview:** standard event working-ability requirement 35; advanced five-object search and four-dummy cross-current retrieval require 120 discipline XP and ability 55. Those are two harder events in existing sports, not two new disciplines. Requirements and learning rates are initial balancing choices, not owner-approved final numbers.
- Older scores remain readable as earlier records. New event records use revised scoring; training does not overwrite competitive bests. Existing saves are preserved.

## Latest September 30 direction: prove that an activity is fun

The owner found the initial handler-command activities rudimentary: selecting a target, waiting and repeating remained the main interaction. Dog-dependent speed alone did not solve that problem.

**Approved immediate scope:** redesign search as a small woodland investigation, then test whether players want another attempt. The owner accepted the search-first recommendation. Richer flock herding, drifting water recoveries and continuous agility runs were brainstormed; they are not part of this search implementation.

**Implemented search revision:** a missing ranger/photographer/surveyor bag, three seeded case identities, route forks with matching clothing/bootprint evidence versus animal traces, local scent ribbons, careful/brisk pacing, limited scent refreshes, recoverable rabbit distractions, and ground exploration across broken scent trails. The handler follows the dog through the woodland. Three discoveries finish a normal case; the advanced expedition has five. No failure countdown: elapsed time still affects efficiency scoring. Dog ability changes detection reach, inspection time, susceptibility to rushing distractions and support needed at scent gaps. Training stays separate.

New search records distinguish woodland cases from older box-search bests. Saved club visits/results, qualification, combined/team rounds and IndexedDB remain integrated. This is an authored branching investigation with seeded variations, not an open-world procedural mystery system. It needs human playtesting; automated completion is not proof of enjoyment. See [woodland search](WOODLAND_SEARCH.md).

## Yard access to training

The owner requested replacing the yard's Agility entry with **Training**, opening a menu instead of immediately starting an agility session. The physical marker and matching yard action now open a four-discipline training menu. It uses the same exercises, qualification development and saved records as the Field Club, with access to other existing training plans. Exercises return to the training menu, which has an explicit return to the yard. An unfinished club event is preserved and offers a route back to the club instead of being overwritten.

## Latest owner direction: rethink the whole experience

The owner says the current game still feels like an old-school computer game they would not want to play. The existing prototype is a reference for the idea, not a requirement for the new game's appearance, behavior, controls, or progression. Further incremental improvements to menus and individual minigames do not by themselves address this feedback.

**Confirmed direction:** reconsider the overall playable experience before expanding the current implementation. Preserve the rescue-first human keeper premise and long-term dog development/kennel vision; reassess how players actually experience them. Earlier Field Club and search milestones document delivered experiments, not an approved final product structure.

**Proposal, not yet approved:** define a cohesive companion-and-kennel experience and prove it in a separate, small playable prototype, with deliberate movement/camera design, expressive dog behavior, active training distinct from an event, and one useful visible kennel improvement. Camera, control scheme, art direction, exact activity, and prototype scope still need agreement. No wholesale rewrite, engine migration, or save reset has been approved by this discussion.

**Follow-up clarification:** the owner prefers retaining this repository and its existing access/deployment setup, including if the eventual implementation is a complete rebuild. A separate prototype does not require a separate repository. The owner explicitly wants to discuss more points before implementation starts; remain in design discussion until that instruction changes. Breeding is fundamental to that discussion and must shape the proposed progression and dog systems from the outset.

**Latest authorization superseding the discussion pause:** the owner says this is a good point to start building and fine-tuning gameplay, and explicitly chose a closer follow camera with keyboard movement and phone controls. The initial Homecoming preview is implemented at `/?preview=legacy`, linked from the existing kennel. It offers a new walkable courtyard, Grandpa's ledger, preparation of one run, kennel naming, and an introduction to the future nursery/training spaces. The normal preview begins without a dog and ends before adoption. Separate test controls add a temporary companion and restored finishes. This is an environment/control prototype with existing character models, not the finished art direction, a playable rescue visit, new breeding implementation, or the full admin editor. Preview state lasts only for the visit and never mounts the existing persisted game store. See [Homecoming preview](HOMECOMING_PREVIEW.md).

**Owner feedback and next refinement:** the owner prefers the close view over the overhead view, but destinations such as the front gate need stronger signage/direction or view orientation. The owner also requests professionally presented people and dogs rather than boxy placeholder figures. Preserve the close camera while improving wayfinding and character quality. Implemented locally: front-gate architecture and courtyard signs, a destination/distance/bearing indicator with Face destination, full camera rotation with building clearance, and new original Blender keeper plus athletic/stocky dog assets for the preview. These replace the preview's old figures, with smoother connected forms, facial/clothing details, articulated rigs and animation; they do not establish final approved art, realistic coat inheritance, or breed-specific models. Existing game saves and earlier scenes are unchanged by the asset replacement.

**Latest authorization and playable continuation (September 30):** the owner requests a shelter, choosing/naming the founding dog, and continued development with periodic meaningful testing check-ins rather than approval for every implementation step. Build connected playable sections; ask when a substantial design decision is unresolved. Implemented in the same Homecoming route: 3D shelter with three mixed-breed rescues, distinct greeting responses and observations, candidate-specific meeting prerequisite, name validation and adoption, return with the chosen dog, settling at the prepared run, and a physical first recall with a one-time bond gain. Hidden fictional aptitude profiles are preserved for future performance systems, not yet wired into new competitions or genetics. The first adoption is covered; ongoing money/food economy remains pending. Homecoming now saves story/name/dog/progress in a separate versioned IndexedDB repository with revision-conflict checks. This supersedes earlier statements that the preview ends at the gate or lasts only for the visit. Original game saves remain separate. Existing test toggles are not a full admin editor. See [Homecoming implementation notes](HOMECOMING_PREVIEW.md).

**Confirmed visual direction and next step:** the owner wants the rebuilt game eventually to have polished, cartoony graphics rather than the current visibly basic 3D assets. This is not a request to complete the art overhaul immediately. Preserve the gameplay/save architecture while planning a coherent stylized character/environment/material/lighting/animation pass. Current meshes are replaceable prototypes, not approved final art. The owner tested shelter/adoption and authorized proceeding.

**Care and foundation training continuation:** implemented meals, water and quiet rest at the run, a persistent condition/supply display, four starter meals and a rescue emergency ration when empty. This is the beginning of the care loop, not the final economy or real-time lifecycle. No offline neglect/aging is applied by this slice. The dog walks to the run and finishes a short care action before the resource/state change commits. No repeat-care bond farming. A separate 3D focus-walk lesson lets the keeper choose a route and pace through five markers, handle scent distractions and praise close following. Natural focus, learned focus and keeper experience affect distraction sensitivity and following speed. Completed lessons award quality-dependent focus/keeper experience and use condition; cancellation gives no reward/cost. A newcomers' meet invitation follows the first completion, but the actual event remains unimplemented. Version-one Homecoming saves migrate to version two without losing the adopted dog or completed introduction.

**October 1 correction from the owner:** the Homecoming rebuild still feels like the same game with a new camera: the palette, repeated clicking and underlying play were not different enough. Do not treat the added care/lesson/intro systems as proof the redesign succeeded. Stop expanding that loop until a different interaction is worth playing. The owner authorized rebuilding the yard as a demonstration of the proposed direction.

**Implemented separate play yard:** `/?preview=yard`, with a prominent link from Homecoming. This uses a new pastel garden, original code-built cartoon dog/keeper, continuous keeper movement, free ground aiming and hold/release throws, bouncing/rolling toy physics, obstacle-aware retrieval, optional moving target, camera orbit/wide view and desktop/phone controls. Pip can take a playful victory lap; June hesitates on long throws and responds to encouragement. Three returns reduce that behavior within the temporary demo session. Those are illustrative personalities, not the finalized aptitude or training rules. No adoption, care, breeding, economy, save migration or real kennel rewards are coupled to this experiment. It never opens a database. The owner must judge whether this is a more enjoyable direction; automated retrieval tests and brighter art do not establish that it is.

## 14. Evidence that the next milestone is working

**Confirmed opening-story addition (September 30):** the owner wants the beginning to explain more of Grandpa's story, with pictures of him and of the kennel in its successful years while explaining that he left it to the player. Implemented in the Homecoming preview: a player-paced, three-part illustrated prologue covering Grandpa and his dogs, the kennel's championship/breeding history, and the inheritance with modest starting resources and a rescue-first future. Original generated illustrations accompany HTML text, Back/Continue/Skip controls and journal replay. The final page points to the ledger. Replay does not reset preview progress. This adds narrative presentation, not economy grants or newly playable later systems; preview isolation and intended breeding progression remain intact. See [story artwork and prompts](../art/story/homecoming/README.md).

- A new player can explain the goal and identify a useful next action without the developer coaching them.
- Activities involve different decisions, not just different graphics.
- Differences between dogs are observable during play and understandable in results.
- Training improves something the player can demonstrate in the same activity.
- Combined results reveal meaningful strengths and weaknesses; team selection creates a reason to develop multiple dogs.
- Progression rewards open useful options, and the player understands what an upgrade or keeper level will enable.
- The core free journey stands on its own and does not depend on purchases.
- New and existing saves, cancellation, return navigation, desktop controls, and touch controls work.
- Human playtests establish whether the experience is enjoyable; automated checks establish specific correctness properties.

## Related references

- [Implementation roadmap](IMPLEMENTATION_ROADMAP.md): historical sequence and delivered foundation; use this vision for current product priorities.
- [Product quality](PRODUCT_QUALITY.md): presentation, usability, and release standards.
- [Local storage](LOCAL_STORAGE.md): current persistence and cloud boundary.
- [Kennel interior](KENNEL_INTERIOR.md), [handler yard](HANDLER_YARD.md), and [open yard flow](OPEN_YARD_FLOW.md): existing spatial interaction.
- [Playable first day](APPRENTICESHIP.md) and [playable tutorial](PLAYABLE_TUTORIAL.md): current onboarding implementation history.

Update this document when the owner makes a product decision. Record what changed, distinguish proposals from commitments, and keep the implementation snapshot honest.


## October 1: combine the characters and Homecoming yard

**Confirmed owner clarification:** use the newest play-yard characters in the Homecoming environment. The dissatisfaction centers on game feel and mechanics more than appearance. Preserve the inherited property as the connected setting instead of treating another palette/environment change as the solution.

**Implemented locally:** the shared Homecoming character renderer now uses the cartoon keeper and athletic/stocky dog variants across courtyard, shelter and focus walk. Existing adoption identity, collar, name and progress remain. Homecoming offers optional **Play fetch** in the actual courtyard, with hold/aim/release throws, continuous movement while retrieving, obstacle-safe ball bounces and paths, return to the moving keeper, and recall encouragement. Putting the toy away restores exploration; care and travel clear free play. Objective/direction cards hide during fetch so they do not cover the play space. No new forced tutorial, daily task or separate score screen was added.

The shared fetch simulation now takes an environment adapter. Courtyard collision/path rules replace the small garden bounds, and there is no invisible moving-target reward here. Saved retrieval aptitude controls speed (initial rule: 3.6 + aptitude / 40 meters per second). Below 70 retrieval aptitude, a long throw can cause a short hesitation; below 60 natural focus, the dog can take a brief playful lap. Existing learned focus of 20 removes these beginner behaviors. These are provisional game rules, not biological claims or a final ability model. Every dog can finish; encouragement helps. Homecoming does not inherit the standalone demo's automatic three-return familiarity unlock. Fetch returns do not award or persist training, bond, money or condition changes yet.

The isolated garden remains available as an experiment. Future work should improve the connected Homecoming interaction, training and purpose in response to actual playtesting. This combination is not proof the overall gameplay problem is solved.


## October 1: a complete neighborhood outing to judge the game

**Owner feedback:** after days of prototypes, the owner still finds the game subpar and wants enough actual gameplay to judge whether to continue. They authorized more development. A complete search-and-return outing is the current implementation choice, not a claim that the game's direction has now been validated.

**Implemented locally in Homecoming:** a request board at the front gate, available once the founding rescue is settled, leads to the orchard loop. Mara asks for a missing satchel. The keeper walks continuously, chooses a path and creek crossing, can direct nearby searches, adjusts careful/jogging pace, reads the dog's local scent indication, handles rabbit distractions, finds two clues and the item, asks the dog to retrieve it, and physically returns to the neighbor. There is no countdown or forced failure. The trail map labels landmarks and crossings without exposing hidden items. Pause/exit is available throughout.

Scent aptitude changes detection distance; careful pace preserves detection while jogging reduces it. Learned focus helps scent work and resisting distractions. Earned search experience increases detection distance on later outings; keeper experience reduces inspection time. These are tunable fictional game rules. Actual dog behavior and local gold scent motes show the differences. Findings happen through exploration/proximity and dog work, not repeated clicks on stationary clue buttons.

The first completed request grants two pantry meals, eight keeper experience, ten search experience and four bond, while using fifteen energy, twelve water and eight food. It unlocks Ellis's eastern delivery search and Rowan's cross-property notebook search. These are three authored requests in the same environment, not three new disciplines or procedural content. First-completion rewards are saved once; replays are free with no repeat rewards/costs, and abandoning an outing changes no saved stats. Further economy, competitions, training curriculum, facility upgrades and breeding remain unfinished.

The optional `work` field extends the version-two Homecoming snapshot. Existing saves without it keep their original data and read as no completed jobs. Invalid work records stop loading instead of being discarded. No original-game database changes or cloud dependencies were introduced. See `docs/NEIGHBORHOOD_OUTINGS.md` for implementation and verification notes.

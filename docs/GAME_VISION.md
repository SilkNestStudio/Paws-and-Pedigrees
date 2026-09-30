# Paws & Pedigrees: product vision and direction

Last updated: September 29, 2026.

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

**Agreed direction:** breeding is an integral later layer, including crossbreeds, inherited differences, and litters of distinct puppies. A dog need not become a national champion to breed. Extensive development and high-level participation provide a fuller understanding of its potential before a player chooses a pairing.

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

Snapshot updated for the September 29 Field Club implementation. The preceding deployed foundation was `620ba7f`.

- Preserved foundations: IndexedDB saves, rescue adoption, dog records and genetics, care/bonding, a 3D kennel and handler yard, fetch/obedience activities, agility, shop, breeding/nursery rules, older competition activities, and return navigation.
- New playable slice: four Field Club disciplines (agility, scent search, herding, water retrieval), per-dog experience and discovery, aptitude/composition effects on performance and learning, keeper coaching, specialist events, four-round individual trials, and four-round team trials with at least two owned dogs. Opponents are explicitly simulated local club rivals.
- New-player direction: adoption leads to a visible club invitation, first suggested scent-search practice, a four-discipline passport, a beginner combined trial, then specialist/team options and a second rescue. Care is available in the club before events. New players receive daily rewards only on a later day after finishing their introduction. Old saves and the older first-ribbon record remain compatible.
- Partial: breed sport profiles are prototype balancing values, not biological rankings; visual environments and animations are early assets. The agility course is reused. Team events allocate dogs to sequential rounds rather than simultaneous multiplayer or relays.
- Future work: higher-tier combined championships, meaningful working assignments, more activity families, advanced training exercises, facility-specific activity unlocks, coherent lifetime/economy balancing, discipline inheritance beyond existing breed composition/base stats, authoritative online competition, payments, and activity-pack entitlements.

Do not present the full expansion backlog as delivered. See [Field Club implementation and tester guide](FIELD_CLUB.md) for mechanics, validation, and limitations.

## 13. Current milestone and unresolved choices

The owner clarified the previously unfinished request and authorized creating the initial 3?4 disciplines as a functional tester game demonstrating the larger concept. The selected first slice is **agility, scent search, herding, and water retrieval**, chosen for different decisions. This selection does not exclude other activities from section 5.

The first outcome is completing a beginner combined trial with the founding rescue. Every sport contributes equally; later a team trial demonstrates why complementary dogs matter. Starter event grants are paid once per event category; replaying develops skills and records. This is a local testing economy, not a completed long-term financial model.

Later work must settle championship composition and qualification, richer team roles, activity/facility progression, life pacing, breed/inheritance balancing, and paid-content boundaries. Observe unfamiliar testers before expanding the discipline list: they should understand what to do, what the dog learned, and why another dog could help.

## 14. Evidence that the next milestone is working

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

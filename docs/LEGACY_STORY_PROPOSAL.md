# Kennel legacy: working story and progression proposal

Recorded September 30, 2026. The owner subsequently authorized beginning the new gameplay prototype; story details marked as proposals remain open.

## Status and purpose

The owner supplied this story as an editable direction, explicitly welcoming changes. Preserve its intent without treating every event, gate, or outcome as settled. The core is building a kennel legacy through caring for, developing, competing with, and breeding individual dogs over generations. The inherited property introduces that ambition before adoption. Keep this repository and existing deployment setup. The owner has now authorized starting and fine-tuning gameplay, selecting a closer follow camera with keyboard movement and phone controls. See [Homecoming preview](HOMECOMING_PREVIEW.md) for the first implemented environment slice.

## Owner's proposed journey

1. **Inherit Grandpa's former champion kennel.** Confirmed backstory: the player's grandfather leaves them the kennel when he passes away. A short playable introduction before adoption establishes the property's history and what it could become again. Start with limited money, leftover food, few usable resources, and little knowledge. The player chooses a new kennel name while following Grandpa's example.
2. **Choose the founding rescue.** Visit the rescue and choose the dog that starts the new legacy. Establish care and attachment at home.
3. **Discover promise in an early competition.** A friend or colleague introduces several disciplines and invites the player to compete. The owner's proposed overall loss reveals weaknesses while a strong discipline and some traits emerge through actual performance. Natural aptitude should reduce the effort needed to develop that strength.
4. **Learn to train and earn a foothold.** Odd jobs finance training facilities. Initially the inexperienced keeper does the training; both keeper and dog need to improve. Playable 3D training exercises must be enjoyable and their execution must affect learning.
5. **Build a competitive kennel.** Competition earnings and other income allow useful facility improvements and another dog. Better facilities open more ways to develop the keeper and dogs, with broader opportunities rather than only bigger numbers.
6. **Plan the first litter.** After developing a few dogs and learning their abilities and traits, choose a pairing to combine strengths. Some information may remain hidden. Breed distinct puppies, raise them, sell some, and retain puppies according to available kennel capacity.
7. **Build a team and pursue the old championship.** A sufficiently developed roster enables team competition. Establish a connected competition system with a meaningful prestigious title the former kennel repeatedly won. Chase that history under the player's own kennel name.
8. **Continue the legacy.** Retirement, descendants, new teams, breeding decisions, and the kennel's own record continue beyond the initial championship story. This should feel like an ongoing life and career, not a completed task list.

## Recommendations for discussion, not approved rules

- Show history through a trophy, team photograph, old pedigree, and closed training/nursery spaces. Keep the pre-dog introduction short. Starting with little in the fiction must not mean withholding usable controls and next-step guidance.
- Explain why Grandpa's former champion property now has few usable resources. His death and relationship to the player are confirmed; his personality, history, and the circumstances of the property's decline remain open.
- Prefer an introductory multi-discipline exhibition outside championship standings: the novice misses the overall standard but can genuinely excel in a round. If the owner prefers a guaranteed loss in a ranked event, make that narrative constraint explicit in the design; do not quietly override player scores or secretly weaken the dog.
- Reveal existing aptitude through performance rather than awarding a random talent because the tutorial reached a checkpoint. Do not promise that one short event reveals the full dog.
- Give safe, basic training access before expensive facilities. Facilities add equipment, specialist coaching, exercises, and greater training scope. Avoid the circular requirement of winning to afford the only training that allows winning.
- Early paid work should be accessible without a trained champion and should teach relevant actions. Later jobs use dog skills. Losses must leave a viable way to earn food and continue.
- Separate the player's execution, keeper expertise, dog aptitude, learned skills, bond, and current condition. Keeper development should unlock better teaching options without deliberately making input unreliable. Beginner training should provide understandable progress and feedback; skilled execution improves the outcome.
- Build distinct training exercises that develop abilities used in competitions. Do not reuse the event unchanged or turn every exercise into a timing bar.
- Use a coherent circuit: local qualifying meets, regional stages, and a major multi-discipline kennel championship, with specialist achievements alongside. Define qualification, scoring, roster roles, recovery, and rewards together. Names, team size, rounds, and timing remain open.
- Team eligibility should depend on readiness and coverage as well as roster size. Owning enough dogs alone should not replace training.
- Validate breeding during development through admin testing access. The owner explicitly rejects moving breeding earlier in normal gameplay just for testing. First-litter timing must follow the intended story and progression; exact pacing remains unresolved.
- Separate temporary litter/nursery capacity from permanent adult capacity. Plan care and sale/placement options before breeding; do not force immediate newborn sales or erase overflow puppies. Sales, prospective homes, pricing, and continuing records need design.
- Keep a family tree, individual records, retired dogs, and the achievements of descendants. Sold puppies could later appear with other keepers, but this is a proposal, not a multiplayer commitment.

## Breeding and appearance requirements

The owner wants detailed, relatively realistic inheritance, meaningful mixed abilities and traits, and convincing coat colors and patterns. Puppies should have individual character while plausibly resembling their family. Arbitrary color rolls or averaging visible parental colors do not meet the request.

Proposed model:

- Store inherited genetic variants separately from their visible expression and from what the player has discovered.
- Use a documented subset of established canine coat inheritance rules, including interactions between genes, rather than claiming a complete biological simulation.
- Generate each puppy's inherited combinations from the parents, then derive pigment, pattern, markings, and supported coat characteristics.
- Give each dog a stable individual marking layout within its supported pattern; preserve it across growth, reloads, portraits, and 3D views. Exact patches should not simply be copied from a parent.
- Keep visual systems and genetic calculations connected: a mathematically correct record with an unrelated dog texture is not sufficient.
- Let pairing previews communicate possible outcomes and uncertainty. Pedigree information and optional in-game tests could reveal carrier status; discovery should not change underlying genes.
- Use a separately balanced, explicitly simplified inheritance model for performance potential and temperament. Do not invent a single scientific agility/champion gene. Learned commands, keeper bond, and earned titles are not directly inherited skill points.
- Pedigree relationships, genetic diversity, health implications, and breeding suitability need a deliberate scope decision before claiming realistic breeding. Do not silently introduce a punitive disease system.

Visible color alone does not establish all possible offspring colors. For example, black and chocolate Labradors carrying recessive yellow can produce yellow puppies. The desired rule should be genetically supported outcomes with understandable explanations, rather than forbidding every color absent from the parents' coats.

Research references:

- [UC Davis: Labrador coat-color inheritance](https://healthtopics.vetmed.ucdavis.edu/health-topics/canine/inheritance-coat-color-labrador-retriever) explains black/chocolate inheritance and recessive yellow carried by dark-coated parents.
- [NHGRI Dog Genome Project: canine coat variation](https://research.nhgri.nih.gov/dog_genome/study_descriptions/study-coat_variation.shtml) describes pigment, pattern, length/texture, and interactions between genes. This supports a multilayer coat model, not a promise of perfect prediction for every breed or marking.

## Confirmed testing direction

The owner wants admin controls to change levels, stats, and related game state to test later systems before release, similar to the current game's testing tools. Testing access must not change normal unlock requirements, starting resources, or story pacing. Testing breeding early in development does not mean introducing it early to ordinary players.

Suggested controls, subject to implementation design: keeper and kennel levels, facilities, resources, dog abilities/traits/age/genetics, story and competition progress, and simulated time. Suggested ready-made scenarios include a new arrival, a breeding-ready kennel, a litter, and a team-ready roster. Keep scenario dependencies consistent and use separate test saves with restore/reset support. These are proposed capabilities, not delivered features. Local development access and future authenticated production admin permissions are separate concerns.

## Decisions still open

- Grandpa's name, personality, history, and how memories of him appear throughout the story.
- Explanation for the property's decline and what is usable on arrival.
- Ranked opening loss versus an unranked introduction with genuine round results.
- Real-time session/life pacing, first-litter timing, and generation length.
- Keeper learning mechanics and how minigame performance affects dog development.
- Competition structure, team sizes, qualifications, and recurring story characters.
- Breeding eligibility, external pairing access, nursery capacity, puppy sales/placement, and adult retention.
- Supported genetic/coat scope, degree of player-visible genetic detail, and health/diversity systems.
- Final art direction and later prototype scope. A closer follow camera with keyboard movement and phone controls is confirmed; the first environment slice is documented separately.

This document records narrative and design intent; the implementation note documents what is actually playable. Normal progression must not be accelerated to make later systems easier to test.

# Rescue to legacy

Approved direction: a rescue-first kennel and breeding game with interactive care,
multiple championship careers, gradual progression, retirement, and separated
earned-only and premium/open competition.

## Delivery sequence

1. Playable foundation: repair saving and rewards, protect rescue potential,
   make breeding timing and litters consistent, and integrate a complete 3D agility
   training course with checkpoints, faults, results, pause, and retry.
2. Lifetime and discovery: versioned age migration, individual aptitude discovery,
   senior conditioning, retirement and memorials, protected absence and recovery.
3. Breeding careers: nursery reservations, ancestry, inheritance previews,
   retained/rehome choices, discipline-specific development and achievements.
4. Trusted economy: authenticated server commands, transactions, reward receipts,
   server time and random outcomes, paid-advantage ancestry and league enforcement.
5. Content and release: swimming/retrieving, field trials, show careers, animated
   dog assets, audio, mobile profiling, then purchases and storefront distribution.

The initial course is a playable foundation, not a claim that all phases are done.
Do not enable real-money purchases until phase 4 is validated. Existing gem
balances are earned game currency; they are not evidence of a real-money purchase.

## Design invariants

- Rescue origin must not reduce inherited potential (or body size).
- Trained stats and championship titles are earned, not inherited by puppies.
- Litters contain distinct puppies; champion parents do not guarantee champions.
- Base potential, learned skills, bond, and current condition are separate concepts.
- Paid competitive advantages must follow descendants and transfers. Cosmetic
  purchases do not change competitive eligibility. Earned-only dogs may enter open
  competition once qualified.
- Long absences must have capped consequences and an accessible recovery path.
- Retired dogs remain part of kennel history. No paid revival business model.
- Lifetime timing changes require a migration preserving existing dogs' ages.
- The client may simulate races, but competitive rewards and purchases eventually
  require server validation. Local guards are not anti-cheat protection.

## Proposed pacing to validate

Puppy development: 2–3 real weeks; young adult development: a further 2–4 weeks;
competitive careers: several months; gradual senior transition and retirement.
These are balancing targets, not veterinary claims. Breed tendencies require
research before introducing new breed-specific numerical bonuses.

## Delivered foundation (September 23, 2026)

- Shared playable 3D agility course for training and agility competitions: ordered
  obstacles, jumping, tunnel, weave poles, seesaw, faults, finish, pause, keyboard
  and touch controls. Standalone practice is available at `/?practice=agility`.
- Per-record save queue with retry and ordered writes; competition reward guards;
  litter capacity reservations, consistent pregnancy timing, and duplicate-birth guards.
- Rescue potential parity and aptitude discovery through bonding and training.
- Capped absence health loss and free veterinary recovery, with a 24-hour activity
  restriction and small trained-skill loss. Legacy neglect deaths have free recovery.
- Lazy-loaded 3D scenes and a standalone practice route that does not contact Supabase.

The existing accelerated aging clock is still active. The proposed multi-month
careers, gradual retirement, new disciplines, inherited premium eligibility, and
real-money payments are not implemented. Aging needs a versioned migration before
changing the clock. Current dog visuals are procedural placeholders.

## Verification and release gaps

- `npm run test`: 19 isolated regression tests covering saves, rewards, rescue
  development, care, breeding, and continuous course traversal.
- `npm run type-check` and `node node_modules/vite/bin/vite.js build` pass.
- `npm run test:browser`: desktop and mobile practice checks, including pause,
  movement, collisions, restart, input release, and absence of cloud requests.
  Start Vite on port 5173 first. Install Playwright Chromium and set
  `PLAYWRIGHT_BROWSERS_PATH` to `.browser.local` when using the local browser cache.
- Live account persistence and deployed database policies have not been verified.
  Economy mutations still need server transactions and authoritative validation.
- Existing repository-wide lint failures, dependency audit findings, large image
  assets, and large application/Three.js chunks remain release work.

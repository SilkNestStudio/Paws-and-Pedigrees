# Handler-led yard

The yard now separates the player's actions from the companion's choices.

- Lawn clicks move a visible handler along collision-safe paths. The dog follows when more than 3.8 world units away, otherwise explores nearby scent spots.
- Call back interrupts a bowl visit or roaming and recalls the dog beside the handler's current position. A short six-second settling period precedes independent behavior. Wait holds the dog in place until released or a new walking command.
- Bowl interactions walk the handler to a service position and prepare one serving. Food is deducted from the pantry at preparation, once. No care credit is awarded until consumption finishes.
- A dog at 65% food/water or below visits a prepared bowl while the yard is active. Water has priority. This threshold is a game balance setting (`YARD_CARE_THRESHOLD`), not a biological claim. Empty bowls cannot supply care. There is no automatic purchase, pantry refill, or offline feeding.
- Bowls are reserved per companion. Switching companions shows their individual servings. Prepared portions persist through leaving, reload, and local save export. Existing saves default to empty bowls.
- Dog care takes 2.2 seconds at the bowl; handler preparation takes 1.2 seconds. Both use foreground simulation time, not detached timeouts. Wait, recall and ground commands can interrupt the dog's care. Pausing freezes it.
- Supplies is at the front entrance. Selecting it walks the handler there and opens the existing shop. The guided first purchase also remains available directly from the tutorial.
- Rest invites the dog to its mat after the handler walks alongside it. Fetch and obedience share the handler model; the agility course still uses its existing control system.

`YardWorld.tsx` owns foreground scene behavior; `Handler3D.tsx` is the shared procedural character; `care.ts` owns the needs priority and threshold. Store actions own persistent accounting and revalidate dog/portion state when care completes. Direct care from My dogs consumes a reserved portion before charging the pantry again.

Local IndexedDB requires no migration. Before enabling Supabase sync, apply `supabase/migrations/20260928000000_yard_bowls.sql`, which adds the dog's JSON bowl state. No cloud service or deployment was changed for this work.

Validation: unit coverage in `tests/game.test.ts`; isolated browser fixtures in `scripts/yard-handler-smoke.mjs`, `scripts/yard-roaming-smoke.mjs`, `scripts/yard-camera-smoke.mjs`; real first-day flow in `scripts/first-day-smoke.mjs`. Tests use separate browser contexts and do not reset the player's save.

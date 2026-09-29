# Kennel interior and identity

The main home route is now `hub`, a cutaway 3D kennel with a visible handler. The previous JourneyHome remains `office`, reached through the Our story board. Existing detailed views, store rules, tutorial gates and saved progress are retained.

Room signs walk the handler to an unobstructed aisle destination, then open the corresponding view. Clicking the aisle cancels a pending room visit. Blur/visibility changes pause navigation and cancel that visit. Room shortcuts provide a keyboard-friendly, non-WebGL route to the same screens. The yard has an explicit return-inside link.

The keeper desk exposes expansion, training, breeding/nursery, work and the longer story chapters. The first-day guide stays visible in the hub and keeps the existing lesson order. Locked rooms explain the next lesson instead of silently opening later systems.

`interiorStyle()` derives furnishings from the existing kennel level; there is no separate decoration purchase or second progression system. Level one has two simple runs. Level two adds four cushioned runs and a runner. Level three adds a nursery and six visible runs. Later levels improve finishes, storage, and display furniture. For performance and readability, the model shows at most six representative runs and two dogs; actual capacity and all dog records remain available through Dog runs and the header. Additional storage changes with every level. The display cabinet is not an award grant.

Identity is stored on UserProfile: the existing kennel_name plus optional kennel_emblem and kennel_color. Names are trimmed, 2–36 characters. Four SVG crests and three color schemes share the header and wall banner. Existing saves receive a paw/copper visual default without migration; no currency is charged. Identity survives a normal progress reset. Apply `20260928000001_kennel_identity.sql` before returning to Supabase sync. No cloud migration was applied by this change.

The header separates pantry food units from the selected companion's Food/Water/Energy percentages. Water refill itself is free; there is no invented water inventory. Companion selection is disabled during yard/training/competition views, which own their own session companion. Keeper XP and gems remain in Keeper & wallet, with an honest explanation of their limited current integration and existing uses. This change does not add a payment system or rebalance XP.

Checks: game unit suite; `scripts/kennel-interior-smoke.mjs` (isolated desktop/mobile saves, identity persistence, room routes, real level-one-to-two upgrade, yard return, pause and marker overlap); `scripts/first-day-smoke.mjs` (new-save tutorial regression). Player saves are not reset by tests.

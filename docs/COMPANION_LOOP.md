# Companion gameplay pass

The main dog screen now brings care, active bonding, development, training, and
competition navigation into one flow. Full records, advanced care, breeding,
certifications, puppy training, and existing competition systems remain accessible.

## Current behavior

- Overview guidance selects actual dogs and prioritizes health, food/water, recovery,
  rest, early bonding, and training. It is not a generated list of fake quests.
- Companion condition refreshes on opening the game, returning to the tab, and each
  minute. Updates derive from existing timestamps and do not roll illness or apply
  stacked absence penalties. Aging and retirement pacing are a separate migration.
- Every bonding UI uses the same store command. Completion checks the current dog,
  respects a 15-minute cooldown per activity, applies rewards once, and tracks story
  progress. Pregnancy/recovery blocks exercise while allowing quiet company.
- Quiet time requires 12 seconds of active pointer/keyboard input. Releasing, losing
  focus, or hiding the tab stops progress. Canceling awards nothing; finishing once
  awards the existing happiness and bond amounts.
- Development markers show current bond, trained skills, and recorded event entries.
  They are not a new permanent achievement or reward system.
- Training provides exact before/after trained skill values, bond XP, and remaining
  energy/TP. The recap remains visible until dismissed or leaving the screen.
- Advanced drag care retains filled bowls across drags; it no longer empties a bowl
  at the start of the gesture needed to deliver it.

## Verification

23 isolated gameplay regressions; TypeScript and production build checks.
Run node scripts/companion-smoke.mjs with Vite on port 5173 and Playwright Chromium
installed. The script uses isolated browser profiles, never the player's real save.
It covers care, cancellation, active bonding, cooldown, milestones, trainer recap,
return navigation, reload persistence, and mobile layout.

## Further work

Fetch/walking and most non-agility games retain prototype presentation. Planned next
passes should replace those interactions, improve competition anticipation/results,
and connect kennel expansion and breeding to a balanced long-term career. This pass
does not implement new career disciplines, paid leagues, lifetime migration, or
server-authoritative economics.

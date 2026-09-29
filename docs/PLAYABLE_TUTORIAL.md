## Owner controls update

The yard now uses click/tap destinations, recall, and wait. Care buttons send the dog to stations and apply care after arrival. Arrow-key yard instructions below describe the superseded prototype. Agility still uses its existing course controls. The companion panel brings care, supplies, play, and training together; Overview opens this hub.

# Your First Ribbon: playable onboarding

The opening `kennel-basics` tutorial now starts a saved, action-based guide instead of the old Next-button overlay. New adopters see it automatically. Existing kennels opt in through **Settings > Replay Tutorials > Your First Ribbon (playable guide)**. No existing save is reset.

Ten lessons cover visiting the yard, moving, hydration, purchasing food supplies, feeding, fetch, rest, self-led recall training, agility training, and a free unranked welcome meet. The guide explains the purpose and controls, highlights relevant yard actions, and marks bowls/rest/gate with a gold ring. Agility also provides obstacle-specific coaching during the run.

## Progress and rewards

- State lives in optional `tutorialProgress.firstRibbon`, already included in local IndexedDB snapshots and backups. Older saves need no migration. Cloud mode retains the existing browser-cache behavior; cross-device tutorial sync is not introduced here.
- The journey is attached to one dog. Successful care, fetch bonding, and completed self-led training report lesson events. Cancelled/failed actions and hired trainers do not satisfy those training lessons.
- Already hydrated/fed/rested dogs can be checked without spending supplies or waiting for needs to fall. A recently completed fetch can be acknowledged while its cooldown is active.
- Useful actions performed out of order during the active guide count, so players do not need to repeat care. The welcome meet requires every earlier lesson.
- Pause retains progress and awaits the local save before displaying confirmation. Resume continues where the player stopped. Replaying a completed guide preserves the earned cosmetic.
- The welcome meet uses the existing full agility course and finish validation. It has no entry fee, TP cost, championship points or ranked opponents. Completion unlocks a participation rosette on the cottage. It awards no repeatable currency or kennel-level advantage.
- Existing chapter/story tracking continues independently. This guide does not pretend to complete a ranked competition or replace the broader ten-chapter campaign.

## Validation

`node scripts/test.mjs`: includes companion-specific progress, duplicate events, pause/resume, early reward rejection, replay and care validation.

`node scripts/tutorial-smoke.mjs`: isolated desktop/mobile saves; automatic start, movement, buying food from an empty pantry, real watering/feeding, pause/reload/resume, cancelled fetch, and a saved late-lesson fixture for welcome-meet entry/cancellation. Full course physics completion is covered by the existing continuous-run simulation test, not by this browser walkthrough.

## Follow-up

Add authored animations/sound and finer accessibility cues as the art develops. A shorter novice obstacle course and a ranked beginner competition can build on this introduction; the current welcome meet deliberately uses the existing course. Legacy topic-specific help overlays remain reference material and are not replaced by new playable lessons yet.

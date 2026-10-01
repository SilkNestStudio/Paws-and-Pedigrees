# Phase 1 field test

Status: first playable, October 1, 2026. This tests one question: **is working with your dog fun, and does the player's
skill matter?** It is not the opening of the game. Story, kennel management, economy and breeding are not in it.

## What you can do

- **Three shelter rescues**, generated from real breed ancestry with locus-based coat genetics, so they look different
  (tan points, saddles, sable, brindle, merle, piebald, ticking) and have different hidden aptitudes. Field book → Dogs.
- **Free play**: walk with your dog and throw the ball (tap or click the ground).
- **Seven retrieve set-ups** in Grandpa's training field, from a first mark to a long blind in a crosswind:
  - *Marks*: helpers throw dummies; the dog must stay steady, remember the fall and hunt it out.
  - *Blinds*: a hidden dummy by an orange stake. Send the dog on a line, stop it with the whistle, and point a
    direction to cast it. Wind carries scent downwind, so getting the dog downwind of the blind lets its nose finish.
- **Four marker-training lessons**: sit, steady to the throw, stop whistle, directions drill. Press "Yes!" at the moment
  the dog does the right thing. Timing and what you choose to reward decide what it learns. Skills carry over to the field.
- **Result cards** explain what happened and why, and suggest the next step.

## What to judge

1. Within 15 minutes, do you want to keep playing?
2. Does handling feel like a skill? Does a good whistle and cast visibly beat sending and hoping?
3. Do the three dogs feel different to work with?
4. After a few stop-whistle and directions lessons, is the dog noticeably better on blinds?
5. Does the marker-training timing feel fair and readable? Can you see the moment to mark?
6. Is anything confusing: controls, camera, what to do next?

## Controls

| Desktop | Phone | Action |
| --- | --- | --- |
| WASD / arrows, Shift to run | Joystick (push fully to run) | Walk |
| Click ground | Tap ground | Throw, send, or point a direction when the dog waits |
| Space | Whistle button | Stop whistle (field) |
| R | Here! | Call the dog back |
| F | Sit | Steady the dog before sending |
| T | Throw! | Call for the marks |
| Space / F | Yes! / cue buttons | Lessons: mark / give the cue |
| Drag, Q / E, wheel | Drag | Look around, zoom |
| B or Tab | Field book | Menu |

## Known limitations

- The 3D dog is built from simple shapes in code. A proper Blender-made base dog is planned. Its coat shader and
  animation hooks will carry over.
- Rival handlers, competitions, jobs, the day/season calendar, care, the kennel and breeding are not in this test.
- Progress is saved in the browser's local storage for this test only (key `paws-rebuild-field-test`).
- Field book → Dogs has tester tools: reveal hidden aptitudes and genotypes, skip ahead to a trained dog, meet new rescues.
- Sounds are simple synthesised tones.

## Tuning reference

All behaviour numbers live in `src/sim/dogParams.ts` (aptitudes → behaviour), `src/sim/retrieve.ts` (whistle and cast
response), `src/sim/training.ts` (`LEARNING_SPEED`, timing window) and `src/sim/report.ts` (scoring).

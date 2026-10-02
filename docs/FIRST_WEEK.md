# The first week

Status: playable test build, October 1, 2026. This is a shallow but complete slice of the real day-to-day game, built
so the whole loop can be judged rather than a single activity. It replaces the earlier Phase 1 field test.

## What happens

1. **Grandpa's letter**: three illustrated pages (the existing story art).
2. **Arrival**: walk round the kennel. Read the ledger in the office, see the empty runs and the pantry, and paint your
   kennel's name on the gate sign. An orange arrow and the objective card always show the next step.
3. **Larchwood Rescue**: play ball with each of three dogs (genetically distinct in looks and talents), then choose and
   name one.
4. **Home**: fill the bowl (the dog walks over and eats), give a pat, and teach a first lesson at the field gate. Bed
   ends the day.
5. **Day 2**: Mara, Grandpa's old friend, visits. She invites you to Sunday's Village Fun Day and asks you to find her
   lost keys: the scent-search tutorial in her orchard.
6. **Days 2 to 6**: choose how to spend each morning, afternoon and evening. Options: lessons and retrieve practice in
   Grandpa's field, noticeboard jobs for money, the village shop (food, a brush, a long line), and restoring Grandpa's
   scent garden to unlock the Search and indicate lesson.
7. **Day 7: the Village Fun Day**: three rounds (a mark, a search, a blind) against Victor Sterling's trained Labrador
   and young Billy Ashby's beagle cross. Rivals play the same simulation with their own dogs and handling skill.
   Afterwards Mara points out what your dog showed a gift for, and play continues.

## Systems in the slice

- **Time:** each day has morning, afternoon and evening. Lessons, field work, jobs and the Fun Day each use one part.
  Bed starts the next day. Dog aging by season is designed but not active in this one-week slice.
- **Care:** fullness falls through the day; filling the bowl uses a meal from the pantry. Energy is used by work and
  restored by sleep. Hungry dogs listen less and give up sooner; tired dogs run slower and tire sooner.
- **Money:** start with $40 and 4 meals. Jobs pay $15 to $34. A bag of kibble (8 meals) costs $24. The scent garden
  costs $90.
- **Getting to know your dog:** aptitudes start unknown. Watching your dog work narrows each one to a range shown in
  the office ledger, with "You're getting a feel for..." moments when one becomes clear.
- **Activities:** retrieves (marks, doubles, blinds, with whistle, casts, wind and scent), scent search (choose where to
  search, read the dog, trust or doubt its indications) and five marker-training lessons.

## Controls

| Desktop | Phone | Action |
| --- | --- | --- |
| WASD / arrows, Shift to jog | Joystick, or tap the ground to walk there | Move |
| E | The big context button | Use what's nearby (office, bowl, van, noticeboard…) |
| F | Pat button | Pat your dog at home |
| R | Call / Here! | Call your dog |
| Click or tap the ground | Tap | Throw, send, direct, or "search here" |
| Space | Whistle / Show me! / Yes! | Stop whistle · trust an indication · mark in lessons |
| X | Search on | Doubt an indication |
| T | Throw! | Call for the marks |
| Esc | Menu | Menu and tester tools |

## Tester tools

Menu → Tester tools: +$200 and food, skip a day, adopt instantly, delete the save, and the dog's hidden aptitudes.

## Known limitations

- Characters are Blender-made but still procedural art: no blinking or facial expressions yet, and some foot sliding at unusual speeds. A hired artist could replace the base models later without changing the game.
- One week only. The season calendar, aging, more dogs, competitions beyond the Fun Day and breeding come later.
- Saves are local to the browser (IndexedDB database `paws-rebuild`).

## Checking it

- `npm test`: rules, simulations, story progression, rivals (46 tests).
- `node scripts/week-playthrough.mjs [label] [phone]`: plays the whole week in Edge with screenshots in `.browser.local/`
  (dev server on port 5180).

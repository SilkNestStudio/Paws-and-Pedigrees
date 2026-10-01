# Woodland search: the missing pack

Product direction: [GAME_VISION.md](GAME_VISION.md). September 30, 2026.

## Playing the case

Open Field Club, choose **Play Scent search**, begin the round and choose **Take the scent & begin**. The dog follows the first scent to a fork. Tap nearby ground or use a trail sign to investigate. The brief identifies the missing person's clothing; matching fabric and deep bootprints support their route. Fur, small pawprints and picnic smells indicate animal trails. Evidence descriptions become readable on approach.

The dog checks nearby evidence automatically. A confirmed discovery adds a field note and leads toward the next fork. Incorrect trails can be ruled out and revisited without repeated penalties. Recall returns to the current fork; during a broken-trail search it holds the dog in place rather than skipping the gap.

At a scent gap, use ground directions or short directional sweeps across the clearing. The amber scent ribbon and dog-status feedback help locate the trail. **Take scent again** temporarily expands detection for twelve seconds; three uses are available per case, with no repeat use while active. These are guidance resources, not paid items.

Careful pacing is slower but has broader scent coverage. Brisk pacing crosses open ground faster, but dogs below working ability 60 can follow an animal scent once per chapter. **Leave it** redirects the dog before it commits to investigating. Experienced dogs at 75+ ability bridge normal scent gaps; advanced expeditions still require casting. Detection range and inspection duration also improve continuously with ability.

Three discoveries recover the normal missing bag. Five discoveries finish the advanced expedition. Cases vary between a ranger's field pack, a photographer's camera bag and a surveyor's pack, with seeded left/right routes. The environments and branch structure are authored, not randomly generated open-world terrain.

## Results, saves and exits

There is no failure countdown. Elapsed time still contributes to efficiency under the existing 60 completion / 25 pace / 15 control formula. Finishing saves discipline development, the report and existing event rewards; leaving an unfinished case awards nothing and allows a fresh attempt in the saved club visit.

The report identifies `activity: woodland-search` and stores actual distance, time, animal trails ruled out, scent refreshes and successful distraction redirects. Woodland personal bests start independently of the old box-search records. Previous results remain readable; no player-save reset is required.

Pause, field notes, window blur and hidden tabs suspend the simulation. Exit returns to the club. Search remains one discipline within existing specialist, combined and team visits. Training remains the separate focus exercise.

## Code and checks

- `src/game/club/searchTrail.ts`: pure seeded cases, handler commands, scent/distraction behavior, completion and reporting.
- `src/game/club/SearchAdventure.tsx`: R3F woodland, following camera, dog/handler presentation, evidence and accessible command alternatives.
- `searchAdventure.css`: responsive portrait and landscape layout.
- `scripts/woodland-smoke.mjs`: isolated new-save adoption, wrong trail/recovery, mouse/touch ground casting, completion, report/reload, pause, field notes and exit.
- `scripts/woodland-driver.mjs`: shared deterministic browser driver; it reads the seeded solution for automation but sends commands through real UI.
- Gameplay tests exercise novice/expert and normal/advanced completion, case variation, distraction recovery, finite scent samples, no timeout, malformed commands and record compatibility.

Run browser checks with Vite on port 5173 and `PLAYWRIGHT_BROWSERS_PATH=.browser.local`. All automated saves are isolated from the developer's browser.

This iteration establishes exploration, clues and recovery in one activity. It does not establish that unfamiliar players find it fun. Ask testers whether they understood the dog's cues, made a reasoned trail choice, recovered without help, and wanted to try another case before expanding this pattern into other sports.

Verification for this iteration: production build, 65 gameplay tests and lint on the changed gameplay modules passed. The standard case was played through in desktop and phone-sized touch browser contexts, including wrong turns, scent gaps, reports/reload, pause, notebook and exit. The advanced expedition was completed in the browser with a trained-dog fixture. Phone checks use emulation, not physical hardware.

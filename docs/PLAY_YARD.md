# A new yard to play in

Implemented October 1, 2026 after the owner rejected the Homecoming work as too similar to the original game. This is a small interaction/art-direction playtest, not another progression milestone or proof of finished quality.

## Access

- Local: `http://127.0.0.1:5173/?preview=yard`.
- Homecoming header: **New play yard**.
- Pause offers return links to Homecoming and the original game.
- Same repository and Vite/Vercel entry point; not published automatically.
- `main.tsx` loads the playtest before store hydration. No database, auth, localStorage or persisted dog is accessed. Pip and June are explicitly temporary playtest companions. Reload or changing companions resets the session.

## What is different

- New original code-built cartoon dog and keeper: rounded proportions, face details, expressive eyes, tail movement, head tilt, limb gait and a throwing-arm pose. These are procedural prototype characters, not final rigged production models.
- Pastel garden, flowering planters, cream picket fence, cottage, colorful trees, soft rounded forms, toon materials and lilac/cream interface. This is a distinct visual direction rather than a replacement of every game asset.
- Move continuously with WASD/arrows or an analog touch pad. Aim on the lawn; hold and release to throw. Longer holds raise the arc. The dotted guide previews the airborne path; subsequent bounces are physical rather than part of that guide.
- Keeper movement continues during retrieval. Dog paths route around solid planter beds. The ball bounces off the ground, yard boundaries and planters, rolls, and is carried back to the keeper's current location. No repeated click is needed for each step of a retrieve.
- Pip runs quickly and can take a short victory lap with a long throw. A call brings him in sooner. June hesitates at longer distances; encouragement or approaching helps. Both can finish without perfect handling. After three returns the demo removes the beginner hesitation/lap on long throws; this is not final progression balance.
- Optional moving purple patch provides an aiming challenge. Returns and patch hits are session counters, not currency or keeper rewards. There is no forced checklist, countdown or completion modal.
- Q/E or turn buttons orbit the camera; the wide view exposes the entire yard. Phone controls support dragging the throw aim and moving with the touch pad. The viewport prevents browser panning while aiming.
- Escape, Pause and browser focus loss stop the simulation and clear held input/throws. Native pause dialog contains focus and has explicit exit links.

## Ownership and verification

`src/game/playyard/play.ts` owns ball motion, dog phases, navigation, collision and the temporary learning behavior. `Characters.tsx` and `Scenery.tsx` own replaceable visuals. `PlayYard.tsx` owns controls/camera/UI. No existing game actions are invoked.

Unit tests cover retrieval from four corners and planter centers for both companions, cue effects, return to a moving keeper, and collision-safe dog endpoints. `scripts/play-yard-smoke.mjs` exercises real pointer/touch throws and returns, desktop/phone keeper movement, companion switching, camera controls, pause and empty IndexedDB. Screenshots are captured in the ignored `.browser.local` directory for visual inspection.

Still to evaluate with the owner: whether the interaction is enjoyable, preferred camera distance, dog expressiveness and visual direction. This does not yet contain fetching varied objects, complex obstacle tricks, final animation blending, sound, multiplayer, a training curriculum or competition/breeding integration. Do not port systems into it until the core interaction has earned that expansion.


## Follow-up: Homecoming combination

The owner prefers these characters with the Homecoming property and clarified that feel/mechanics matter more than a new environment. The original isolated experiment remains at this route; the Homecoming header calls it **Yard experiment** (desktop). The main connected route now offers fetch with the adopted dog in its existing courtyard. Shared characters and simulation support both scenes, using an explicit environment adapter for Homecoming collision/path rules. The standalone demo still never opens a database; Homecoming continues using its separate saved journey. See the latest Homecoming implementation notes for the combined controls and limits.

## Owner controls update

The yard now uses click/tap destinations, recall, and wait. Care buttons send the dog to stations and apply care after arrival. Arrow-key yard instructions below describe the superseded prototype. Agility still uses its existing course controls. The companion panel brings care, supplies, play, and training together; Overview opens this hub.

# Milestone 01: A companion and a home ground

Playable locally through **Yard** in the main navigation. Existing portraits remain the kennel/profile artwork. No save schema changes or cloud dependencies were added.

## Included

- Two original Blender dog templates: athletic (retriever-inspired) and stocky (Staffy-inspired). Staffy and Boxer currently use stocky; other breeds use athletic. Saved coat color tints the coat; pattern, breed-specific ears, fur, and size differences are future work.
- Shared skeletal clips: Idle, Walk, Run, Eat, Sit. The same selected dog appearance is used in the yard, agility training, and agility competitions.
- A fenced yard with cottage, paths, bowls, resting mat, bench, trees and a gate to the existing agility course.
- WASD/arrows and pointer direction controls. Frame-limited movement, building/boundary collision, cleared input on blur/visibility change, and low graphics option.
- Short care interactions call existing store actions after the animation. Supplies, needs, bonding and persistence remain governed by those actions. Leaving the yard or switching away cancels pending care.
- Agility uses TrainingView's existing eligibility, rewards and completion guards. Cancelling gives no training reward. Returning preserves the yard position.

## Assets and rebuilding

Generated game files: `public/models/{athletic_dog,stocky_dog,kennel_yard}.glb`.
Editable source: `art/blender/*.blend`.
Reproducible source: `tools/blender/build_milestone.py`.

PowerShell:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.0\blender.exe' --background --factory-startup --python-exit-code 1 --python tools/blender/build_milestone.py
```

Regeneration overwrites these generated assets and Blender sources; preserve hand-edited Blender files separately. Refresh the browser after regenerating (GLTF assets are cached by URL).

All geometry and materials were generated for this project without external downloaded models, textures, or add-ons. Portraits were visual references, not embedded textures. Each dog is approximately 10-11k triangles and 0.5 MB, with one skeleton and 6-7 material primitives. The yard is approximately 1 MB and 16 material groups. Only the selected body template is loaded.

## Validation

- `npm.cmd run build`
- `node scripts/test.mjs` (24 tests, including yard collision and normalized movement)
- Set `PLAYWRIGHT_BROWSERS_PATH` to the installed browser directory, then `node scripts/yard-smoke.mjs` with the dev server on port 5173. Uses isolated saves and checks both dog templates, keyboard/pointer movement, saved feeding/watering, agility entry/exit, and mobile layout.

## Next refinement

These are prototype stylized models, not final breed-accurate art. Improve gait/foot contact and feeding alignment; add breed silhouette parameters and coat patterns, authored jump/tunnel animations, sound, and richer bonding in the yard. Test actual phone GPU performance before increasing visual complexity. The cottage is an exterior only, the small yard hurdle is scenery, and physical phone testing is still needed. Existing accelerated dog aging and the broader economy were not changed in this milestone.

## Yard activities

**Play fetch in the yard** opens a three-retrieve session. Tap the highlighted lawn (or use direction/distance sliders), throw, wait for pickup, then recall. The dog runs to the ball and carries it home. Copper rings provide an accuracy target; accuracy is feedback only, not extra bond XP. Completing calls the existing fetch bonding action, including energy cost and cooldown. Cancelling awards nothing. Existing companion/profile fetch entry points now use this same 3D activity.

**Practice sit, stay & recall** opens obedience training directly from the yard. Each repetition requires a sit, a completed stay and a recall. Calling early restarts the stay and lowers session performance. It also replaces Command Drills' old minigame in Training. Existing TP, training gains, bond rewards and restrictions are reused. Both activities pause when the browser loses focus and require explicit resume.

Sprint, weight pull, distance running, walking and quiet-time activities have not been rebuilt in this pass.

### Local testing levels

In the development server, open **Settings > Testing tools**. Set **Player level** (1-100) or **Kennel level** (1-10), then **Apply Changes**. The existing panel also supports currency, keeper skills, dog bond and story progress. These edit the current saved kennel. Local development access no longer depends on the old `local-user` ID. This additional access is disabled in production builds and cloud mode; it does not grant backend admin privileges.

Activity browser regression: `node scripts/yard-activities-smoke.mjs` (isolated desktop/mobile saves, completed fetch/obedience, pause, cancellation and cooldown checks).

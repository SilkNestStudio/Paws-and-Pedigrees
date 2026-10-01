# Homecoming character refinement

The owner requested recognizable, more refined people and dogs for the close camera. This pass creates original Blender assets for the Homecoming preview. No third-party models, textures, paid services, or external asset licenses are used.

## Assets and reproducibility

Run Blender 5 in background mode with `tools/blender/build_homecoming_characters.py`. The script imports mesh helpers from `build_milestone.py`, whose old build now has a main guard so importing helpers does not regenerate the old game assets.

| Asset | Export | Editable source | Triangles | Bones |
| --- | --- | --- | --- | --- |
| Keeper | `public/models/homecoming_keeper.glb` | `art/blender/homecoming_keeper.blend` | 44,884 | 16 |
| Athletic companion | `public/models/homecoming_companion.glb` | `art/blender/homecoming_companion.blend` | 33,636 | 17 |
| Stocky companion | `public/models/homecoming_stocky.glb` | `art/blender/homecoming_stocky.blend` | 33,994 | 17 |

Approximate uncompressed GLB sizes: 1.6 MB keeper, 1.5 MB per dog. Dogs have eight material primitives; keeper has ten. Shared cached geometry/materials are reused through skeleton cloning. These budgets are for the current one-keeper/one-companion preview, not a promise that large crowds will perform well without further optimization.

The keeper uses continuous tailored trousers and an overshirt with pockets/collar/cuffs, shaped hair, facial features, hands, and rounded boots. Idle, walk and run clips animate knees, ankles, arms, torso and head.

Dogs use voxel-joined, smoothed and reduced body/limb meshes with differentiated chest, waist, hips, muzzle, folded ears and paws. Separate eye/nose/collar details are retained. Body vertex colors add subtle tonal variation; other primitives use white color attributes so their material colors are not accidentally blackened during glTF export. This appearance is authored, not derived from inherited genes.

Dog clips: Idle, Walk, Run, Sniff and Sit. Paw placement and bent knees are baked into the animation to improve contact with the ground, including the seated pose. No runtime IK solver is required. Artistic gait tuning remains possible in the generator and editable Blender files.

`CharacterModel.tsx` loads only these preview assets, crossfades clips, pauses mixers, and scales dogs to a more appropriate size relative to the keeper. The old shared Handler3D/Dog3D and their assets remain available to earlier game scenes.

## Visual review and limits

`tools/blender/render_homecoming_characters.py` imports the exported GLBs into a neutral studio for review, producing `.browser.local/homecoming-character-review.png`. Browser smoke scripts capture the models in the actual environment, including moving/waiting companions and phone layouts.

The characters are stylized original models and an iteration toward the owner's desired presentation. Final art approval, facial animation, detailed hands/fur, breed-specific anatomy, genetics-driven coats and markings, configurable keeper appearance, animation polish, LODs and physical-device profiling remain future work. Do not describe these as completed by this pass.

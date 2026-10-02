# Character pipeline (Blender 5, scripted)

These scripts build the stylized dog and person characters as rigged, animated glTF
binaries for the React Three Fiber game. They need no add-ons, textures or downloaded assets.

| Output | Script | Blender source |
| --- | --- | --- |
| `public/models/dog.glb` | `build_dog.py` (+ `dog_shape.py`) | `art/blender/dog.blend` |
| `public/models/person.glb` | `build_person.py` (+ `person_shape.py`) | `art/blender/person.blend` |
| `.browser.local/blender/dog_sheet.png`, `person_sheet.png` | `render_sheet.py` (+ `person_panels.py`) | renders the exported GLB |

## Running

From the repository root (PowerShell or Git Bash):

```
"C:\Program Files\Blender Foundation\Blender 5.0\blender.exe" --background --python tools/blender/build_dog.py
"C:\Program Files\Blender Foundation\Blender 5.0\blender.exe" --background --python tools/blender/build_person.py
"C:\Program Files\Blender Foundation\Blender 5.0\blender.exe" --background --python tools/blender/render_sheet.py -- dog
"C:\Program Files\Blender Foundation\Blender 5.0\blender.exe" --background --python tools/blender/render_sheet.py -- person
node tools/blender/check_glb.mjs public/models/dog.glb
```

The dog build takes about 90 s and the person build about 50 s. Each contact sheet takes 1–2 minutes
to render on the CPU with Cycles. `render_sheet.py -- dog "Sit,Down"` renders only the named
panels, and `-- dog debug` renders a set of pose-inspection views. `preview_dog_body.py` renders
the bare SDF body for quick shape iteration.

## How the models are made

1. **Anatomy as signed distance fields** (`sdf_lib.py`). Each character is a smooth union of
   analytic primitives: ellipsoids, tapered capsules, rounded boxes and chains. There are no
   intersecting meshes, so joints have soft fillets.
2. **Surface nets** turn the sampled field into a watertight quad mesh. Every vertex is projected
   back onto the exact surface, then the mesh is decimated with X symmetry and relaxed tangentially.
3. **Skin weights are procedural.** Each primitive is tagged with a body region, such as torso,
   neck, head, tail or one leg. A vertex gets soft region weights from the primitive distances, and
   within a region the weights come from projecting the vertex onto a joint chain, with a smooth
   hand-over at each joint. Each vertex has at most 4 influences, normalised. Accessories (eyes,
   nose, ears, fluff, garments) use the same functions or copy weights from the body vertex each
   tuft grows from.
4. **Breed morphs (dog only)** are displacement fields that can be evaluated at any point in space.
   The same field drives the body, every accessory and the rig-joint offsets, so all parts stay
   consistent.
5. **Animation** is solved in Python: planted-foot two-bone IK (dog hind legs add a hock and paw
   angle), body and spine curves, and gait phase tables. Each clip is keyed per frame as bone-local
   quaternions with LINEAR interpolation.
6. Everything is authored facing +Y in a "design frame". It is rotated 180° about Z as the Blender
   data is written, so the default glTF +Y-up export faces **+Z in three.js**.

## Orientation and scale (both files)

- Units are metres and three.js is Y-up. The character faces **+Z**, and its feet/paws rest on **y = 0**.
- The character's **left side is +X** in three.js (bones and meshes with `_L` sit at +X).
- The armature node (`DogRig` / `PersonRig`) has an identity transform. All meshes and the `root`
  bone are its children, and `root` sits at the origin on the ground.
- Clips are in place, with no root motion. `root` is never animated. The body bob, sway and
  lowering are on `spine_01` (dog) or `hips` (person), which are **the only bones with a
  translation track**. Every other bone has rotation tracks only, and no clip has scale tracks.
- Clips run at 30 fps. The first key is at t = 0, and in looping clips the last key equals the
  first, so they loop seamlessly with `THREE.LoopRepeat`.

## DOG contract (`dog.glb`)

**Size:** the withers are about 0.50 m high and the body runs from the nose (z ≈ +0.47) to the
tail tip (z ≈ −0.50).

**Bones (31, one skin):** `root`, `spine_01`, `spine_02`, `spine_03`, `neck_01`, `neck_02`, `head`,
`jaw`, `ear_L`, `ear_L_tip`, `ear_R`, `ear_R_tip`, `upperarm_L`, `forearm_L`, `paw_front_L`, the
same three with `_R`, `tail_01` … `tail_05`, `thigh_L`, `shin_L`, `hock_L`, `paw_hind_L`, and the
same four with `_R`.

**Bone-local rotation directions.** These were checked numerically in three.js with
`bone.quaternion.multiply(axisAngle)`:

| Bone(s) | +X | +Y | +Z |
| --- | --- | --- | --- |
| spine_*, neck_*, head | nose up | twist | turn to the dog's left |
| jaw | close (−X opens) | – | – |
| tail_* (points backward) | tail **down** | twist | swing to the dog's left (wag) |
| legs (upperarm, forearm, paw_front, thigh, shin, hock, paw_hind) | swing forward | twist | – |
| ear_L / ear_R (and *_tip) | tip forward | twist | ear_L: tip towards the midline. ear_R: tip outward (mirrored) |

**Meshes.** All are skinned to `DogRig`, and all carry the same 10 morph targets:

| Mesh | Material | Notes |
| --- | --- | --- |
| `DogBody` | `Coat` | about 10.4k triangles, smooth normals, no UVs. Contains a real lip slit for the jaw |
| `Eyes` | `Eye` | dark glossy iris/pupil |
| `EyeShine` | `EyeShine` | emissive white catch-lights |
| `Nose` | `Nose` | |
| `Mouth` | `Mouth` | dark lining of the lip slit, which also reads as a dark lip line |
| `Tongue` | `Tongue` | on the jaw |
| `Ear_Prick`, `Ear_Drop`, `Ear_Semi` | `Coat` | show one |
| `Fluff_Chest`, `Fluff_Neck`, `Fluff_Tail`, `Fluff_Legs`, `Fluff_Ears` | `Coat` | long-coat extras. `Fluff_Ears` is shaped for `Ear_Drop` |
| `Beard` | `Coat` | moustache, chin beard and brows |

The rest pose has the mouth slightly open, about 4° (a soft "smile" with the tongue visible).
Rotate `jaw` by about +0.06 rad (local X) to close it fully, or negative to open it further.

**Morph targets (0..1, relative to the base):** `legs_long`, `legs_short`, `body_long`,
`body_short`, `chest_deep`, `muzzle_long`, `muzzle_short`, `head_wide`, `stocky`, `slim`.

- **Set the same influences on every mesh.** Fluff, ears, eyes and nose all carry matching
  targets so they follow the body. A typical way is to traverse the model and, for each mesh,
  look up `mesh.morphTargetDictionary[name]` and set that index in `mesh.morphTargetInfluences`.
- `legs_long` raises the body by 0.10 m and `legs_short` lowers it by 0.115 m, with the paws
  staying on the ground. `body_long` is +0.10 m and `body_short` is −0.075 m.
- **Optional rig correction.** The extras on the `DogRig` node hold `dogMorphBoneOffsets`, a JSON
  string with the shape `{morph: {bone: [dx, dy, dz]}}`. Each entry is the change in that bone's
  rest translation (in its parent's local frame) at morph weight 1. Adding
  `offset * weight` to `bone.position` moves the joints to match the morphed mesh, so bends happen
  in the right place. Because `spine_01` has a translation track, add its offset after
  `mixer.update()` each frame. The other bones can be offset once.
- **Limitation:** the clips are authored for base proportions. With strong leg-length morphs, the
  ground contact in `Sit`, `Down` and `PlayBow` can be off by up to the morph delta, either
  floating or sinking. You can compensate by offsetting the model vertically, or cap the leg morphs
  at about 0.6.

**Animations:**

| Clip | Frames | Duration | Notes |
| --- | --- | --- | --- |
| `Idle` | 90 | 3.0 s | loop |
| `Walk` | 32 | 1.07 s | loop, 4-beat lateral sequence |
| `Trot` | 20 | 0.67 s | loop, diagonal pairs |
| `Gallop` | 16 | 0.53 s | loop, rotary with spine flex/extension |
| `Sniff` | 60 | 2.0 s | loop, slow walk with nose about 5 cm off the ground |
| `Sit` | 60 | 2.0 s | loop, breathing |
| `Down` | 60 | 2.0 s | loop, sphinx |
| `Crouch` | 60 | 2.0 s | loop, stalk |
| `Eat` | 48 | 1.6 s | loop, chewing jaw |
| `PlayBow` | 40 | 1.33 s | loop, elbows on the ground |
| `Shake` | 36 | 1.2 s | one-shot |
| `LookUp` | 60 | 2.0 s | loop, sitting and looking up |

Tail and ear bones stay near neutral in every clip except `Shake` (small flaps), so you can layer
procedural wag and ear poses on top after `mixer.update()`.

**Ground speed of the locomotion clips at timeScale 1.** Set
`action.timeScale = speed / naturalSpeed` to stop the feet sliding.

| Clip | Distance per cycle | Natural speed |
| --- | --- | --- |
| `Walk` | 0.344 m | 0.32 m/s |
| `Trot` | 0.714 m | 1.07 m/s |
| `Gallop` | 1.47 m | 2.75 m/s |
| `Sniff` | 0.139 m | 0.07 m/s |

## PERSON contract (`person.glb`)

**Size:** about 1.72 m tall. The skin top is at 1.707 m, the hair at 1.74 m and the cap at 1.76 m.
The rest pose is a relaxed A-pose.

**Bones (20):** `root`, `hips`, `spine`, `chest`, `neck`, `head`, `shoulder_L/R`, `upperarm_L/R`,
`forearm_L/R`, `hand_L/R`, `thigh_L/R`, `shin_L/R`, `foot_L/R`.

**Bone-local rotation directions (checked in three.js):**

- spine, chest, neck and head: +X leans back, +Y turns to the person's left, +Z leans to the
  person's left.
- upperarm_R: +X swings the arm forward/up, and +Z brings it in towards the body. upperarm_L: +Z
  raises it outward (the Z sense is mirrored between sides).
- thigh: +X swings the leg forward. shin: +X extends the knee, so a knee bend is −X.

**Meshes.** All are skinned to `PersonRig`, with one material each and no morphs:

| Mesh | Material | Notes |
| --- | --- | --- |
| `Body` | `Skin` | only the visible skin: head, neck and mitten hands with thumbs |
| `Eyes` | `Eye` | |
| `EyeShine` | `EyeShine` | |
| `Brows` | `Hair` | recolours with the hair |
| `Mouth` | `Mouth` | small smile line |
| `Shirt` | `Shirt` | visible in the V and at the collar |
| `Jacket` | `Jacket` | |
| `Trousers` | `Trousers` | |
| `Boots` | `Boots` | |
| `Hair_Short` | `Hair` | variant |
| `Hair_Long` | `Hair` | variant, tied back in a low bun |
| `Cap_Flat` | `Cap` | variant, sized to sit over `Hair_Short` |
| `Coat_Long` | `CoatLong` | variant, white helper coat over the jacket |

Recolour a character by setting `material.color` on these materials. A suggested default is all
meshes visible except `Hair_Long`, `Cap_Flat` and `Coat_Long`.

**Animations:**

| Clip | Frames | Duration | Notes |
| --- | --- | --- | --- |
| `Idle` | 120 | 4.0 s | loop |
| `Walk` | 32 | 1.07 s | loop. 0.93 m per cycle, 0.875 m/s |
| `Run` | 20 | 0.67 s | loop. 2.17 m per cycle, 3.25 m/s |
| `Whistle` | 30 | 1.0 s | one-shot. Right hand to mouth |
| `CastLeft` | 40 | 1.33 s | one-shot. Arm out and held from about 0.3 s to 1.05 s |
| `CastRight` | 40 | 1.33 s | one-shot. Mirror of `CastLeft` |
| `CastBack` | 40 | 1.33 s | one-shot. Right arm straight up |
| `Send` | 30 | 1.0 s | one-shot. Right arm sweeps from behind to forward-low, with a lean |
| `Throw` | 36 | 1.2 s | one-shot overarm. Wind-up at about 0.36 s, release at about 0.6 s |
| `Call` | 40 | 1.33 s | loop. Pats the right thigh twice |
| `Kneel` | 60 | 2.0 s | loop, held. Right knee down, right hand reaching forward-low to pet or feed |
| `Point` | 40 | 1.33 s | one-shot, held in the middle. Right arm points forward |
| `Wave` | 30 | 1.0 s | loop |
| `Talk` | 90 | 3.0 s | loop |
| `Clap` | 24 | 0.8 s | loop, two claps |

## Known limitations

- **Surface finish.** The surfaces are matte-smooth with no textures or UVs. Markings and colour
  come from the game's shaders and material colours. The fluff is stylised solid locks, not cards
  or strands.
- **Dog face.** There are no facial morphs and no blink. The eyes are fixed glossy spheres, and
  the catch-lights are attached to the head rather than following the camera.
- **Person hands.** The hands are mittens with a thumb and no fingers, so `Point` reads from the
  whole arm.
- **Person cloth.** `Coat_Long` hangs from blended hip and thigh weights, so its skirt stretches
  between the legs in big strides. There is no cloth simulation.
- **Dog morphs.** These are mesh deformations. Bone offsets are only provided as optional extras
  data (see above), and the clips do not retarget to morphed proportions.
- **Ground contact.** The dog's paws can sink up to about 4 mm into the ground in a few frames
  (heel roll in `Sniff`, `Shake`, `Sit`, `PlayBow`), and the person's boots up to about 13 mm at
  the walk's heel and toe roll.
- **File size.** `dog.glb` is about 3.9 MB, mostly morph targets with morph normals on 15 meshes.
  If size matters, enable Draco or meshopt compression at export, or set `export_morph_normal=False`.
- **Hair contract.** The flat cap fits over `Hair_Short` only. Show `Hair_Long` without the cap.

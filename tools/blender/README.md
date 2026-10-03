# Character pipeline (Blender 5, scripted)

These scripts build the stylized dog and person characters as rigged, animated glTF
binaries for the React Three Fiber game. They need no add-ons, textures or downloaded assets.

| Output | Script | Blender source |
| --- | --- | --- |
| `public/models/dog.glb` | `build_dog.py` (+ `dog_shape.py`) | `art/blender/dog.blend` |
| `public/models/person.glb` | `build_person.py` (+ `person_shape.py`) | `art/blender/person.blend` |
| `.browser.local/blender/dog_sheet.png`, `person_sheet.png` | `render_sheet.py` (+ `person_panels.py`) | renders the exported GLB |
| `public/models/props.glb` (static environment props) | `build_props.py` (+ `prop_lib.py`, `props_arch.py`, `props_small.py`, `props_nature.py`) | `art/blender/props.blend` |
| `.browser.local/blender/props_sheet.png`, `props_yard.png` | `render_props.py` | renders the exported GLB |

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

## PROPS contract (`props.glb`)

Static environment art in the same soft, rounded style as the characters: bevelled hard-surface
parts (houses, fences, signs) built with bmesh, plus organic parts (trees, hedges, rocks, the van
body) from the same SDF + surface-nets pipeline as the characters. No rigs, no animation, no
image textures, flat-colour materials only.

```
"C:\Program Files\Blender Foundation\Blender 5.0\blender.exe" --background --python tools/blender/build_props.py
"C:\Program Files\Blender Foundation\Blender 5.0\blender.exe" --background --python tools/blender/render_props.py
"C:\Program Files\Blender Foundation\Blender 5.0\blender.exe" --background --python tools/blender/check_coplanar.py
node tools/blender/check_props.mjs public/models/props.glb
npx --yes @gltf-transform/cli@4 meshopt public/models/props.glb public/models/props.opt.glb
```

The game loads the compressed file. After the meshopt step, move the uncompressed build out of
`public/` and rename the compressed one (from Git Bash):
`mv public/models/props.glb .browser.local/blender/props_raw.glb && mv public/models/props.opt.glb public/models/props.glb`.
Places are laid out in `src/render/world/PropWorld.tsx`.

The build takes about 15 s and the sheet about 40 s. `build_props.py -- Farmhouse,Van` builds only
those props into `.browser.local/blender/props_partial.glb` (render it with
`render_props.py -- @partial Farmhouse,Van`). `render_props.py -- yard` renders only the composed yard
(`props_yard.png`, 1440×900, with the person and dog for scale). The sheet paints a test texture
("WILLOW KENNELS" plus a red arrow at the left) onto `SignFace` and `NamePlate1` so you can check
the UV orientation. `check_coplanar.py` lists visible coplanar overlapping faces (z-fighting risk). The
faces it still reports are pressed against walls or below the ground.

**Structure.** Each prop is a **top-level empty node** with exactly the name below and an identity
transform. It has one child mesh node `<Name>_Mesh`, which has an identity transform in the
uncompressed file and one primitive per material. In three.js the node is an `Object3D` whose child is
a `Group` of `Mesh`es, so use `traverse` to reach materials. The wrapper keeps the top node clean
after meshopt/quantization, which writes a dequantization scale and offset onto `<Name>_Mesh`. Clone
the top node and set its position and rotation, and leave the child's transform alone.

**Frame.** Units are metres and the files are Y-up. Each origin is on the ground (y = 0) at the
centre of the footprint, except `Dummy`, whose origin is at its centre. The front (door or sign side)
faces **+Z**. Bases sink 5–10 cm below y = 0 so the props sit on uneven ground. All sizes below are
measured three.js bounds (x × y × z), including roof overhangs, steps and gutters.

| Node | Tris | Size x × y × z (m) | Notes |
| --- | --- | --- | --- |
| `Farmhouse` | 5664 | 11.55 × 9.9 × 7.59 | Walls are 10.6 × 6.2, so they run x ±5.3, z ±3.1. The eaves are at 4.95, the ridge is at about 8.4 and the chimney top is at 9.8. The door is centred on +Z. The front step and door hood reach z = +3.89, and the back gutter reaches −3.71 |
| `KennelBlock` | 5548 | 15.75 × 6.15 × 8.39 | See the kennel offsets below |
| `PantryShed` | 2816 | 3.22 × 2.75 × 4.15 | Walls run x ±1.35 and z −1.85…+1.35. The roof covers z ±2.0. The barrel and sacks stand under the front overhang (z +1.4…+2.0) |
| `Van` | 5806 | 2.22 × 2.57 × 4.95 | The bonnet faces +Z. The body is about 1.95 × 4.6, and the mirrors and bumpers make up the rest |
| `Noticeboard` | 1128 | 2.18 × 2.39 × 0.84 | |
| `GateSign` | 1368 | 4.10 × 3.08 × 0.32 | Posts at x = ±1.85 |
| `FieldGate` | 1716 | 3.78 × 3.29 × 2.77 | The pillars' inner faces are at x = ±1.19 (2.4 m opening). The open five-bar gate is hinged on the left pillar and swung 85° into −Z, where it occupies about x −1.25…−0.95, z −2.38…0 |
| `FenceSection` | 312 | 3.17 × 1.18 × 0.17 | Posts at x = −1.5, 0 and +1.5. Tile at a 3.0 m pitch: the end posts coincide exactly |
| `HedgeSection` | 2400 | 5.01 × 1.91 × 2.03 | Tile at a 5.0 m pitch |
| `TreeOak` | 3900 | 7.07 × 8.73 × 6.60 | Trunk radius about 0.45 at the base |
| `TreeOak2` | 3504 | 5.89 × 8.97 × 4.40 | Leaning, with a twin-lobed canopy. The trunk base is at the origin |
| `TreeApple` | 3449 | 3.95 × 4.32 × 4.07 | 10 apples: `Apple` ×6 and `AppleYellow` ×4 |
| `TreePine` | 3100 | 3.78 × 6.10 × 3.84 | |
| `Bush` | 1300 | 1.35 × 1.11 × 1.29 | |
| `FlowerClump` | 1362 | 0.51 × 0.63 × 0.57 | |
| `Rock` | 1350 | 1.18 × 0.82 × 0.95 | |
| `TallGrassClump` | 1064 | 1.26 × 1.09 × 1.34 | |
| `Cottage` | 5570 | 8.25 × 7.05 × 6.01 | Walls run x ±3.75, z ±2.4. The door and climbing roses are on +Z |
| `RescueBuilding` | 5244 | 22.45 × 6.02 × 7.68 | Walls run x ±10.8, z ±3.2. The false front, doors and sign are at x ±4.0, z +3.2…+3.5. The landing and canopy reach z +3.96 |
| `Tent` | 2228 | 4.06 × 3.80 × 3.25 | Open on +Z |
| `Bench` | 1196 | 1.81 × 0.97 × 0.62 | The seat faces +Z |
| `Dummy` | 688 | 0.53 × 0.10 × 0.10 | The **origin is at the canvas centre**. The canvas runs x ±0.2 and the rope toggle extends to x = +0.33 |
| `ScentBox` | 992 | 0.64 × 0.36 × 0.46 | |
| `FoodBowl` | 576 | 0.60 × 0.18 × 0.60 | `BowlBody` |
| `WaterBowl` | 700 | 0.60 × 0.18 × 0.60 | `WaterBowlBody`, plus a `Water` disc at y ≈ 0.13 (hide it for an empty bowl) |
| `Bales` | 644 | 1.26 × 0.86 × 0.63 | |

**KennelBlock offsets.** The origin is the centre of the building only.

- Building walls: x −7.5…+7.5 and z −2.25…+2.25, with the front wall plane at **z = +2.25**. The roof
  overhangs to z = +3.0 at the front (eave height 2.95) and to −2.72 at the back.
- Runs: x −7.5…+7.5 and **z +2.25…+5.65** (3.4 m). The concrete floor top is at y = 0.09. Brick
  low walls with railings divide the runs at x = −7.39, −5, −2.5, 0, 2.5, 5 and +7.39. The front
  railings and gates are in the plane z ≈ +5.59, and the railings are 1.88 m tall.
- Bay i (0…5, numbered left to right as seen from the front, i.e. from −X to +X) is centred at
  **x = −6.25 + 2.5·i**. Its run door (0.95 × 1.9) is in the front wall at that x. The run gate (1.0 m)
  is centred at the same x, except in the end bays, where it is about 5 cm further inwards.
- Collision suggestion: box 15 × 4.5 centred at the origin, plus box 15 × 3.4 centred at z = +3.95.
  The six `NamePlate<i>` boards are described below.

**Sign faces.** All are unbevelled quads with UVs spanning exactly 0..1. Their aspect ratio is the
quad's. In glTF convention v = 0 is at the **top**, so for a `CanvasTexture` set
`texture.flipY = false` (as GLTFLoader does) and the canvas draws upright. The back faces have their
own 0..1 UVs, mirrored so they read correctly from behind as well. `SignFace` is **one shared
material** across three props: clone it per instance before assigning a different map to each.

| Prop | Material | Quad (three.js) | Size, aspect |
| --- | --- | --- | --- |
| `GateSign` | `SignFace` front and back | x −1.5…1.5, y 0.95…1.85, z = ±0.035 | 3.0 × 0.9, 3.33 : 1 |
| `FieldGate` | `SignFace` front and back | x −1.43…1.43, y 2.52…2.98, z = ±0.035 | 2.86 × 0.46, 6.2 : 1 |
| `RescueBuilding` | `SignFace` front only | x −3.5…3.5, y 3.15…4.75, z = +3.58 | 7.0 × 1.6, 4.375 : 1 |
| `KennelBlock` | `NamePlate1`…`NamePlate6`, one material per bay | x = bay centre ±0.4, y 2.22…2.44, z = +2.31 | 0.8 × 0.22, 3.64 : 1 |

**Recolourable materials** (set `material.color`): `TentStripeA` and `TentStripeB` on the tent
canopy, walls and valance; `VanBody` and `VanCream`; `DoorGreen`, `DoorBlue`, `ShutterGreen`,
`ShutterBlue` and `RescueTeal`; `BowlBody` and `WaterBowlBody`; and `DummyCanvas` and `DummyBand`.
Materials are shared by name across props, so `Timber` is one material everywhere.

**Size.** The whole file has 26 props and about 63.6k triangles. `props.glb` is about 2.0 MB.
`props.opt.glb` (meshopt plus quantization) is about 0.62 MB and needs `MeshoptDecoder` on the
GLTFLoader. After compression the top-level nodes keep identity transforms and every sign UV
attribute is still present, though TEXCOORD_0 stays float.

**Known limitations (props).**

- Canopies, hedges and the bush are smooth blobs with separate highlight and shade clumps. There
  are no leaf cards and the canopy has no wind animation.
- Windows and doors are raised details on solid walls. There are no interiors or openings, and
  the kennel run doors cannot open.
- The roofs use stepped rows of slabs. Seen very close, the row ends at the gables overlap each other
  in the same plane under the barge boards, and the door hoods have the same overlap against the
  wall. Neither shows in normal views.
- Rose and flower blooms are simple spheres and scalloped discs.
- The Cycles preview uses a sun and sky. three.js lighting and tone mapping will look different, so
  check the colours in-game.

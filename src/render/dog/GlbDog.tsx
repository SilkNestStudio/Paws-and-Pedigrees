import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Dog } from '../../core/dog/dog';
import { bodyOf, coatOf } from '../../core/dog/dog';
import type { BodyShape } from '../../core/genetics/body';
import { damp, wrapAngle } from '../../core/math';
import { createCoatMaterial } from './coatMaterial';
import { coatMask, type MaskDims, type Part } from './buildDog';
import { DOG_DRAW_SCALE, type DogView } from './DogModel';
import { heightAt } from '../world/terrain';

/**
 * The Blender-made dog (public/models/dog.glb). One rigged mesh, shaped per
 * dog by morph targets from its genes, painted by the genetic coat shader,
 * animated by clips chosen from the simulation's speed and pose, with tail,
 * ears and head driven on top by the dog's body-language tells.
 */
export const DOG_URL = '/models/dog.glb';
useGLTF.preload(DOG_URL);

/** Ground speed (m/s) of each locomotion clip at normal speed and size. */
const CLIP_SPEED = { Walk: 0.32, Trot: 1.07, Gallop: 2.75 } as const;
const FADE = 0.3;

type ClipName = 'Idle' | 'Walk' | 'Trot' | 'Gallop' | 'Sniff' | 'Sit' | 'Down' | 'Crouch' | 'Eat';

function partForBone(name: string): Part {
  if (name.startsWith('ear')) return 'ear';
  if (name === 'tail_05') return 'tailTip';
  if (name.startsWith('tail')) return 'tail';
  if (name.startsWith('paw')) return 'paw';
  if (/upperarm|forearm|thigh|shin|hock/.test(name)) return 'leg';
  if (name.startsWith('neck')) return 'neck';
  if (name === 'head' || name === 'jaw') return 'skull';
  if (name === 'spine_03') return 'chest';
  if (name === 'spine_02') return 'torso';
  return 'hip';
}

/**
 * Adds the coat attributes to the shared geometries once: rest position and
 * region masks, using each vertex's main bone to know which body part it is.
 */
function prepareGeometries(scene: THREE.Object3D): void {
  const meshes: THREE.SkinnedMesh[] = [];
  scene.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (m.isSkinnedMesh && (m.material as THREE.Material).name === 'Coat') meshes.push(m);
  });
  if (meshes.length === 0 || meshes[0]!.geometry.getAttribute('aMask')) return;

  const body = meshes.find((m) => m.name === 'DogBody') ?? meshes[0]!;
  const bones = body.skeleton.bones.map((b) => b.name);

  // Real rest-pose positions in metres, through the skeleton. (Compressed
  // models store vertices in a packed, scaled form, so raw positions won't do.)
  scene.updateMatrixWorld(true);
  const restOf = new Map<THREE.BufferGeometry, Float32Array>();
  for (const mesh of meshes) {
    if (restOf.has(mesh.geometry)) continue;
    restOf.set(mesh.geometry, skinnedRest(mesh));
  }
  const dominant = (geo: THREE.BufferGeometry, i: number) => {
    const idx = geo.getAttribute('skinIndex') as THREE.BufferAttribute;
    const w = geo.getAttribute('skinWeight') as THREE.BufferAttribute;
    let best = 0;
    for (let k = 1; k < 4; k++) if (w.getComponent(i, k) > w.getComponent(i, best)) best = k;
    return bones[idx.getComponent(i, best)] ?? 'spine_01';
  };

  // Measure the body from its own vertices so the masks fit the model.
  const bodyRest = restOf.get(body.geometry)!;
  const count = bodyRest.length / 3;
  const v = new THREE.Vector3();
  let chestMin = Infinity;
  let chestMax = -Infinity;
  let chestZ = 0;
  let chestN = 0;
  const head = new THREE.Vector3();
  let headN = 0;
  let headMinY = Infinity;
  let headMaxY = -Infinity;
  let shoulderY = 0;
  let shoulderN = 0;
  for (let i = 0; i < count; i++) {
    v.fromArray(bodyRest, i * 3);
    const bone = dominant(body.geometry, i);
    if (bone === 'spine_03' || bone === 'spine_02') {
      chestMin = Math.min(chestMin, v.y);
      chestMax = Math.max(chestMax, v.y);
      if (bone === 'spine_03') {
        chestZ += v.z;
        chestN++;
      }
    } else if (bone === 'head') {
      head.add(v);
      headN++;
      headMinY = Math.min(headMinY, v.y);
      headMaxY = Math.max(headMaxY, v.y);
    } else if (bone.startsWith('upperarm')) {
      shoulderY += v.y;
      shoulderN++;
    }
  }
  head.divideScalar(Math.max(1, headN));
  const dims: MaskDims = {
    torsoY: (chestMin + chestMax) / 2,
    chestR: (chestMax - chestMin) / 2,
    chestZ: chestZ / Math.max(1, chestN),
    jointY: shoulderY / Math.max(1, shoulderN),
    skull: (headMaxY - headMinY) / 2,
  };

  const done = new Set<THREE.BufferGeometry>();
  const out = [0, 0, 0, 0];
  for (const mesh of meshes) {
    const geo = mesh.geometry;
    if (done.has(geo)) continue;
    done.add(geo);
    const rest = restOf.get(geo)!;
    const n = rest.length / 3;
    const mask = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      v.fromArray(rest, i * 3);
      let kind = partForBone(dominant(geo, i));
      if (kind === 'skull' && v.z > head.z + dims.skull * 0.55 && v.y < head.y + dims.skull * 0.15)
        kind = 'muzzle';
      if (mesh.name === 'Beard') kind = 'muzzle';
      if (mesh.name === 'Fluff_Chest' || mesh.name === 'Fluff_Neck') kind = 'ruff';
      coatMask(v, kind, dims, head, out);
      mask.set(out, i * 4);
    }
    geo.setAttribute('aRest', new THREE.BufferAttribute(rest, 3));
    geo.setAttribute('aMask', new THREE.BufferAttribute(mask, 4));
  }
}

/** Each vertex's position in the rest pose, computed through its bones. */
function skinnedRest(mesh: THREE.SkinnedMesh): Float32Array {
  const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
  const out = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    mesh.applyBoneTransform(i, v);
    v.applyMatrix4(mesh.matrixWorld);
    v.toArray(out, i * 3);
  }
  return out;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Morph influences from the dog's genetic body shape. */
function morphsFor(b: BodyShape): Record<string, number> {
  return {
    legs_long: clamp01((b.legRatio - 0.52) / 0.1),
    legs_short: clamp01((0.52 - b.legRatio) / 0.1),
    body_long: clamp01((b.bodyRatio - 1.12) / 0.23),
    body_short: clamp01((1.12 - b.bodyRatio) / 0.17),
    chest_deep: clamp01((b.chestDepth - 0.5) / 0.45),
    muzzle_long: clamp01((b.muzzle - 0.85) / 0.4),
    muzzle_short: clamp01((0.85 - b.muzzle) / 0.5),
    head_wide: clamp01((b.headWidth - 1) / 0.25),
    stocky: clamp01((b.headWidth - 1) / 0.25 + (b.chestDepth - 0.5)) * 0.7,
    slim: clamp01((1 - b.headWidth) / 0.18) * 0.7,
  };
}

interface Rig {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  actions: Partial<Record<ClipName, THREE.AnimationAction>>;
  bones: Record<string, THREE.Bone>;
  mouth: THREE.Object3D;
  dummy: THREE.Object3D;
  ball: THREE.Object3D;
  scale: number;
  dispose: () => void;
}

function buildRig(
  gltf: { scene: THREE.Object3D; animations: THREE.AnimationClip[] },
  dog: Dog,
): Rig {
  prepareGeometries(gltf.scene);
  const body = bodyOf(dog);
  const coat = coatOf(dog);
  const root = cloneSkinned(gltf.scene);
  const material = createCoatMaterial(coat, 1);
  const disposables: { dispose(): void }[] = [material];
  const morphs = morphsFor(body);

  const earKind =
    body.earErect > 0.66 ? 'Ear_Prick' : body.earErect < 0.33 ? 'Ear_Drop' : 'Ear_Semi';
  const long = coat.length === 'long';
  root.traverse((o) => {
    const mesh = o as THREE.SkinnedMesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    const name = (mesh.material as THREE.Material).name;
    if (name === 'Coat') mesh.material = material;
    else if (name === 'Nose') {
      const m = (mesh.material as THREE.MeshStandardMaterial).clone();
      m.color.set(coat.nose);
      mesh.material = m;
      disposables.push(m);
    } else if (name === 'Eye') {
      const m = (mesh.material as THREE.MeshStandardMaterial).clone();
      m.color.set(coat.eye).lerp(new THREE.Color('#120a06'), 0.45);
      mesh.material = m;
      disposables.push(m);
    }
    if (mesh.name.startsWith('Ear_')) mesh.visible = mesh.name === earKind;
    if (mesh.name.startsWith('Fluff_'))
      mesh.visible = long && (mesh.name !== 'Fluff_Ears' || earKind === 'Ear_Drop');
    if (mesh.name === 'Beard') mesh.visible = coat.furnishings;
    if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
      for (const [key, index] of Object.entries(mesh.morphTargetDictionary)) {
        mesh.morphTargetInfluences[index] = morphs[key] ?? 0;
      }
    }
  });

  const bones: Record<string, THREE.Bone> = {};
  root.traverse((o) => {
    if ((o as THREE.Bone).isBone) bones[o.name] = o as THREE.Bone;
  });

  // Move joints to match the morphed proportions. The body's own height
  // change (spine_01) is already in the morphs, so it is not applied again.
  const rigNode = root.getObjectByName('DogRig') ?? root;
  const raw = (rigNode.userData.dogMorphBoneOffsets ?? root.userData.dogMorphBoneOffsets) as
    string | undefined;
  if (raw) {
    const table = JSON.parse(raw) as Record<string, Record<string, [number, number, number]>>;
    for (const [morph, offsets] of Object.entries(table)) {
      const w = morphs[morph] ?? 0;
      if (!w) continue;
      for (const [boneName, [x, y, z]] of Object.entries(offsets)) {
        if (boneName !== 'spine_01')
          bones[boneName]?.position.add(new THREE.Vector3(x, y, z).multiplyScalar(w));
      }
    }
  }

  // Mouth attachment for carried items: just under the nose, in head space.
  root.updateMatrixWorld(true);
  const nose = root.getObjectByName('Nose') as THREE.SkinnedMesh | undefined;
  const mouth = new THREE.Object3D();
  const headBone = bones.head ?? root;
  if (nose?.isSkinnedMesh) {
    const rest = skinnedRest(nose);
    const centre = new THREE.Vector3();
    for (let i = 0; i < rest.length; i += 3)
      centre.add(new THREE.Vector3(rest[i], rest[i + 1], rest[i + 2]));
    centre.divideScalar(rest.length / 3).add(new THREE.Vector3(0, -0.07, -0.06));
    mouth.position.copy(headBone.worldToLocal(centre));
  }
  headBone.add(mouth);
  const dummy = new THREE.Group();
  const d1 = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.035, 0.16, 4, 10),
    new THREE.MeshStandardMaterial({ color: '#f1ead6', roughness: 0.8 }),
  );
  d1.rotation.z = Math.PI / 2;
  const d2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.037, 0.037, 0.035, 10),
    new THREE.MeshStandardMaterial({ color: '#d5612f' }),
  );
  d2.rotation.z = Math.PI / 2;
  dummy.add(d1, d2);
  dummy.visible = false;
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 14, 10),
    new THREE.MeshStandardMaterial({ color: '#f0b429', roughness: 0.6 }),
  );
  ball.visible = false;
  mouth.add(dummy, ball);
  disposables.push(d1.geometry, d2.geometry, ball.geometry);

  const scale = (body.height / 0.5) * DOG_DRAW_SCALE;
  root.scale.setScalar(scale);

  const mixer = new THREE.AnimationMixer(root);
  const actions: Rig['actions'] = {};
  for (const clip of gltf.animations) {
    const action = mixer.clipAction(clip);
    actions[clip.name as ClipName] = action;
  }
  actions.Idle?.play();

  return {
    root,
    mixer,
    actions,
    bones,
    mouth,
    dummy,
    ball,
    scale,
    dispose: () => {
      mixer.stopAllAction();
      disposables.forEach((d) => d.dispose());
    },
  };
}

export function GlbDog({ dog, view }: { dog: Dog; view: () => DogView }) {
  const gltf = useGLTF(DOG_URL) as unknown as {
    scene: THREE.Object3D;
    animations: THREE.AnimationClip[];
  };
  // Rebuild only when the genes change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rig = useMemo(() => buildRig(gltf, dog), [gltf, dog.genome]);
  useEffect(() => () => rig.dispose(), [rig]);

  const state = useRef({
    clip: 'Idle' as ClipName,
    wag: 0,
    tailCarriage: 0,
    tailAmp: 0.4,
    ear: 0,
    flick: 0,
    yaw: 0,
    lastHeading: 0,
    lean: 0,
  });

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const v = view();
    const s = state.current;
    const { root, bones, actions, mixer } = rig;

    root.position.set(v.pos.x, v.groundY ?? heightAt(v.pos.x, v.pos.z), v.pos.z);
    const growth = v.growth ?? 1;
    root.scale.setScalar(rig.scale * growth);
    root.rotation.y = v.heading;
    const turn = wrapAngle(v.heading - s.lastHeading) / Math.max(dt, 1e-3);
    s.lastHeading = v.heading;
    s.lean += (Math.max(-0.2, Math.min(0.2, -turn * v.speed * 0.01)) - s.lean) * damp(6, dt);

    // Choose the clip from what the simulation says the dog is doing.
    const size = rig.scale * growth;
    let clip: ClipName = 'Idle';
    let timeScale = 1;
    if (v.pose === 'sit') clip = 'Sit';
    else if (v.pose === 'down') clip = 'Down';
    else if (v.pose === 'crouch') clip = 'Crouch';
    else if (v.tell.text.startsWith('Eating')) clip = 'Eat';
    else if (v.speed < 0.15) clip = v.tell.noseDown ? 'Sniff' : 'Idle';
    else if (v.tell.noseDown && v.speed < 2) {
      clip = 'Sniff';
      timeScale = Math.min(2.5, Math.max(0.6, v.speed / 0.6));
    } else {
      const rel = v.speed / size;
      clip = rel < 1.3 ? 'Walk' : rel < 4.2 ? 'Trot' : 'Gallop';
      const base = CLIP_SPEED[clip as keyof typeof CLIP_SPEED];
      timeScale = Math.min(
        2.6,
        Math.max(
          0.6,
          v.speed / (base * size * (clip === 'Walk' ? 3.5 : clip === 'Trot' ? 2.2 : 1.4)),
        ),
      );
    }
    if (clip !== s.clip) {
      const next = actions[clip];
      const prev = actions[s.clip];
      if (next) {
        next.reset().setEffectiveWeight(1).fadeIn(FADE).play();
        prev?.fadeOut(FADE);
        s.clip = clip;
      }
    }
    const current = actions[s.clip];
    if (current) current.timeScale = timeScale;
    mixer.update(dt);

    // Layer body language on top of the clip.
    if (bones.spine_01) bones.spine_01.rotateZ(s.lean * 0.5);

    // Turn the head toward what the dog is watching, but only within reach:
    // nothing right under its nose (the angle is meaningless there) and
    // nothing behind it (the angle flips sides as it passes behind).
    let yaw = 0;
    if (v.lookAt) {
      const dx = v.lookAt.x - v.pos.x;
      const dz = v.lookAt.z - v.pos.z;
      const rel = wrapAngle(Math.atan2(dx, dz) - v.heading);
      const behind = Math.max(0, Math.min(1, (Math.abs(rel) - 1.3) / 0.9));
      const near = Math.max(0, Math.min(1, (Math.hypot(dx, dz) - 0.8) / 0.8));
      yaw = Math.max(-1, Math.min(1, rel)) * (1 - behind) * near;
    }
    s.yaw += (yaw - s.yaw) * damp(4, dt);
    bones.neck_02?.rotateZ(s.yaw * 0.45);
    bones.head?.rotateZ(s.yaw * 0.4);

    const carriage = { high: -0.7, wag: -0.2, low: 0.6, neutral: 0 }[v.tell.tail];
    const amp = { high: 0.25, wag: 0.55, low: 0.15, neutral: 0.25 }[v.tell.tail];
    const rate = { high: 11, wag: 7.5, low: 2.5, neutral: 4 }[v.tell.tail];
    const running = Math.min(1, v.speed / (3 * size));
    s.tailCarriage += (carriage * (1 - running * 0.5) - s.tailCarriage) * damp(5, dt);
    s.tailAmp += (amp * (1 - running * 0.6) - s.tailAmp) * damp(5, dt);
    s.wag += dt * rate;
    for (let i = 1; i <= 5; i++) {
      const b = bones[`tail_0${i}`];
      if (!b) continue;
      if (i === 1) b.rotateX(s.tailCarriage);
      b.rotateZ(Math.sin(s.wag - i * 0.6) * s.tailAmp * (0.35 + i * 0.1));
    }

    const earTarget = v.tell.ears === 'forward' ? 0.3 : v.tell.ears === 'back' ? -0.55 : 0;
    s.ear += (earTarget - s.ear) * damp(8, dt);
    if (v.tell.ears === 'flick') s.flick = 1;
    s.flick = Math.max(0, s.flick - dt * 2.5);
    const flick = Math.sin(s.flick * 40) * s.flick * 0.3;
    bones.ear_L?.rotateX(s.ear + flick);
    bones.ear_R?.rotateX(s.ear - flick);

    rig.dummy.visible = v.carrying === 'dummy';
    rig.ball.visible = v.carrying === 'ball';
  });

  return <primitive object={rig.root} />;
}

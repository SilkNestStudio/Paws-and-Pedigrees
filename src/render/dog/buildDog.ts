import * as THREE from 'three';
import type { BodyShape } from '../../core/genetics/body';
import type { CoatAppearance } from '../../core/genetics/coat';
import { createCoatMaterial, type CoatMaterial } from './coatMaterial';

/**
 * Builds a stylised 3D dog from its genetic body shape and coat. The dog faces
 * +z with its root on the ground under the middle of the body. Parts are
 * arranged in pivots so the renderer can animate gait, poses, ears and tail.
 */
export interface DogRig {
  root: THREE.Group;
  /** Pivot at the hips: pitches up to sit, drops to lie down. */
  body: THREE.Group;
  neck: THREE.Group;
  head: THREE.Group;
  ears: THREE.Group[];
  tail: THREE.Group[];
  legs: DogLeg[];
  /** Attach point for a carried dummy or ball. */
  mouth: THREE.Group;
  dims: DogDims;
  material: CoatMaterial;
  dispose: () => void;
}

export interface DogLeg {
  upper: THREE.Group;
  lower: THREE.Group;
  front: boolean;
  side: 1 | -1;
  restUpper: number;
  restLower: number;
}

export interface DogDims {
  height: number;
  jointY: number;
  bodyLen: number;
  chestR: number;
  hipR: number;
  torsoY: number;
  chestZ: number;
  hipZ: number;
  skull: number;
  /** Stride length used to sync legs with ground speed. */
  stride: number;
  earErect: number;
}

export type Part =
  | 'torso'
  | 'chest'
  | 'hip'
  | 'neck'
  | 'skull'
  | 'muzzle'
  | 'ear'
  | 'leg'
  | 'paw'
  | 'tail'
  | 'tailTip'
  | 'ruff';

interface Painted {
  mesh: THREE.Mesh;
  part: Part;
}

const HEAD_SCALE = 1.55;
/** Forward lean of the neck at rest (radians); the head counter-rotates to stay level. */
export const NECK_LEAN = 0.6;

export function buildDog(body: BodyShape, coat: CoatAppearance): DogRig {
  const H = body.height;
  const legFraction = body.legRatio;
  // Cartoon proportions: a deeper chest and shorter, sturdier legs than a real dog.
  const chestDepth = H * (1 - legFraction) * (1.12 + body.chestDepth * 0.25);
  const chestR = chestDepth * 0.55;
  const hipR = chestR * 0.86;
  const torsoY = H - chestR * 0.95;
  const jointY = torsoY - chestR * 0.25;
  const bodyLen = H * body.bodyRatio;
  const chestZ = bodyLen * 0.28;
  const hipZ = -bodyLen * 0.3;
  const sk = H * 0.15 * HEAD_SCALE;
  const legR = H * 0.072 * (body.headWidth * 0.3 + 0.75);
  const long = coat.length === 'long';
  const curly = coat.curl > 0;

  const material = createCoatMaterial(coat, H / 0.5);
  const painted: Painted[] = [];
  const disposables: { dispose: () => void }[] = [material];

  const fur = (geometry: THREE.BufferGeometry, part: Part, parent: THREE.Object3D) => {
    disposables.push(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    painted.push({ mesh, part });
    return mesh;
  };

  const plain = (
    geometry: THREE.BufferGeometry,
    colour: string,
    parent: THREE.Object3D,
    roughness = 0.5,
  ) => {
    const m = new THREE.MeshStandardMaterial({ color: colour, roughness });
    disposables.push(geometry, m);
    const mesh = new THREE.Mesh(geometry, m);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const root = new THREE.Group();
  root.name = 'dog';

  // Hip pivot: everything above the hind legs rotates around it when sitting.
  const bodyPivot = new THREE.Group();
  bodyPivot.position.set(0, jointY, hipZ);
  root.add(bodyPivot);
  const torso = new THREE.Group();
  torso.position.set(0, -jointY, -hipZ);
  bodyPivot.add(torso);

  // Torso: a capsule from hips to chest, with a deeper chest and rounded rump.
  const fluff = long ? 1.06 : curly ? 1.08 : 1;
  const midR = ((chestR + hipR) / 2) * 0.98 * fluff;
  const trunk = fur(new THREE.CapsuleGeometry(midR, chestZ - hipZ, 8, 20), 'torso', torso);
  trunk.rotation.x = Math.PI / 2;
  trunk.position.set(0, torsoY, (chestZ + hipZ) / 2);
  trunk.scale.set(0.92, 1, 0.94);
  const chest = fur(new THREE.SphereGeometry(chestR * 0.97 * fluff, 24, 18), 'chest', torso);
  chest.position.set(0, torsoY - chestR * 0.08, chestZ);
  chest.scale.set(0.9, 1.05, 1);
  const rump = fur(new THREE.SphereGeometry(hipR * fluff, 22, 16), 'hip', torso);
  rump.position.set(0, torsoY + hipR * 0.08, hipZ);
  rump.scale.set(0.95, 0.98, 1);
  if (long) {
    const ruff = fur(new THREE.SphereGeometry(chestR * 0.75, 18, 14), 'ruff', torso);
    ruff.position.set(0, torsoY - chestR * 0.35, chestZ + chestR * 0.55);
    ruff.scale.set(0.9, 1.15, 0.8);
  }

  // Neck and head.
  const neck = new THREE.Group();
  neck.position.set(0, torsoY + chestR * 0.35, chestZ + chestR * 0.4);
  neck.rotation.x = NECK_LEAN;
  torso.add(neck);
  const neckLen = H * 0.24;
  const neckMesh = fur(
    new THREE.CapsuleGeometry(chestR * 0.62 * fluff, neckLen, 6, 16),
    'neck',
    neck,
  );
  neckMesh.position.set(0, neckLen * 0.5, 0);

  const head = new THREE.Group();
  head.position.set(0, neckLen, 0);
  head.rotation.x = -NECK_LEAN;
  neck.add(head);
  const hw = body.headWidth;
  const skull = fur(new THREE.SphereGeometry(sk, 26, 20), 'skull', head);
  skull.scale.set(hw * 0.95, 0.92, 1.02);
  skull.position.set(0, sk * 0.25, 0);

  const muzzleLen = sk * 1.05 * body.muzzle;
  const muzzleR = sk * (0.36 + (1.25 - body.muzzle) * 0.18);
  const muzzle = fur(
    new THREE.CapsuleGeometry(muzzleR, Math.max(0.01, muzzleLen - muzzleR), 6, 16),
    'muzzle',
    head,
  );
  muzzle.rotation.x = Math.PI / 2 - 0.12;
  muzzle.position.set(0, -sk * 0.05, sk * 0.55 + muzzleLen * 0.42);
  muzzle.scale.set(hw * 0.95, 1, 0.82);
  const noseTip = sk * 0.55 + muzzleLen * 0.42 + muzzleLen * 0.5;
  const nose = plain(new THREE.SphereGeometry(sk * 0.2, 14, 10), coat.nose, head, 0.3);
  nose.position.set(0, sk * 0.05, noseTip);
  nose.scale.set(1.15, 0.8, 0.8);

  // Big, friendly cartoon eyes with a highlight.
  for (const side of [1, -1] as const) {
    const eye = plain(new THREE.SphereGeometry(sk * 0.21, 16, 12), '#120c08', head, 0.15);
    eye.position.set(side * sk * 0.4 * hw, sk * 0.4, sk * 0.76);
    const iris = plain(new THREE.SphereGeometry(sk * 0.13, 14, 10), coat.eye, eye, 0.3);
    iris.position.set(0, 0, sk * 0.09);
    const pupil = plain(new THREE.SphereGeometry(sk * 0.075, 10, 8), '#050302', iris, 0.1);
    pupil.position.set(0, 0, sk * 0.06);
    const shine = plain(new THREE.SphereGeometry(sk * 0.045, 8, 6), '#ffffff', eye, 0.05);
    shine.position.set(side * -sk * 0.04, sk * 0.07, sk * 0.17);
    if (coat.furnishings) {
      const brow = fur(new THREE.SphereGeometry(sk * 0.17, 10, 8), 'skull', head);
      brow.position.set(side * sk * 0.38 * hw, sk * 0.58, sk * 0.68);
      brow.scale.set(1.2, 0.55, 0.8);
    }
  }
  if (coat.furnishings) {
    const beard = fur(new THREE.SphereGeometry(muzzleR * 1.05, 12, 10), 'muzzle', head);
    beard.position.set(0, -sk * 0.3, noseTip - muzzleLen * 0.35);
    beard.scale.set(1.1, 0.9, 1.2);
  }

  // Ears: from hanging flaps to pricked triangles, following the genes.
  const ears: THREE.Group[] = [];
  const earLen = sk * 1.15 * body.earSize * (long ? 1.25 : 1);
  for (const side of [1, -1] as const) {
    const ear = new THREE.Group();
    ear.position.set(side * sk * 0.58 * hw, sk * 0.72, -sk * 0.05);
    head.add(ear);
    const erect = body.earErect;
    const geometry =
      erect > 0.6
        ? new THREE.ConeGeometry(earLen * 0.5, earLen, 10, 1)
        : new THREE.SphereGeometry(earLen * 0.5, 14, 10);
    const flap = fur(geometry, 'ear', ear);
    flap.position.set(0, earLen * 0.45, 0);
    flap.scale.set(erect > 0.6 ? 1 : 0.62, erect > 0.6 ? 1 : 1.05, erect > 0.6 ? 0.38 : 0.24);
    ear.userData.rest = earRestAngle(erect) * side;
    ear.rotation.z = -(ear.userData.rest as number);
    ear.rotation.x = erect > 0.6 ? -0.15 : 0.2;
    ear.userData.side = side;
    ears.push(ear);
  }

  // Mouth attachment for carried items.
  const mouth = new THREE.Group();
  mouth.position.set(0, -sk * 0.3, noseTip - muzzleLen * 0.3);
  head.add(mouth);

  // Tail: a chain of segments that can wag, droop or curl over the back.
  const tail: THREE.Group[] = [];
  const segments = 5;
  const segLen = H * 0.09 * (curly ? 0.8 : 1);
  let parent: THREE.Object3D = torso;
  const tailBase = new THREE.Group();
  tailBase.position.set(0, torsoY + hipR * 0.4, hipZ - hipR * 0.8);
  torso.add(tailBase);
  parent = tailBase;
  for (let i = 0; i < segments; i++) {
    const seg = new THREE.Group();
    if (i > 0) seg.position.set(0, 0, -segLen);
    parent.add(seg);
    const plume = long ? 1 + Math.sin(((i + 0.5) / segments) * Math.PI) * 0.9 : 1;
    const r = H * 0.052 * (1 - i * 0.13) * plume;
    const piece = fur(
      new THREE.CapsuleGeometry(r, segLen * 0.75, 4, 10),
      i === segments - 1 ? 'tailTip' : 'tail',
      seg,
    );
    piece.rotation.x = Math.PI / 2;
    piece.position.set(0, 0, -segLen * 0.5);
    tail.push(seg);
    parent = seg;
  }
  tailBase.userData.baseCurl = body.tailCurl;

  // Legs. Upper pivots at shoulder or hip; lower pivots at elbow or knee.
  const legs: DogLeg[] = [];
  for (const front of [true, false]) {
    for (const side of [1, -1] as const) {
      const upperLen = jointY * (front ? 0.5 : 0.52);
      const lowerLen = jointY * (front ? 0.52 : 0.56);
      const upper = new THREE.Group();
      upper.position.set(
        side * (front ? chestR * 0.52 : hipR * 0.6),
        front ? jointY : jointY + hipR * 0.1,
        front ? chestZ - chestR * 0.15 : hipZ,
      );
      torso.add(upper);
      const thighR = front ? legR : legR * 1.45;
      const u = fur(new THREE.CapsuleGeometry(thighR * fluff, upperLen, 4, 12), 'leg', upper);
      u.position.set(0, -upperLen * 0.5, 0);
      if (!front) u.scale.set(1, 1, 1.25);
      const lower = new THREE.Group();
      lower.position.set(0, -upperLen, 0);
      upper.add(lower);
      const l = fur(new THREE.CapsuleGeometry(legR * 0.85, lowerLen, 4, 10), 'leg', lower);
      l.position.set(0, -lowerLen * 0.5, 0);
      const paw = fur(new THREE.SphereGeometry(legR * 1.4, 12, 8), 'paw', lower);
      paw.position.set(0, -lowerLen - legR * 0.15, legR * 0.45);
      paw.scale.set(1, 0.6, 1.35);
      if (long) {
        const feather = fur(new THREE.SphereGeometry(thighR * 1.1, 10, 8), 'leg', upper);
        feather.position.set(0, -upperLen * 0.55, -thighR * 0.9);
        feather.scale.set(0.7, 1.6, 0.8);
      }
      // Hind legs angle forward to the stifle, then back to the hock, like a real dog's.
      const restUpper = front ? 0.05 : -0.3;
      const restLower = front ? -0.08 : 0.62;
      upper.rotation.x = restUpper;
      lower.rotation.x = restLower;
      legs.push({ upper, lower, front, side, restUpper, restLower });
    }
  }

  // Hind legs are bent at rest; lift the hips so the paws meet the ground.
  root.updateMatrixWorld(true);
  const dims: DogDims = {
    height: H,
    jointY,
    bodyLen,
    chestR,
    hipR,
    torsoY,
    chestZ,
    hipZ,
    skull: sk,
    stride: jointY * 1.15,
    earErect: body.earErect,
  };
  paintMasks(painted, root, dims);

  return {
    root,
    body: bodyPivot,
    neck,
    head,
    ears,
    tail,
    legs,
    mouth,
    dims,
    material,
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}

/** Ear tilt from upright (0) to hanging beside the head (about 2.7 rad). */
function earRestAngle(erect: number): number {
  return erect > 0.6 ? 0.25 - (erect - 0.6) * 0.4 : 2.75 - erect * 2.2;
}

const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Writes the coat attributes (rest position and region masks) for every fur
 * vertex. Masks depend on where a point sits on the dog, so patterns follow
 * anatomy: tan on the muzzle and legs, white spreading from chest and feet.
 */
function paintMasks(painted: Painted[], root: THREE.Group, d: DogDims): void {
  const inverseRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const toRest = new THREE.Matrix4();
  const v = new THREE.Vector3();
  const headCenter = new THREE.Vector3();
  const out = [0, 0, 0, 0];

  // Head centre in rest space, for face markings.
  const skullMesh = painted.find((p) => p.part === 'skull')?.mesh;
  skullMesh?.getWorldPosition(headCenter);
  headCenter.applyMatrix4(inverseRoot);

  for (const { mesh, part } of painted) {
    const geometry = mesh.geometry;
    const position = geometry.getAttribute('position') as THREE.BufferAttribute;
    const rest = new Float32Array(position.count * 3);
    const mask = new Float32Array(position.count * 4);
    toRest.multiplyMatrices(inverseRoot, mesh.matrixWorld);

    for (let i = 0; i < position.count; i++) {
      v.fromBufferAttribute(position, i).applyMatrix4(toRest);
      rest[i * 3] = v.x;
      rest[i * 3 + 1] = v.y;
      rest[i * 3 + 2] = v.z;

      coatMask(v, part, d, headCenter, out);
      mask.set(out, i * 4);
    }
    geometry.setAttribute('aRest', new THREE.BufferAttribute(rest, 3));
    geometry.setAttribute('aMask', new THREE.BufferAttribute(mask, 4));
  }
}

/** Body measurements the coat masks need. */
export interface MaskDims {
  jointY: number;
  torsoY: number;
  chestR: number;
  chestZ: number;
  skull: number;
}

type V3 = { x: number; y: number; z: number };

/**
 * Coat region masks for one point on the dog, written to `out` as
 * [tan points, white-spotting prior, dorsal, face]. Shared by the code-built
 * dog and the Blender dog so markings follow the same anatomy on both.
 */
export function coatMask(v: V3, part: Part, d: MaskDims, headCenter: V3, out: number[]): void {
  const sk = d.skull;
  const ax = Math.abs(v.x);
  const legLow = smooth(d.jointY * 0.6, d.jointY * 0.3, v.y);
  const belly = smooth(d.torsoY - d.chestR * 0.45, d.torsoY - d.chestR * 0.9, v.y);
  const chestFront = smooth(d.chestZ + d.chestR * 0.2, d.chestZ + d.chestR * 0.8, v.z);
  const torsoDorsal = smooth(d.torsoY - d.chestR * 0.85, d.torsoY + d.chestR * 0.85, v.y);
  const hy = v.y - headCenter.y;
  const hz = v.z - headCenter.z;

  let tan = 0;
  let white = 0.35;
  let dorsal = 0.5;
  let face = 0;

  switch (part) {
    case 'torso':
    case 'chest':
    case 'hip':
    case 'ruff':
      dorsal = torsoDorsal;
      tan = Math.max(
        belly * 0.85,
        chestFront *
          smooth(d.torsoY, d.torsoY - d.chestR * 0.5, v.y) *
          smooth(d.chestR * 0.12, d.chestR * 0.3, ax),
      );
      white = Math.max(
        0.32,
        chestFront * (1 - ax / (d.chestR * 0.75)) * 1.05,
        belly * (0.85 - ax / (d.chestR * 1.4)),
      );
      if (part === 'hip') white = Math.min(white, 0.2 + belly * 0.5);
      break;
    case 'neck':
      dorsal = torsoDorsal * 0.9 + 0.1;
      white = 0.55 + (v.z > d.chestZ + d.chestR * 0.3 ? 0.25 : 0) - torsoDorsal * 0.2;
      tan = smooth(d.torsoY + d.chestR * 0.2, d.torsoY - d.chestR * 0.1, v.y) * 0.6;
      break;
    case 'skull': {
      dorsal = smooth(-sk * 0.6, sk * 0.9, hy);
      const brow = Math.min(
        Math.hypot(v.x - sk * 0.32, hy - sk * 0.62, hz - sk * 0.62),
        Math.hypot(v.x + sk * 0.32, hy - sk * 0.62, hz - sk * 0.62),
      );
      const cheek = smooth(sk * 0.15, sk * 0.6, hz) * smooth(sk * 0.1, -sk * 0.3, hy);
      tan = Math.max(smooth(sk * 0.2, sk * 0.1, brow), cheek);
      const blaze = smooth(sk * 0.22, sk * 0.06, ax) * smooth(-sk * 0.2, sk * 0.5, hz);
      white = Math.max(0.05, blaze * 0.95, cheek * 0.25);
      face = cheek * 0.8 + smooth(sk * 0.5, sk * 0.9, hz) * 0.4;
      break;
    }
    case 'muzzle':
      dorsal = smooth(-sk * 0.5, sk * 0.25, hy) * 0.7;
      tan = smooth(sk * 0.05, -sk * 0.2, hy) * 0.9 + smooth(sk * 0.15, sk * 0.3, ax) * 0.4;
      white = 0.55 + smooth(sk * 0.6, sk * 1.4, hz) * 0.35 - dorsal * 0.2;
      face = 1;
      break;
    case 'ear':
      dorsal = 1;
      white = 0;
      break;
    case 'leg':
      dorsal = 0.08;
      tan = legLow;
      white = 0.4 + legLow * 0.6;
      break;
    case 'paw':
      dorsal = 0;
      tan = 1;
      white = 1;
      break;
    case 'tail':
      dorsal = 0.85;
      white = 0.15;
      break;
    case 'tailTip':
      dorsal = 0.85;
      white = 0.95;
      break;
  }
  out[0] = tan;
  out[1] = white;
  out[2] = dorsal;
  out[3] = face;
}
